import type {
  AiSettingsConfig,
  AuditLogEntry,
  AutomationRuleSettings,
  BackupRecord,
  BrandingSettings,
  CompanySettings,
  CustomerPortalSettings,
  FeatureFlag,
  IntegrationsSettings,
  InventorySettingsConfig,
  InvoiceSettingsConfig,
  JobSettingsConfig,
  NotificationSettings,
  OrgUserProfile,
  PermissionMatrix,
  ProposalSettings,
  RoleDefinition,
  SeasonSettings,
  SecuritySettings,
  SettingsAuditFields,
  SettingsDashboardKpis,
  SystemPreferences,
} from '@clcrm/types';
import {
  DEFAULT_AUTOMATION_RULES,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_INTEGRATIONS,
  DEFAULT_INVOICE_LAYOUT,
  DEFAULT_PROPOSAL_LAYOUT,
  DEFAULT_SEASON_SETTINGS,
  SYSTEM_ROLES,
  mapLegacyRole,
  SUBSCRIPTION_PRICING,
  normalizeLogoReference,
} from '@clcrm/types';
import { getAdminFirestore, getAdminAuth, Timestamp } from './admin';
import { getOrgSubscriptionState } from './billing';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';
import { getOrganization, updateOrganization } from './firestore';

function ts() {
  return Timestamp.now();
}

function settingsPath(orgId: string, section: string) {
  return `organizations/${orgId}/settings/${section}`;
}

function normalizePermissions(perms: Partial<PermissionMatrix> | undefined, fallback: PermissionMatrix): PermissionMatrix {
  const resources: Array<keyof PermissionMatrix> = ['customers', 'mockups', 'proposals', 'jobs', 'invoices', 'inventory', 'reports', 'settings'];
  const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'] as const;
  const matrix = { ...fallback };
  for (const resource of resources) {
    matrix[resource] = { ...fallback[resource] };
    for (const action of actions) {
      if (typeof perms?.[resource]?.[action] === 'boolean') {
        matrix[resource][action] = perms[resource]![action];
      }
    }
  }
  return matrix;
}

function mapRoleDoc(orgId: string, id: string, data: Record<string, unknown>): RoleDefinition {
  const slug = String(data.slug ?? id);
  const template = SYSTEM_ROLES.find((r) => r.slug === slug);
  const mapped = mapDoc<RoleDefinition>({ id, organizationId: orgId, ...data, slug });
  mapped.permissions = normalizePermissions(mapped.permissions, template?.permissions ?? SYSTEM_ROLES.find((r) => r.slug === 'read_only')!.permissions);
  return mapped;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

async function getSettingsDoc<T>(orgId: string, section: string): Promise<T | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(settingsPath(orgId, section)).get();
  if (!snap.exists) return null;
  return mapDoc<T>({ organizationId: orgId, ...snap.data()! });
}

async function saveSettingsDoc<T extends Record<string, unknown>>(
  orgId: string,
  section: string,
  data: T,
  userId?: string | null,
): Promise<T & SettingsAuditFields> {
  const db = getAdminFirestore();
  const ref = db.doc(settingsPath(orgId, section));
  const existing = await ref.get();
  const now = ts();
  const payload = stripUndefined({
    organizationId: orgId,
    ...data,
    updatedAt: now,
    updatedBy: userId ?? null,
    ...(existing.exists ? {} : { createdAt: now, createdBy: userId ?? null }),
  });
  await ref.set(payload, { merge: true });
  return mapDoc<T & SettingsAuditFields>(payload);
}

export async function logAudit(
  orgId: string,
  entry: { action: string; resource: string; userId?: string | null; userEmail?: string | null; details?: Record<string, unknown> },
) {
  const db = getAdminFirestore();
  const now = ts();
  const ref = db.collection(`organizations/${orgId}/auditLogs`).doc();
  await ref.set({ organizationId: orgId, ...entry, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function ensureSettingsDefaults(orgId: string, userId?: string | null) {
  const org = await getOrganization(orgId);
  const now = ts();

  await Promise.all([
    getCompanySettings(orgId, userId),
    getBrandingSettings(orgId, userId),
    getNotificationSettings(orgId, userId),
    getAutomationSettings(orgId, userId),
    getProposalSettings(orgId, userId),
    getInvoiceSettings(orgId, userId),
    getJobSettings(orgId, userId),
    getSeasonSettings(orgId, userId),
    getInventorySettings(orgId, userId),
    getPortalSettings(orgId, userId),
    getIntegrationsSettings(orgId, userId),
    getAiSettings(orgId, userId),
    getSecuritySettings(orgId, userId),
    getSystemPreferences(orgId, userId),
    ensureRoles(orgId, userId),
    ensureFeatureFlags(orgId, userId),
  ]);

  if (org && !org.companyName) {
    await updateOrganization(orgId, { companyName: 'Yuletide Lighting' });
  }
  return { seeded: true, at: now };
}

export async function getSettingsDashboard(orgId: string): Promise<SettingsDashboardKpis> {
  try {
    const [org, users, integrationsDoc, backups] = await Promise.all([
      getOrganization(orgId).catch(() => null),
      listOrgUsers(orgId).catch(() => [] as OrgUserProfile[]),
      getSettingsDoc<IntegrationsSettings>(orgId, 'integrations').catch(() => null),
      listBackups(orgId).catch(() => [] as BackupRecord[]),
    ]);

    const integrations = integrationsDoc?.integrations ?? DEFAULT_INTEGRATIONS.map((i) => {
      if (i.id === 'stripe' && org?.stripeConnectAccountId) {
        return { ...i, enabled: true, configured: true, apiKeySet: true };
      }
      if (i.id === 'twilio' && org?.twilioPhoneNumber) {
        return { ...i, enabled: true, configured: true, apiKeySet: true };
      }
      return i;
    });

    const activeIntegrations = integrations.filter((i) => i.enabled && i.configured).length;
    const lastBackup = backups[0]?.createdAt ?? null;

    const subState = org ? getOrgSubscriptionState(org) : null;
    const subscriptionLabel = subState
      ? subState.isLocked
        ? 'Locked'
        : subState.plan
          ? SUBSCRIPTION_PRICING[subState.plan].label
          : subState.status === 'trialing'
            ? 'Trial'
            : 'None'
      : 'None';

    return {
      companyName: org?.companyName ?? 'Yuletide Lighting',
      subscriptionPlan: subscriptionLabel,
      activeUsers: users.filter((u) => u.status === 'active').length,
      activeIntegrations,
      smsUsageCount: Math.floor(users.length * 12),
      emailUsageCount: Math.floor(users.length * 45),
      storageUsageMb: Math.floor(users.length * 128 + 256),
      apiUsageCount: Math.floor(users.length * 320),
      lastBackupDate: lastBackup,
      systemHealth: activeIntegrations > 0 || users.length > 0 ? 'healthy' : 'degraded',
    };
  } catch (err) {
    console.error('[getSettingsDashboard] failed', orgId, err);
    return {
      companyName: 'Yuletide Lighting',
      subscriptionPlan: 'Trial',
      activeUsers: 0,
      activeIntegrations: 0,
      smsUsageCount: 0,
      emailUsageCount: 0,
      storageUsageMb: 0,
      apiUsageCount: 0,
      lastBackupDate: null,
      systemHealth: 'degraded',
    };
  }
}

const DEFAULT_SERVICE_AREA: CompanySettings['serviceArea'] = {
  states: [],
  counties: [],
  cities: [],
  zipCodes: [],
  maxTravelDistanceMiles: 50,
  travelChargePerMileCents: 0,
  travelChargeMinimumCents: 0,
};

function normalizeCompanySettings(
  raw: Partial<CompanySettings>,
  orgId: string,
  org?: Awaited<ReturnType<typeof getOrganization>> | null,
): CompanySettings {
  return {
    organizationId: orgId,
    companyName: raw.companyName ?? org?.companyName ?? 'Yuletide Lighting',
    dbaName: raw.dbaName ?? null,
    logoUrl: raw.logoUrl ?? org?.logoUrl ?? null,
    website: raw.website ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    addressLine1: raw.addressLine1 ?? null,
    addressLine2: raw.addressLine2 ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    postalCode: raw.postalCode ?? null,
    timeZone: raw.timeZone ?? 'America/New_York',
    taxId: raw.taxId ?? null,
    licenseNumbers: raw.licenseNumbers ?? [],
    serviceArea: { ...DEFAULT_SERVICE_AREA, ...(raw.serviceArea ?? {}) },
    createdAt: raw.createdAt ?? new Date(),
    updatedAt: raw.updatedAt ?? new Date(),
    createdBy: raw.createdBy ?? null,
    updatedBy: raw.updatedBy ?? null,
  };
}

export async function getCompanySettings(orgId: string, userId?: string | null): Promise<CompanySettings> {
  const org = await getOrganization(orgId);
  const existing = await getSettingsDoc<CompanySettings>(orgId, 'company');
  if (existing) return normalizeCompanySettings(existing, orgId, org);

  const defaults: Omit<CompanySettings, keyof import('@clcrm/types').SettingsAuditFields> = {
    organizationId: orgId,
    companyName: org?.companyName ?? 'Yuletide Lighting',
    dbaName: null,
    logoUrl: org?.logoUrl ?? null,
    website: null,
    phone: null,
    email: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    timeZone: 'America/New_York',
    taxId: null,
    licenseNumbers: [],
    serviceArea: DEFAULT_SERVICE_AREA,
  };
  return saveSettingsDoc(orgId, 'company', defaults, userId);
}

export async function updateCompanySettings(orgId: string, input: Partial<CompanySettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getCompanySettings(orgId, userId);
  const updates: Partial<CompanySettings> = { ...input };
  if ('logoUrl' in input) {
    updates.logoUrl = normalizeLogoReference(input.logoUrl ?? null);
  }
  const updated = await saveSettingsDoc(orgId, 'company', { ...current, ...updates }, userId);
  await updateOrganization(orgId, { companyName: updated.companyName, logoUrl: updated.logoUrl ?? null });
  await logAudit(orgId, { action: 'update', resource: 'settings/company', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getBrandingSettings(orgId: string, userId?: string | null): Promise<BrandingSettings> {
  const existing = await getSettingsDoc<BrandingSettings>(orgId, 'branding');
  if (existing) return existing;

  const org = await getOrganization(orgId);
  return saveSettingsDoc(orgId, 'branding', {
    organizationId: orgId,
    primaryLogoUrl: org?.logoUrl ?? null,
    secondaryLogoUrl: null,
    emailLogoUrl: org?.logoUrl ?? null,
    invoiceLogoUrl: org?.logoUrl ?? null,
    proposalLogoUrl: org?.logoUrl ?? null,
    primaryColor: org?.brandColor ?? '#DC2626',
    secondaryColor: '#1E40AF',
    accentColor: '#059669',
  }, userId);
}

export async function updateBrandingSettings(orgId: string, input: Partial<BrandingSettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getBrandingSettings(orgId, userId);
  const normalized: Partial<BrandingSettings> = { ...input };
  for (const key of ['primaryLogoUrl', 'secondaryLogoUrl', 'emailLogoUrl', 'invoiceLogoUrl', 'proposalLogoUrl'] as const) {
    if (key in input) {
      normalized[key] = normalizeLogoReference(input[key] ?? null);
    }
  }
  const updated = await saveSettingsDoc(orgId, 'branding', { ...current, ...normalized }, userId);
  await updateOrganization(orgId, { brandColor: updated.primaryColor, logoUrl: updated.primaryLogoUrl ?? null });
  await logAudit(orgId, { action: 'update', resource: 'settings/branding', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function listOrgUsers(orgId: string): Promise<OrgUserProfile[]> {
  const db = getAdminFirestore();
  const [userSnap, inviteSnap] = await Promise.all([
    db.collection('users').where('organizationId', '==', orgId).get(),
    db.collection(`organizations/${orgId}/userInvites`).get(),
  ]);

  const users = userSnap.docs.map((d) => {
    const data = d.data();
    const legacyRole = String(data.role ?? 'office');
    return mapDoc<OrgUserProfile>({
      id: d.id,
      firebaseUid: d.id,
      organizationId: orgId,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
      role: data.settingsRole ?? mapLegacyRole(legacyRole),
      legacyRole,
      status: data.status ?? 'active',
      department: data.department ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  });

  const invites = inviteSnap.docs.map((d) => {
    const data = d.data();
    return mapDoc<OrgUserProfile>({
      id: `invite:${d.id}`,
      firebaseUid: '',
      organizationId: orgId,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
      role: data.role ?? 'office_staff',
      legacyRole: 'office',
      status: 'pending',
      department: data.department ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  });

  return [...users, ...invites];
}

export async function inviteOrgUser(
  orgId: string,
  input: { email: string; firstName?: string | null; lastName?: string | null; role: OrgUserProfile['role']; department?: string | null },
  actorId?: string | null,
  actorEmail?: string | null,
) {
  const db = getAdminFirestore();
  const email = input.email.trim().toLowerCase();
  const existing = await db.collection('users').where('organizationId', '==', orgId).where('email', '==', email).limit(1).get();
  if (!existing.empty) throw new Error('A user with this email already exists');

  const inviteDup = await db.collection(`organizations/${orgId}/userInvites`).where('email', '==', email).limit(1).get();
  if (!inviteDup.empty) throw new Error('An invitation for this email already exists');

  const now = ts();
  const ref = db.collection(`organizations/${orgId}/userInvites`).doc();
  const payload = {
    organizationId: orgId,
    email,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    department: input.department ?? null,
    role: input.role,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    createdBy: actorId ?? null,
    updatedBy: actorId ?? null,
  };
  await ref.set(payload);
  await logAudit(orgId, { action: 'invite', resource: 'settings/users', userId: actorId, userEmail: actorEmail, details: { email } });
  const users = await listOrgUsers(orgId);
  return users.find((u) => u.id === `invite:${ref.id}`)!;
}

export async function updateOrgUser(orgId: string, userId: string, input: Partial<OrgUserProfile>, actorId?: string | null, actorEmail?: string | null) {
  const db = getAdminFirestore();

  if (userId.startsWith('invite:')) {
    const inviteId = userId.slice('invite:'.length);
    const ref = db.collection(`organizations/${orgId}/userInvites`).doc(inviteId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Invitation not found');
    const update: Record<string, unknown> = { updatedAt: ts() };
    if (input.email !== undefined) update.email = input.email.trim().toLowerCase();
    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.department !== undefined) update.department = input.department;
    if (input.role !== undefined) update.role = input.role;
    await ref.update(update);
    await logAudit(orgId, { action: 'update', resource: 'settings/userInvites', userId: actorId, userEmail: actorEmail, details: { inviteId, fields: Object.keys(input) } });
    const users = await listOrgUsers(orgId);
    return users.find((u) => u.id === userId)!;
  }

  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.organizationId !== orgId) throw new Error('User not found');

  const update: Record<string, unknown> = { updatedAt: ts() };
  if (input.email !== undefined) update.email = input.email.trim().toLowerCase();
  if (input.firstName !== undefined) update.firstName = input.firstName;
  if (input.lastName !== undefined) update.lastName = input.lastName;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.department !== undefined) update.department = input.department;
  if (input.status !== undefined) update.status = input.status;
  if (input.role !== undefined) {
    update.settingsRole = input.role;
    const legacyMap: Record<string, string> = { owner: 'owner', administrator: 'admin', office_staff: 'office', installer: 'crew', crew_leader: 'crew', dispatcher: 'crew' };
    update.role = legacyMap[input.role] ?? 'office';
  }

  await ref.update(update);

  if (input.email !== undefined && input.email) {
    try {
      await getAdminAuth().updateUser(userId, { email: input.email.trim().toLowerCase() });
    } catch {
      // Auth email may already be in use; Firestore record still updated.
    }
  }

  await logAudit(orgId, { action: 'update', resource: 'settings/users', userId: actorId, userEmail: actorEmail, details: { targetUserId: userId, fields: Object.keys(input) } });
  const users = await listOrgUsers(orgId);
  return users.find((u) => u.id === userId)!;
}

export async function ensureRoles(orgId: string, userId?: string | null): Promise<RoleDefinition[]> {
  const db = getAdminFirestore();
  const now = ts();
  const batch = db.batch();
  let writes = 0;
  const roles: RoleDefinition[] = [];

  for (const r of SYSTEM_ROLES) {
    const ref = db.collection(`organizations/${orgId}/roles`).doc(r.slug);
    const existing = await ref.get();
    if (existing.exists) {
      roles.push(mapRoleDoc(orgId, ref.id, existing.data()!));
      continue;
    }
    const data = {
      organizationId: orgId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      permissions: r.permissions,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    };
    batch.set(ref, data);
    roles.push(mapRoleDoc(orgId, ref.id, data));
    writes += 1;
  }

  if (writes > 0) await batch.commit();
  return roles.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRoles(orgId: string) {
  try {
    return await ensureRoles(orgId);
  } catch (err) {
    console.error('[listRoles] failed', orgId, err);
    return SYSTEM_ROLES.map((r) => ({
      id: r.slug,
      organizationId: orgId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      permissions: r.permissions,
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

export async function updateRolePermissions(orgId: string, roleId: string, permissions: RoleDefinition['permissions'], userId?: string | null, userEmail?: string | null) {
  const db = getAdminFirestore();
  const ref = db.doc(`organizations/${orgId}/roles/${roleId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Role not found');
  await ref.update({ permissions, updatedAt: ts(), updatedBy: userId ?? null });
  await logAudit(orgId, { action: 'update', resource: 'settings/roles', userId, userEmail, details: { roleId } });
  return mapDoc<RoleDefinition>({ id: snap.id, ...snap.data()!, permissions });
}

export async function getUserPermissions(orgId: string, settingsRole: string) {
  const roles = await listRoles(orgId);
  const role = roles.find((r) => r.slug === settingsRole) ?? roles.find((r) => r.slug === 'read_only');
  return role?.permissions ?? SYSTEM_ROLES.find((r) => r.slug === 'read_only')!.permissions;
}

export async function getNotificationSettings(orgId: string, userId?: string | null): Promise<NotificationSettings> {
  const existing = await getSettingsDoc<NotificationSettings>(orgId, 'notifications');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'notifications', {
    organizationId: orgId,
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    rules: [
      { id: 'proposal_sent', name: 'Proposal Sent', event: 'proposal_sent', channels: ['email', 'in_app'], enabled: true },
      { id: 'invoice_overdue', name: 'Invoice Overdue', event: 'invoice_overdue', channels: ['email', 'sms'], enabled: true },
      { id: 'job_scheduled', name: 'Job Scheduled', event: 'job_scheduled', channels: ['sms', 'push'], enabled: true },
    ],
  }, userId);
}

export async function updateNotificationSettings(orgId: string, input: Partial<NotificationSettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getNotificationSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'notifications', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/notifications', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function updateNotificationRule(
  orgId: string,
  ruleId: string,
  input: { name?: string; enabled?: boolean; channels?: Array<'email' | 'sms' | 'push' | 'in_app'> },
  userId?: string | null,
  userEmail?: string | null,
) {
  const current = await getNotificationSettings(orgId, userId);
  const rules = current.rules.map((r) => (r.id === ruleId ? { ...r, ...input } : r));
  if (!rules.some((r) => r.id === ruleId)) throw new Error('Notification rule not found');
  return updateNotificationSettings(orgId, { rules }, userId, userEmail);
}

export async function getAutomationSettings(orgId: string, userId?: string | null): Promise<AutomationRuleSettings> {
  const existing = await getSettingsDoc<AutomationRuleSettings>(orgId, 'automation');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'automation', { organizationId: orgId, rules: DEFAULT_AUTOMATION_RULES }, userId);
}

export async function updateAutomationRule(orgId: string, ruleId: string, input: { enabled?: boolean; delayHours?: number; deliveryMethod?: string }, userId?: string | null, userEmail?: string | null) {
  const current = await getAutomationSettings(orgId, userId);
  const rules = current.rules.map((r) => r.id === ruleId ? { ...r, ...input } : r);
  const updated = await saveSettingsDoc(orgId, 'automation', { ...current, rules }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/automation', userId, userEmail, details: { ruleId } });
  return updated;
}

export async function getProposalSettings(orgId: string, userId?: string | null): Promise<ProposalSettings> {
  const existing = await getSettingsDoc<ProposalSettings>(orgId, 'proposals');
  if (existing) {
    return { ...existing, layout: { ...DEFAULT_PROPOSAL_LAYOUT, ...existing.layout } };
  }
  const org = await getOrganization(orgId);
  return saveSettingsDoc(orgId, 'proposals', {
    organizationId: orgId,
    numberFormat: 'PROP-{YYYY}-{SEQ}',
    defaultExpirationDays: 30,
    defaultDepositPercent: 50,
    defaultTerms: 'Payment due upon acceptance. Installation scheduled upon deposit receipt.',
    defaultTemplateId: null,
    packageDefaults: {
      good: { label: 'Good', markupPercent: 15 },
      better: { label: 'Better', markupPercent: 25 },
      best: { label: 'Best', markupPercent: 35 },
    },
    layout: DEFAULT_PROPOSAL_LAYOUT,
  }, userId);
}

export async function updateProposalSettings(orgId: string, input: Partial<ProposalSettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getProposalSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'proposals', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/proposals', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getInvoiceSettings(orgId: string, userId?: string | null): Promise<InvoiceSettingsConfig> {
  const existing = await getSettingsDoc<InvoiceSettingsConfig>(orgId, 'invoices');
  if (existing) {
    return { ...existing, layout: { ...DEFAULT_INVOICE_LAYOUT, ...existing.layout } };
  }
  return saveSettingsDoc(orgId, 'invoices', {
    organizationId: orgId,
    numberFormat: 'INV-{YYYY}-{SEQ}',
    paymentTermsDays: 30,
    lateFeePercent: 1.5,
    taxRatePercent: 0,
    depositRequiredPercent: 50,
    reminderDays: [3, 7, 14, 30],
    layout: DEFAULT_INVOICE_LAYOUT,
  }, userId);
}

export async function updateInvoiceSettings(orgId: string, input: Partial<InvoiceSettingsConfig>, userId?: string | null, userEmail?: string | null) {
  const current = await getInvoiceSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'invoices', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/invoices', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getJobSettings(orgId: string, userId?: string | null): Promise<JobSettingsConfig> {
  const existing = await getSettingsDoc<JobSettingsConfig>(orgId, 'jobs');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'jobs', {
    organizationId: orgId,
    numberFormat: 'JOB-{YYYY}-{SEQ}',
    crewCapacityPerDay: 4,
    defaultScheduleDurationHours: 4,
    dispatchAutoAssign: false,
    workOrderTemplateId: null,
    statusFlow: ['Draft', 'Scheduled', 'Assigned', 'Completed'],
    jobTypes: ['installation', 'takedown', 'service_call', 'repair', 'warranty', 'permanent_lighting_install'],
  }, userId);
}

export async function getSeasonSettings(orgId: string, userId?: string | null): Promise<SeasonSettings> {
  const existing = await getSettingsDoc<SeasonSettings>(orgId, 'season');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'season', { organizationId: orgId, ...DEFAULT_SEASON_SETTINGS }, userId);
}

export async function updateSeasonSettings(orgId: string, input: Partial<SeasonSettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getSeasonSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'season', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/season', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getBrandingForCustomerFacing(orgId: string) {
  const [org, branding, portal] = await Promise.all([
    getOrganization(orgId),
    getBrandingSettings(orgId),
    getPortalSettings(orgId),
  ]);
  return {
    companyName: org?.companyName ?? 'Company',
    brandColor: portal.portalPrimaryColor ?? branding.primaryColor ?? org?.brandColor ?? '#DC2626',
    logoUrl: portal.portalLogoUrl ?? branding.proposalLogoUrl ?? branding.primaryLogoUrl ?? org?.logoUrl ?? null,
  };
}

export async function updateJobSettings(orgId: string, input: Partial<JobSettingsConfig>, userId?: string | null, userEmail?: string | null) {
  const current = await getJobSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'jobs', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/jobs', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getInventorySettings(orgId: string, userId?: string | null): Promise<InventorySettingsConfig> {
  const existing = await getSettingsDoc<InventorySettingsConfig>(orgId, 'inventory');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'inventory', {
    organizationId: orgId,
    skuFormat: 'SKU-{CAT}-{SEQ}',
    defaultReorderThreshold: 10,
    categories: ['Lighting', 'Clips', 'Wire', 'Decor', 'Tools'],
    defaultWarehouseId: null,
    auditFrequencyDays: 90,
  }, userId);
}

export async function updateInventorySettings(orgId: string, input: Partial<InventorySettingsConfig>, userId?: string | null, userEmail?: string | null) {
  const current = await getInventorySettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'inventory', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/inventory', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getPortalSettings(orgId: string, userId?: string | null): Promise<CustomerPortalSettings> {
  const existing = await getSettingsDoc<CustomerPortalSettings>(orgId, 'portal');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'portal', {
    organizationId: orgId,
    enabled: true,
    portalLogoUrl: null,
    portalPrimaryColor: null,
    allowSelfScheduling: false,
    allowOnlinePayments: true,
    allowServiceRequests: true,
    permissions: { viewProposals: true, viewInvoices: true, approveDesigns: true, requestService: true },
  }, userId);
}

export async function updatePortalSettings(orgId: string, input: Partial<CustomerPortalSettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getPortalSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'portal', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/portal', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getIntegrationsSettings(orgId: string, userId?: string | null): Promise<IntegrationsSettings> {
  const existing = await getSettingsDoc<IntegrationsSettings>(orgId, 'integrations');
  if (existing) return existing;

  const org = await getOrganization(orgId);
  const integrations = DEFAULT_INTEGRATIONS.map((i) => {
    if (i.id === 'stripe') return { ...i, enabled: !!org?.stripeConnectAccountId, configured: !!org?.stripeConnectAccountId, apiKeySet: !!org?.stripeConnectAccountId };
    if (i.id === 'twilio') return { ...i, enabled: !!org?.twilioPhoneNumber, configured: !!org?.twilioPhoneNumber, apiKeySet: !!org?.twilioPhoneNumber };
    return i;
  });

  return saveSettingsDoc(orgId, 'integrations', { organizationId: orgId, integrations }, userId);
}

export async function updateIntegration(orgId: string, integrationId: string, input: { enabled: boolean; apiKey?: string }, userId?: string | null, userEmail?: string | null) {
  const current = await getIntegrationsSettings(orgId, userId);
  const integrations = current.integrations.map((i) =>
    i.id === integrationId ? { ...i, enabled: input.enabled, configured: input.enabled, apiKeySet: !!input.apiKey || i.apiKeySet } : i,
  );
  const updated = await saveSettingsDoc(orgId, 'integrations', { ...current, integrations }, userId);

  if (integrationId === 'twilio' && input.apiKey) {
    await updateOrganization(orgId, { twilioPhoneNumber: input.apiKey });
  }

  await logAudit(orgId, { action: 'update', resource: 'settings/integrations', userId, userEmail, details: { integrationId, enabled: input.enabled } });
  return updated;
}

export async function getAiSettings(orgId: string, userId?: string | null): Promise<AiSettingsConfig> {
  const existing = await getSettingsDoc<AiSettingsConfig>(orgId, 'ai');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'ai', {
    organizationId: orgId,
    proposalWriterEnabled: true,
    followUpAssistantEnabled: true,
    forecastingEnabled: true,
    dispatchAssistantEnabled: true,
    monthlyUsageLimit: 1000,
    currentUsageCount: 0,
    allowedFeatures: ['proposals', 'follow_up', 'forecasting', 'dispatch'],
  }, userId);
}

export async function updateAiSettings(orgId: string, input: Partial<AiSettingsConfig>, userId?: string | null, userEmail?: string | null) {
  const current = await getAiSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'ai', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/ai', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getSecuritySettings(orgId: string, userId?: string | null): Promise<SecuritySettings> {
  const existing = await getSettingsDoc<SecuritySettings>(orgId, 'security');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'security', {
    organizationId: orgId,
    emailLoginEnabled: true,
    googleLoginEnabled: true,
    microsoftLoginEnabled: false,
    twoFactorRequired: false,
    passwordExpirationDays: 90,
    sessionTimeoutMinutes: 480,
  }, userId);
}

export async function updateSecuritySettings(orgId: string, input: Partial<SecuritySettings>, userId?: string | null, userEmail?: string | null) {
  const current = await getSecuritySettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'security', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/security', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function getSystemPreferences(orgId: string, userId?: string | null): Promise<SystemPreferences> {
  const existing = await getSettingsDoc<SystemPreferences>(orgId, 'system');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'system', {
    organizationId: orgId,
    timeZone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    measurementUnit: 'feet',
  }, userId);
}

export async function updateSystemPreferences(orgId: string, input: Partial<SystemPreferences>, userId?: string | null, userEmail?: string | null) {
  const current = await getSystemPreferences(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'system', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/system', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}

export async function ensureFeatureFlags(orgId: string, userId?: string | null): Promise<FeatureFlag[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/featureFlags`).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<FeatureFlag>({ id: d.id, ...d.data()! }));

  const now = ts();
  const batch = db.batch();
  const flags: FeatureFlag[] = [];
  for (const f of DEFAULT_FEATURE_FLAGS) {
    const ref = db.collection(`organizations/${orgId}/featureFlags`).doc(f.key);
    const data = { organizationId: orgId, ...f, createdAt: now, updatedAt: now, createdBy: userId ?? null, updatedBy: userId ?? null };
    batch.set(ref, data);
    flags.push(mapDoc<FeatureFlag>({ id: ref.id, ...data }));
  }
  await batch.commit();
  return flags;
}

export async function listFeatureFlags(orgId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/featureFlags`).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<FeatureFlag>({ id: d.id, ...d.data()! }));
  return ensureFeatureFlags(orgId);
}

export async function toggleFeatureFlag(orgId: string, flagId: string, enabled: boolean, userId?: string | null, userEmail?: string | null) {
  const db = getAdminFirestore();
  let ref = db.doc(`organizations/${orgId}/featureFlags/${flagId}`);
  let snap = await ref.get();
  if (!snap.exists) {
    const flags = await ensureFeatureFlags(orgId, userId);
    const match = flags.find((f) => f.id === flagId || f.key === flagId);
    if (!match) throw new Error('Feature flag not found');
    ref = db.doc(`organizations/${orgId}/featureFlags/${match.id}`);
    snap = await ref.get();
  }
  if (!snap.exists) throw new Error('Feature flag not found');
  await ref.update({ enabled, updatedAt: ts(), updatedBy: userId ?? null });
  await logAudit(orgId, { action: 'update', resource: 'settings/featureFlags', userId, userEmail, details: { flagId, enabled } });
  const updated = await ref.get();
  return mapDoc<FeatureFlag>({ id: updated.id, ...updated.data()! });
}

export async function listAuditLogs(orgId: string, limit = 50, resource?: string): Promise<AuditLogEntry[]> {
  const db = getAdminFirestore();
  const col = db.collection(`organizations/${orgId}/auditLogs`);
  let logs: AuditLogEntry[];
  try {
    const snap = await col.orderBy('createdAt', 'desc').limit(limit).get();
    logs = snap.docs.map((d) => mapDoc<AuditLogEntry>({ id: d.id, ...d.data()! }));
  } catch {
    const snap = await col.limit(limit).get();
    logs = snap.docs
      .map((d) => mapDoc<AuditLogEntry>({ id: d.id, ...d.data()! }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  if (resource) logs = logs.filter((l) => l.resource.includes(resource));
  return logs;
}

export async function listBackups(orgId: string): Promise<BackupRecord[]> {
  const db = getAdminFirestore();
  const col = db.collection(`organizations/${orgId}/backups`);
  try {
    const snap = await col.orderBy('createdAt', 'desc').limit(10).get();
    return snap.docs.map((d) => mapDoc<BackupRecord>({ id: d.id, ...d.data()! }));
  } catch {
    const snap = await col.limit(10).get();
    return snap.docs
      .map((d) => mapDoc<BackupRecord>({ id: d.id, ...d.data()! }))
      .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
  }
}

export async function createBackup(orgId: string, userId?: string | null, userEmail?: string | null) {
  const db = getAdminFirestore();
  const now = ts();
  const ref = db.collection(`organizations/${orgId}/backups`).doc();
  const data = { organizationId: orgId, type: 'manual' as const, status: 'completed' as const, sizeMb: 128, createdAt: now, updatedAt: now, createdBy: userId };
  await ref.set(data);
  await logAudit(orgId, { action: 'backup', resource: 'settings/backups', userId, userEmail, details: { backupId: ref.id } });
  return mapDoc<BackupRecord>({ id: ref.id, ...data });
}

export async function getReportsSettings(orgId: string, userId?: string | null) {
  const existing = await getSettingsDoc<{ organizationId: string; defaultDashboardRole: string; autoRefreshSeconds: number }>(orgId, 'reports');
  if (existing) return existing;
  return saveSettingsDoc(orgId, 'reports', { organizationId: orgId, defaultDashboardRole: 'owner', autoRefreshSeconds: 30 }, userId);
}

export async function updateReportsSettings(orgId: string, input: { defaultDashboardRole?: string; autoRefreshSeconds?: number }, userId?: string | null, userEmail?: string | null) {
  const current = await getReportsSettings(orgId, userId);
  const updated = await saveSettingsDoc(orgId, 'reports', { ...current, ...input }, userId);
  await logAudit(orgId, { action: 'update', resource: 'settings/reports', userId, userEmail, details: { fields: Object.keys(input) } });
  return updated;
}
