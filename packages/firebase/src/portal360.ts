import { nanoid } from 'nanoid';
import type {
  CustomerPortalSettings,
  PortalAccount,
  PortalCustomerPublic,
  PortalFeatureKey,
  PortalNotification,
  PortalOrgPublic,
  PortalTimelineEvent,
  PortalUser,
} from '@clcrm/types';
import {
  DEFAULT_PORTAL_FEATURES,
  PHASE1_ACTIVE_PORTAL_FEATURES,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefinedDeep } from './firestore-utils';
import { colCreate, colGet, colList, colUpdate, getOrganization, type CustomerRecord } from './firestore';
import { getBrandingForCustomerFacing, getPortalSettings } from './settings360';
import { createServiceIssue360 } from './service-issues';
import { listCalendarEvents } from './schedule360';
import { logCustomerActivity, createCommunication } from './customer360';
import { processPortalRebook, getPortalRebookContext } from './rebooking360';
import { getPlatformSettings } from './creator360';

function portalAccessUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
  return `${base.replace(/\/$/, '')}/portal/${token}`;
}

export function buildPortalAccessUrl(token: string) {
  return portalAccessUrl(token);
}

function toPublicCustomer(customer: CustomerRecord): PortalCustomerPublic {
  return {
    id: customer.id,
    firstName: customer.firstName ?? null,
    lastName: customer.lastName ?? null,
    businessName: customer.businessName ?? null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
  };
}

async function colListByCustomerId<T extends { id: string }>(
  orgId: string,
  collection: string,
  customerId: string,
): Promise<T[]> {
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(`organizations/${orgId}/${collection}`)
      .where('customerId', '==', customerId)
      .get();
    return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data() }) as T);
  } catch {
    // Fallback if composite index missing — filter in memory from limited list
    const all = await colList<T & { customerId?: string }>(orgId, collection);
    return all.filter((row) => row.customerId === customerId);
  }
}

export async function resolvePortalFeatures(orgId: string): Promise<{
  moduleEnabled: boolean;
  available: PortalFeatureKey[];
  enabled: PortalFeatureKey[];
  settings: CustomerPortalSettings;
}> {
  const [settings, platform, org] = await Promise.all([
    getPortalSettings(orgId),
    getPlatformSettings(),
    getOrganization(orgId),
  ]);
  const enabledModules = (org as { enabledModules?: string[] } | null)?.enabledModules ?? [];
  const platformModules = platform.availableModules?.length
    ? platform.availableModules
    : [];
  const portalOffered =
    platformModules.length === 0 || platformModules.includes('customer_portal');
  // Org-level deny only when modules are explicitly set AND portal key is present in platform but omitted from org.
  // Soft migration: orgs whose module lists predate `customer_portal` keep access when settings.enabled.
  const orgHasLegacyModuleList =
    enabledModules.length > 0 && !enabledModules.includes('customer_portal');
  const orgAllowsPortal =
    enabledModules.length === 0
    || enabledModules.includes('customer_portal')
    || orgHasLegacyModuleList;

  const moduleEnabled = Boolean(settings.enabled && portalOffered && orgAllowsPortal);
  const available = (platform.availablePortalFeatures?.length
    ? platform.availablePortalFeatures
    : DEFAULT_PORTAL_FEATURES) as PortalFeatureKey[];

  const stored = (settings.enabledFeatures?.length
    ? settings.enabledFeatures
    : PHASE1_ACTIVE_PORTAL_FEATURES) as PortalFeatureKey[];

  // Soft-enable newly shipped portal surfaces for tenants that saved an older feature list.
  const newlyShipped: PortalFeatureKey[] = [
    'agreements', 'e_sign', 'documents', 'storage', 'messaging', 'reviews', 'referrals',
    'consultations', 'takedowns',
  ];
  const tenantRequested = Array.from(new Set([
    ...stored,
    ...newlyShipped.filter((f) => available.includes(f)),
  ])) as PortalFeatureKey[];

  const enabled = moduleEnabled
    ? tenantRequested.filter((f) => available.includes(f))
    : [];

  return { moduleEnabled, available, enabled, settings };
}

export function portalHasFeature(enabled: PortalFeatureKey[], feature: PortalFeatureKey) {
  return enabled.includes(feature);
}

export type PortalAccessContext = {
  organizationId: string;
  customer: CustomerRecord;
  customerPublic: PortalCustomerPublic;
  organization: PortalOrgPublic | null;
  settings: CustomerPortalSettings;
  enabledFeatures: PortalFeatureKey[];
  account: PortalAccount | null;
  primaryUser: PortalUser | null;
  accessToken: string;
};

async function findAccountByAccessToken(token: string): Promise<{ orgId: string; account: PortalAccount } | null> {
  const db = getAdminFirestore();
  try {
    const snap = await db.collectionGroup('portalAccounts').where('accessToken', '==', token).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0]!;
      const account = mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as PortalAccount;
      const orgId = String(account.organizationId ?? doc.ref.parent.parent?.id ?? '');
      if (orgId) return { orgId, account };
    }
  } catch {
    // Index may still be building — fall through to customer token
  }
  return null;
}

export async function requirePortalAccess(token: string): Promise<PortalAccessContext | null> {
  const db = getAdminFirestore();
  let orgId = '';
  let customer: CustomerRecord | null = null;
  let account: PortalAccount | null = null;
  let accessToken = token;

  const byAccount = await findAccountByAccessToken(token);
  if (byAccount) {
    orgId = byAccount.orgId;
    account = byAccount.account;
    if (!account.portalEnabled || account.status === 'locked' || account.status === 'suspended' || account.status === 'archived') {
      return null;
    }
    customer = await colGet<CustomerRecord>(orgId, 'customers', account.customerId);
    accessToken = account.accessToken;
  } else {
    const snap = await db.collectionGroup('customers').where('portalToken', '==', token).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    customer = mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as CustomerRecord;
    orgId = String(customer.organizationId ?? doc.ref.parent.parent?.id ?? '');
    if (!orgId || !customer.portalEnabled) return null;
    account = await getPortalAccountByCustomer(orgId, customer.id);
    if (account && (account.status === 'locked' || account.status === 'suspended' || account.status === 'archived')) {
      return null;
    }
  }

  if (!customer || !orgId) return null;

  const features = await resolvePortalFeatures(orgId);
  if (!features.moduleEnabled || !portalHasFeature(features.enabled, 'dashboard')) {
    return null;
  }

  const [organization, branding, primaryUser] = await Promise.all([
    getOrganization(orgId),
    getBrandingForCustomerFacing(orgId),
    account?.primaryPortalUserId
      ? colGet<PortalUser>(orgId, 'portalUsers', account.primaryPortalUserId)
      : getPrimaryPortalUser(orgId, customer.id),
  ]);

  return {
    organizationId: orgId,
    customer,
    customerPublic: toPublicCustomer(customer),
    organization: organization
      ? {
          id: organization.id,
          companyName: branding.companyName,
          brandColor: branding.brandColor,
          logoUrl: branding.logoUrl,
        }
      : null,
    settings: features.settings,
    enabledFeatures: features.enabled,
    account,
    primaryUser,
    accessToken,
  };
}

/** @deprecated Prefer requirePortalAccess — kept for gradual migration. */
export async function getCustomerByPortalToken(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) return null;
  const organization = await getOrganization(ctx.organizationId);
  const branding = await getBrandingForCustomerFacing(ctx.organizationId);
  return {
    organizationId: ctx.organizationId,
    customer: ctx.customer,
    organization: organization
      ? { ...organization, companyName: branding.companyName, brandColor: branding.brandColor, logoUrl: branding.logoUrl }
      : null,
    settings: ctx.settings,
  };
}

export async function getPortalAccountByCustomer(orgId: string, customerId: string): Promise<PortalAccount | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/portalAccounts`)
    .where('customerId', '==', customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as PortalAccount;
}

async function getPrimaryPortalUser(orgId: string, customerId: string): Promise<PortalUser | null> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/portalUsers`)
    .where('customerId', '==', customerId)
    .where('role', '==', 'account_owner')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as PortalUser;
}

export async function ensurePortalAccount(
  orgId: string,
  customerId: string,
  opts?: { token?: string; status?: PortalAccount['status']; portalEnabled?: boolean },
): Promise<{ account: PortalAccount; user: PortalUser; token: string }> {
  const customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
  if (!customer) throw new Error('Customer not found');

  let existing = await getPortalAccountByCustomer(orgId, customerId);
  const token = opts?.token ?? customer.portalToken ?? nanoid(32);
  const now = new Date();

  if (!existing) {
    const created = await colCreate(orgId, 'portalAccounts', {
      customerId,
      portalEnabled: opts?.portalEnabled ?? customer.portalEnabled ?? false,
      status: opts?.status ?? (customer.portalEnabled ? 'active' : 'not_invited'),
      accessToken: token,
      primaryPortalUserId: null,
      invitedAt: customer.portalInviteSentAt ?? null,
      activatedAt: customer.portalEnabled ? now : null,
      suspendedAt: null,
      lastLoginAt: customer.portalLastLoginAt ?? null,
    });
    existing = created as PortalAccount;
  } else if (opts?.token || opts?.status != null || opts?.portalEnabled != null) {
    await colUpdate(orgId, 'portalAccounts', existing.id, stripUndefinedDeep({
      accessToken: opts?.token ?? existing.accessToken,
      status: opts?.status ?? existing.status,
      portalEnabled: opts?.portalEnabled ?? existing.portalEnabled,
    }));
    existing = (await colGet<PortalAccount>(orgId, 'portalAccounts', existing.id))!;
  }

  // Dual-write token onto customer for legacy links
  if (customer.portalToken !== token) {
    await colUpdate(orgId, 'customers', customerId, { portalToken: token });
  }

  let user = await getPrimaryPortalUser(orgId, customerId);
  if (!user) {
    let contactId: string | null = null;
    let displayName = customer.businessName
      || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
      || 'Account owner';
    let email = customer.email ?? null;
    try {
      const { listContacts360 } = await import('./contacts');
      const { items } = await listContacts360(orgId, { customerId, pageSize: 50 });
      const primary = items.find((c) => c.isPrimary) ?? items[0] ?? null;
      if (primary) {
        contactId = primary.id;
        displayName = `${primary.firstName ?? ''} ${primary.lastName ?? ''}`.trim() || displayName;
        email = primary.email ?? email;
      }
    } catch {
      // Contacts optional during ensure
    }
    const createdUser = await colCreate(orgId, 'portalUsers', {
      customerId,
      portalAccountId: existing.id,
      contactId,
      authUserId: null,
      role: 'account_owner' as const,
      status: 'active' as const,
      propertyIds: [],
      permissions: ['*'],
      displayName,
      email,
      lastLoginAt: null,
    });
    user = (await colGet<PortalUser>(orgId, 'portalUsers', createdUser.id))!;
    await colUpdate(orgId, 'portalAccounts', existing.id, { primaryPortalUserId: user.id });
    existing = { ...existing, primaryPortalUserId: user.id };
  } else if (!user.contactId) {
    try {
      const { listContacts360 } = await import('./contacts');
      const { items } = await listContacts360(orgId, { customerId, pageSize: 50 });
      const primary = items.find((c) => c.isPrimary) ?? items[0] ?? null;
      if (primary) {
        await colUpdate(orgId, 'portalUsers', user.id, stripUndefinedDeep({
          contactId: primary.id,
          email: user.email ?? primary.email ?? null,
          displayName: user.displayName
            || `${primary.firstName ?? ''} ${primary.lastName ?? ''}`.trim()
            || undefined,
        }));
        user = { ...user, contactId: primary.id };
      }
    } catch {
      // Best-effort backfill
    }
  }

  return { account: existing, user, token };
}

export async function ensureCustomerPortalToken(orgId: string, customerId: string): Promise<string> {
  const { token } = await ensurePortalAccount(orgId, customerId);
  return token;
}

export async function enableCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{ token: string; accessUrl: string; account: PortalAccount }> {
  const features = await resolvePortalFeatures(orgId);
  if (!features.moduleEnabled && !features.settings.enabled) {
    throw new Error('Customer Portal is disabled for this organization');
  }
  // Allow enable when settings.enabled even if module list is legacy-empty; block if settings off
  if (!features.settings.enabled) {
    throw new Error('Customer Portal is disabled in organization settings');
  }

  const now = new Date();
  const { account, token } = await ensurePortalAccount(orgId, customerId, {
    portalEnabled: true,
    status: 'active',
  });

  await colUpdate(orgId, 'customers', customerId, {
    portalEnabled: true,
    portalInviteSentAt: now,
    portalToken: token,
  });
  await colUpdate(orgId, 'portalAccounts', account.id, {
    portalEnabled: true,
    status: 'active',
    invitedAt: now,
    activatedAt: now,
    suspendedAt: null,
    accessToken: token,
  });

  await createPortalTimelineEvent(orgId, {
    customerId,
    eventType: 'portal_enabled',
    title: 'Portal access enabled',
    description: 'Your customer portal is ready.',
    customerVisible: true,
    occurredAt: now,
  });

  await logCustomerActivity(orgId, customerId, 'email_sent', 'Customer portal access enabled', userId, 'System');
  const fresh = (await colGet<PortalAccount>(orgId, 'portalAccounts', account.id))!;
  return { token, accessUrl: portalAccessUrl(token), account: fresh };
}

export async function revokeCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<PortalAccount | null> {
  const account = await getPortalAccountByCustomer(orgId, customerId);
  await colUpdate(orgId, 'customers', customerId, { portalEnabled: false });
  if (account) {
    await colUpdate(orgId, 'portalAccounts', account.id, {
      portalEnabled: false,
      status: 'archived',
    });
  }
  await logCustomerActivity(orgId, customerId, 'note_added', 'Customer portal access revoked', userId, 'System');
  return account ? colGet<PortalAccount>(orgId, 'portalAccounts', account.id) : null;
}

export async function suspendCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<PortalAccount | null> {
  const account = await ensurePortalAccount(orgId, customerId);
  const now = new Date();
  await colUpdate(orgId, 'portalAccounts', account.account.id, {
    status: 'suspended',
    portalEnabled: false,
    suspendedAt: now,
  });
  await colUpdate(orgId, 'customers', customerId, { portalEnabled: false });
  await logCustomerActivity(orgId, customerId, 'note_added', 'Customer portal suspended', userId, 'System');
  return colGet<PortalAccount>(orgId, 'portalAccounts', account.account.id);
}

export async function rotatePortalAccessToken(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{ token: string; accessUrl: string; account: PortalAccount }> {
  const token = nanoid(32);
  const { account } = await ensurePortalAccount(orgId, customerId, {
    token,
    portalEnabled: true,
    status: 'active',
  });
  await colUpdate(orgId, 'customers', customerId, { portalToken: token, portalEnabled: true });
  await colUpdate(orgId, 'portalAccounts', account.id, {
    accessToken: token,
    portalEnabled: true,
    status: 'active',
  });
  await logCustomerActivity(orgId, customerId, 'note_added', 'Customer portal access link rotated', userId, 'System');
  const fresh = (await colGet<PortalAccount>(orgId, 'portalAccounts', account.id))!;
  return { token, accessUrl: portalAccessUrl(token), account: fresh };
}

export async function getStaffPortalAccountView(orgId: string, customerId: string) {
  const customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
  if (!customer) return null;
  let account = await getPortalAccountByCustomer(orgId, customerId);
  if (!account && (customer.portalToken || customer.portalEnabled)) {
    const ensured = await ensurePortalAccount(orgId, customerId);
    account = ensured.account;
  }
  const token = account?.accessToken ?? customer.portalToken ?? null;
  return {
    account,
    enabled: account?.portalEnabled ?? customer.portalEnabled ?? false,
    status: account?.status ?? (customer.portalEnabled ? 'active' : 'not_invited'),
    inviteSentAt: account?.invitedAt ?? customer.portalInviteSentAt ?? null,
    lastLoginAt: account?.lastLoginAt ?? customer.portalLastLoginAt ?? null,
    accessUrl: token ? portalAccessUrl(token) : null,
    accessLinkPlaceholder: token ? portalAccessUrl(token) : portalAccessUrl('').replace(/\/$/, '') + '/login',
  };
}

export async function backfillPortalAccountsForOrg(orgId: string): Promise<{ created: number; skipped: number }> {
  const customers = await colList<CustomerRecord>(orgId, 'customers');
  let created = 0;
  let skipped = 0;
  for (const customer of customers) {
    if (!customer.portalToken && !customer.portalEnabled) {
      skipped += 1;
      continue;
    }
    const existing = await getPortalAccountByCustomer(orgId, customer.id);
    if (existing) {
      skipped += 1;
      continue;
    }
    await ensurePortalAccount(orgId, customer.id, {
      token: customer.portalToken ?? undefined,
      portalEnabled: customer.portalEnabled ?? false,
      status: customer.portalEnabled ? 'active' : 'invitation_pending',
    });
    created += 1;
  }
  return { created, skipped };
}

export async function recordPortalLogin(orgId: string, customerId: string, accountId?: string | null) {
  const now = new Date();
  await colUpdate(orgId, 'customers', customerId, { portalLastLoginAt: now });
  if (accountId) {
    await colUpdate(orgId, 'portalAccounts', accountId, { lastLoginAt: now });
  } else {
    const account = await getPortalAccountByCustomer(orgId, customerId);
    if (account) await colUpdate(orgId, 'portalAccounts', account.id, { lastLoginAt: now });
  }
}

export async function createPortalTimelineEvent(
  orgId: string,
  input: {
    customerId: string;
    propertyId?: string | null;
    eventType: string;
    title: string;
    description?: string | null;
    relatedRecordType?: string | null;
    relatedRecordId?: string | null;
    customerVisible?: boolean;
    occurredAt?: Date;
  },
): Promise<PortalTimelineEvent> {
  const created = await colCreate(orgId, 'portalTimelineEvents', {
    customerId: input.customerId,
    propertyId: input.propertyId ?? null,
    eventType: input.eventType,
    title: input.title,
    description: input.description ?? null,
    relatedRecordType: input.relatedRecordType ?? null,
    relatedRecordId: input.relatedRecordId ?? null,
    customerVisible: input.customerVisible ?? true,
    occurredAt: input.occurredAt ?? new Date(),
  });
  return created as PortalTimelineEvent;
}

export async function listPortalTimeline(token: string, limit = 20): Promise<PortalTimelineEvent[]> {
  const ctx = await requirePortalAccess(token);
  if (!ctx) return [];
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(`organizations/${ctx.organizationId}/portalTimelineEvents`)
      .where('customerId', '==', ctx.customer.id)
      .where('customerVisible', '==', true)
      .orderBy('occurredAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data() }) as PortalTimelineEvent);
  } catch {
    const all = await colListByCustomerId<PortalTimelineEvent>(ctx.organizationId, 'portalTimelineEvents', ctx.customer.id);
    return all
      .filter((e) => e.customerVisible)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);
  }
}

export async function listPortalNotifications(token: string, limit = 20): Promise<PortalNotification[]> {
  const ctx = await requirePortalAccess(token);
  if (!ctx?.primaryUser) return [];
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(`organizations/${ctx.organizationId}/portalNotifications`)
      .where('portalUserId', '==', ctx.primaryUser.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data() }) as PortalNotification);
  } catch {
    const all = await colList<PortalNotification>(ctx.organizationId, 'portalNotifications');
    return all
      .filter((n) => n.portalUserId === ctx.primaryUser!.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export async function markPortalNotificationRead(token: string, notificationId: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx?.primaryUser) throw new Error('Invalid portal access');
  const note = await colGet<PortalNotification>(ctx.organizationId, 'portalNotifications', notificationId);
  if (!note || note.portalUserId !== ctx.primaryUser.id) throw new Error('Notification not found');
  await colUpdate(ctx.organizationId, 'portalNotifications', notificationId, { readAt: new Date() });
  return { success: true };
}

export type PortalDashboardPublic = {
  organizationId: string;
  customer: PortalCustomerPublic;
  organization: PortalOrgPublic | null;
  settings: Pick<
    CustomerPortalSettings,
    'portalPrimaryColor' | 'portalLogoUrl' | 'allowOnlinePayments' | 'allowServiceRequests' | 'allowSelfScheduling' | 'permissions'
  >;
  enabledFeatures: PortalFeatureKey[];
  accessToken: string;
  proposals: Array<{
    id: string;
    title: string;
    status: string;
    subtotalCents: number;
    publicToken?: string | null;
    installDate?: Date | null;
    removalDate?: Date | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    subtotalCents: number;
    amountPaidCents: number;
    publicToken?: string | null;
    dueDate?: Date | null;
  }>;
  schedule: Array<{
    id: string;
    title: string;
    appointmentType: string;
    startAt: Date;
    endAt: Date;
    propertyAddress?: string | null;
    dispatchStatus: string;
  }>;
  mockups: Array<{
    id: string;
    name: string;
    imageUrl: string;
    renderedImageUrl?: string | null;
    status?: string;
    approvalToken?: string | null;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    stage: string;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
  }>;
  properties: Array<{ id: string; label: string; addressLine1: string; city: string; state: string }>;
  timeline: PortalTimelineEvent[];
  notifications: PortalNotification[];
  featureDisabledMessage?: string | null;
};

export async function getPortalDashboard(token: string): Promise<PortalDashboardPublic | null> {
  const ctx = await requirePortalAccess(token);
  if (!ctx) return null;

  const { organizationId, customer, settings, enabledFeatures } = ctx;
  await recordPortalLogin(organizationId, customer.id, ctx.account?.id);

  const [
    proposalsRaw,
    invoicesRaw,
    events,
    jobsRaw,
    mockupsRaw,
    propertiesRaw,
    timeline,
    notifications,
  ] = await Promise.all([
    portalHasFeature(enabledFeatures, 'proposals')
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(organizationId, 'proposals', customer.id)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'billing')
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(organizationId, 'invoices', customer.id)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'scheduling')
      ? listCalendarEvents(organizationId)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'install_tracking')
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(organizationId, 'jobs', customer.id)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'mockups')
      ? colListByCustomerId<{
          id: string;
          name: string;
          imageUrl: string;
          renderedImageUrl?: string | null;
          customerId?: string;
          status?: string;
          approvalToken?: string | null;
        }>(organizationId, 'mockups', customer.id)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'properties')
      ? colListByCustomerId<{
          id: string;
          customerId?: string;
          label?: string;
          addressLine1?: string;
          city?: string;
          state?: string;
        }>(organizationId, 'properties', customer.id)
      : Promise.resolve([]),
    listPortalTimeline(token, 10),
    listPortalNotifications(token, 10),
  ]);

  const proposals = proposalsRaw
    .map((p) => ({
      id: String(p.id),
      title: String(p.title ?? 'Proposal'),
      status: String(p.status ?? 'draft'),
      subtotalCents: Number(p.subtotalCents ?? 0),
      publicToken: (p.publicToken as string) ?? null,
      installDate: p.installDate instanceof Date ? p.installDate : p.installDate ? new Date(String(p.installDate)) : null,
      removalDate: p.removalDate instanceof Date ? p.removalDate : p.removalDate ? new Date(String(p.removalDate)) : null,
    }))
    .sort((a, b) => b.subtotalCents - a.subtotalCents);

  const invoices = invoicesRaw.map((i) => ({
    id: String(i.id),
    invoiceNumber: String(i.invoiceNumber ?? i.id),
    status: String(i.status ?? 'draft'),
    subtotalCents: Number(i.subtotalCents ?? 0),
    amountPaidCents: Number(i.amountPaidCents ?? 0),
    publicToken: (i.publicToken as string) ?? null,
    dueDate: i.dueDate instanceof Date ? i.dueDate : i.dueDate ? new Date(String(i.dueDate)) : null,
  }));

  const schedule = (events as Array<{
    id: string;
    customerId?: string;
    title: string;
    appointmentType: string;
    startAt: Date;
    endAt: Date;
    propertyAddress?: string | null;
    dispatchStatus: string;
  }>)
    .filter((e) => e.customerId === customer.id && e.startAt >= new Date(Date.now() - 86400000))
    .map((e) => ({
      id: e.id,
      title: e.title,
      appointmentType: e.appointmentType,
      startAt: e.startAt,
      endAt: e.endAt,
      propertyAddress: e.propertyAddress,
      dispatchStatus: e.dispatchStatus,
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const jobs = jobsRaw.map((j) => ({
    id: String(j.id),
    title: String(j.title ?? 'Job'),
    stage: String(j.stage ?? 'draft_proposal'),
    scheduledStart: j.scheduledStart instanceof Date ? j.scheduledStart : j.scheduledStart ? new Date(String(j.scheduledStart)) : null,
    scheduledEnd: j.scheduledEnd instanceof Date ? j.scheduledEnd : j.scheduledEnd ? new Date(String(j.scheduledEnd)) : null,
  }));

  const mockups = mockupsRaw.map((m) => ({
    id: m.id,
    name: m.name,
    imageUrl: m.imageUrl,
    renderedImageUrl: m.renderedImageUrl ?? null,
    status: m.status,
    approvalToken: m.approvalToken ?? null,
  }));

  const canProposals = portalHasFeature(enabledFeatures, 'proposals') && settings.permissions.viewProposals;
  const canInvoices = portalHasFeature(enabledFeatures, 'billing') && settings.permissions.viewInvoices;
  const canMockups = portalHasFeature(enabledFeatures, 'mockups');
  const canPay = portalHasFeature(enabledFeatures, 'online_payments') && settings.allowOnlinePayments;

  return {
    organizationId,
    customer: ctx.customerPublic,
    organization: ctx.organization,
    settings: {
      portalPrimaryColor: settings.portalPrimaryColor,
      portalLogoUrl: settings.portalLogoUrl,
      allowOnlinePayments: canPay,
      allowServiceRequests:
        portalHasFeature(enabledFeatures, 'service_requests') && settings.allowServiceRequests,
      allowSelfScheduling:
        portalHasFeature(enabledFeatures, 'scheduling') && settings.allowSelfScheduling,
      permissions: settings.permissions,
    },
    enabledFeatures,
    accessToken: ctx.accessToken,
    proposals: canProposals ? proposals : [],
    invoices: canInvoices ? invoices : [],
    schedule: portalHasFeature(enabledFeatures, 'scheduling') ? schedule : [],
    mockups: canMockups ? mockups : [],
    jobs: portalHasFeature(enabledFeatures, 'install_tracking') ? jobs : [],
    properties: portalHasFeature(enabledFeatures, 'properties')
      ? propertiesRaw.map((p) => ({
          id: p.id,
          label: String(p.label ?? p.addressLine1 ?? 'Property'),
          addressLine1: String(p.addressLine1 ?? ''),
          city: String(p.city ?? ''),
          state: String(p.state ?? ''),
        }))
      : [],
    timeline,
    notifications,
    featureDisabledMessage: null,
  };
}

export async function submitPortalServiceRequest(
  token: string,
  input: {
    title: string;
    description?: string;
    category?: string;
    propertyId?: string;
    priority?: import('@clcrm/types').ServiceIssuePriority;
    accessInstructions?: string;
    locationNote?: string;
    photoUrls?: string[];
  },
) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (
    !portalHasFeature(ctx.enabledFeatures, 'service_requests') ||
    !ctx.settings.allowServiceRequests ||
    !ctx.settings.permissions.requestService
  ) {
    throw new Error('Service requests are not enabled');
  }

  const customerName = ctx.customer.businessName
    || `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim()
    || 'Customer';

  let propertyLabel: string | undefined;
  if (input.propertyId) {
    const prop = await colGet<{ label?: string; addressLine1?: string; customerId?: string }>(
      ctx.organizationId,
      'properties',
      input.propertyId,
    );
    if (!prop || prop.customerId !== ctx.customer.id) {
      throw new Error('Invalid property for this account');
    }
    propertyLabel = prop.label ?? prop.addressLine1 ?? undefined;
  }

  const details = [
    input.description ?? '',
    input.locationNote ? `Location: ${input.locationNote}` : '',
    input.accessInstructions ? `Access: ${input.accessInstructions}` : '',
  ].filter(Boolean).join('\n\n');

  const issue = await createServiceIssue360(ctx.organizationId, {
    customerId: ctx.customer.id,
    customerName,
    propertyId: input.propertyId ?? '',
    propertyLabel: propertyLabel ?? '',
    title: input.title,
    description: details,
    category: (input.category as import('@clcrm/types').ServiceIssueCategory) ?? 'customer_request',
    priority: input.priority ?? 'normal',
    status: 'reported',
    warranty: false,
    photoUrls: (input.photoUrls ?? []).slice(0, 6),
    source: 'portal',
  });

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: input.title,
    body: details || input.title,
    employeeId: null,
    employeeName: null,
    occurredAt: new Date(),
    followUpRequired: true,
    followUpDate: null,
    relatedPropertyId: input.propertyId ?? null,
    relatedJobId: null,
    relatedQuoteId: null,
  });

  await createPortalTimelineEvent(ctx.organizationId, {
    customerId: ctx.customer.id,
    propertyId: input.propertyId ?? null,
    eventType: 'service_request',
    title: 'Service request submitted',
    description: input.title,
    relatedRecordType: 'serviceIssue',
    relatedRecordId: issue.id,
    customerVisible: true,
  });

  return issue;
}

export async function uploadPortalPhoto(
  token: string,
  input: { dataBase64: string; contentType: string; filename?: string },
): Promise<{ path: string; url: string }> {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  const buffer = Buffer.from(input.dataBase64, 'base64');
  if (buffer.length < 32) throw new Error('Invalid photo data');
  if (buffer.length > 4_500_000) throw new Error('Photo must be under 4.5 MB');
  const { uploadFile } = await import('./storage');
  return uploadFile(
    ctx.organizationId,
    `portal-service/${ctx.customer.id}`,
    buffer,
    input.contentType,
    input.filename ?? `photo-${Date.now()}.jpg`,
  );
}

export async function submitPortalRebookRequest(
  token: string,
  input: { notes?: string; preferredMonth?: string; sameDesign?: boolean; upgradeRequested?: boolean },
) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'rebooking')) {
    throw new Error('Rebooking is not enabled');
  }

  const result = await processPortalRebook(ctx.organizationId, ctx.customer.id, {
    sameDesign: input.sameDesign ?? true,
    upgradeRequested: input.upgradeRequested ?? false,
    preferredMonth: input.preferredMonth,
    notes: input.notes,
  });

  const body = [
    input.upgradeRequested ? 'Customer requested upgrade for next season.' : 'Customer rebooked same design for next season.',
    input.preferredMonth ? `Preferred month: ${input.preferredMonth}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter(Boolean).join('\n');

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: input.upgradeRequested ? 'Upgrade request — next season' : 'Rebook request — next season',
    body,
    employeeId: null,
    employeeName: null,
    occurredAt: new Date(),
    followUpRequired: true,
    followUpDate: null,
    relatedPropertyId: null,
    relatedJobId: null,
    relatedQuoteId: result.newProposalId,
  });
  await logCustomerActivity(ctx.organizationId, ctx.customer.id, 'note_added', 'Rebook submitted via portal', null, 'Portal');
  await createPortalTimelineEvent(ctx.organizationId, {
    customerId: ctx.customer.id,
    eventType: 'rebook_request',
    title: 'Rebook request submitted',
    description: input.upgradeRequested ? 'Upgrade requested for next season' : 'Same design requested for next season',
    customerVisible: true,
  });

  return { success: true, ...result };
}

export async function getPortalRebookInfo(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) return null;
  if (!portalHasFeature(ctx.enabledFeatures, 'rebooking')) {
    return null;
  }
  const rebook = await getPortalRebookContext(ctx.organizationId, ctx.customer.id);
  return {
    ...rebook,
    customerName:
      ctx.customer.businessName
      || `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim(),
  };
}

export async function createPortalNotification(
  orgId: string,
  input: {
    portalUserId: string;
    customerId: string;
    category: string;
    title: string;
    body: string;
    actionUrl?: string | null;
  },
) {
  return colCreate(orgId, 'portalNotifications', {
    portalUserId: input.portalUserId,
    customerId: input.customerId,
    category: input.category,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? null,
    readAt: null,
  }) as Promise<PortalNotification>;
}

/** Best-effort portal inbox write when CRM lifecycle events occur. */
export async function notifyPortalCustomer(
  orgId: string,
  customerId: string,
  input: {
    category: string;
    title: string;
    body: string;
    actionUrl?: string | null;
  },
): Promise<PortalNotification | null> {
  try {
    const account = await getPortalAccountByCustomer(orgId, customerId);
    if (!account?.portalEnabled || account.status === 'suspended' || account.status === 'archived') {
      return null;
    }
    let user = await getPrimaryPortalUser(orgId, customerId);
    if (!user && account.primaryPortalUserId) {
      user = await colGet<PortalUser>(orgId, 'portalUsers', account.primaryPortalUserId);
    }
    if (!user) return null;
    return await createPortalNotification(orgId, {
      portalUserId: user.id,
      customerId,
      category: input.category,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
    });
  } catch {
    return null;
  }
}

export async function markAllPortalNotificationsRead(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  const rows = await listPortalNotifications(token, 50);
  await Promise.all(
    rows.filter((n) => !n.readAt).map((n) => markPortalNotificationRead(token, n.id)),
  );
  return { success: true };
}

export async function listPortalContacts(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  const { listContacts360 } = await import('./contacts');
  const { items } = await listContacts360(ctx.organizationId, {
    customerId: ctx.customer.id,
    pageSize: 100,
  });
  return items.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    role: c.role ?? null,
    title: c.title ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    isPrimary: Boolean(c.isPrimary),
  }));
}

export async function listPortalServiceRequests(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'service_requests')) {
    throw new Error('Service requests are not enabled');
  }
  const { listServiceIssues360 } = await import('./service-issues');
  const { items } = await listServiceIssues360(ctx.organizationId, {
    customerId: ctx.customer.id,
    pageSize: 50,
    maxScan: 200,
  });
  return items.map((i) => ({
    id: i.id,
    title: i.title,
    status: i.status,
    category: i.category,
    priority: i.priority,
    propertyLabel: i.propertyLabel ?? null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));
}

export async function sendPortalInviteEmail(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{ sent: boolean; accessUrl: string; email: string | null; reason?: string }> {
  const { token, accessUrl } = await enableCustomerPortal(orgId, customerId, userId);
  const customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
  if (!customer) throw new Error('Customer not found');

  let email = customer.email ?? null;
  try {
    const { listContacts360 } = await import('./contacts');
    const { items } = await listContacts360(orgId, { customerId, pageSize: 50 });
    const primary = items.find((c) => c.isPrimary && c.email) ?? items.find((c) => c.email);
    if (primary?.email) email = primary.email;
  } catch {
    // keep customer email
  }

  if (!email) {
    return { sent: false, accessUrl, email: null, reason: 'No customer email on file' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { sent: false, accessUrl, email, reason: 'Email delivery is not configured' };
  }

  const branding = await getBrandingForCustomerFacing(orgId);
  const companyName = branding.companyName || 'Your lighting company';
  const customerName = customer.businessName
    || `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
    || 'there';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${companyName} — your customer portal`,
      text: [
        `Hi ${customerName},`,
        '',
        `Your customer portal for ${companyName} is ready.`,
        `Open this link to view proposals, schedules, invoices, and more:`,
        accessUrl,
        '',
        'If you did not expect this email, contact us.',
      ].join('\n'),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { sent: false, accessUrl, email, reason: detail || 'Email send failed' };
  }

  await createPortalTimelineEvent(orgId, {
    customerId,
    eventType: 'portal_invite_sent',
    title: 'Portal invitation emailed',
    description: `Invite sent to ${email}`,
    customerVisible: false,
  });
  await logCustomerActivity(orgId, customerId, 'email_sent', `Portal invite emailed to ${email}`, userId, 'System');
  await notifyPortalCustomer(orgId, customerId, {
    category: 'account',
    title: 'Welcome to your portal',
    body: 'Your customer portal is ready. Explore your schedule, proposals, and billing.',
    actionUrl: '#',
  });

  return { sent: true, accessUrl, email };
}

export async function listPortalAgreements(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'agreements')) {
    throw new Error('Agreements are not enabled');
  }
  const { listMultiYearAgreements360 } = await import('./agreements');
  const { items } = await listMultiYearAgreements360(ctx.organizationId, {
    customerId: ctx.customer.id,
    pageSize: 100,
  });
  return items.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    optionCode: a.optionCode,
    optionLabel: a.optionLabel,
    startSeason: a.startSeason,
    endSeason: a.endSeason,
    annualValueCents: a.annualValueCents,
    totalValueCents: a.totalValueCents,
    depositPercent: a.depositPercent,
    propertyLabel: a.propertyLabel ?? null,
    signedAt: a.signedAt ?? null,
    signedByName: a.signedByName ?? null,
    publicToken: a.publicToken ?? null,
    signedDocumentUrl: a.signedDocumentUrl ?? null,
  }));
}

export async function listPortalDocuments(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'documents')) {
    throw new Error('Documents are not enabled');
  }
  const { listCustomerDocuments360 } = await import('./documents360');
  const docs = await listCustomerDocuments360(ctx.organizationId, ctx.customer.id);
  return docs
    .filter((d) => !!d.url)
    .map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      url: d.url,
      createdAt: d.createdAt,
    }));
}

export async function listPortalStorage(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'storage')) {
    throw new Error('Storage is not enabled');
  }
  const { listStorageRecords, getStorageRecord } = await import('./storage360');
  const records = await listStorageRecords(ctx.organizationId, ctx.customer.id);
  return Promise.all(
    records.map(async (r) => {
      const detail = await getStorageRecord(ctx.organizationId, r.id);
      const items = (detail?.items ?? []).map((item) => ({
        name: String((item as { name?: string }).name ?? 'Item'),
        quantity: Number((item as { quantity?: number }).quantity ?? 1),
        condition: String((item as { condition?: string }).condition ?? 'good'),
      }));
      return {
        id: r.id,
        status: r.status,
        storageType: r.storageType,
        storedAt: r.storedAt,
        pulledAt: r.pulledAt ?? null,
        propertyAddress: r.propertyAddress ?? detail?.propertyAddress ?? null,
        itemCount: r.itemCount ?? items.length,
        conditionNotes: r.conditionNotes ?? null,
        items,
      };
    }),
  );
}

export async function listPortalReviews(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'reviews')) {
    throw new Error('Reviews are not enabled');
  }
  const { listReviewRequests360 } = await import('./reviews360');
  const all = await listReviewRequests360(ctx.organizationId);
  return all
    .filter((r) => r.customerId === ctx.customer.id)
    .map((r) => ({
      id: r.id,
      status: r.status,
      rating: r.rating ?? null,
      submittedAt: r.submittedAt ?? null,
      publicToken: r.publicToken ?? null,
      sentAt: r.sentAt ?? null,
    }));
}

export async function listPortalReferrals(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'referrals')) {
    throw new Error('Referrals are not enabled');
  }
  const { listReferrals, ensureReferralCode } = await import('./reviews360');
  let referrals = await listReferrals(ctx.organizationId, ctx.customer.id);
  if (!referrals.length) {
    const created = await ensureReferralCode(ctx.organizationId, ctx.customer.id);
    if (created) referrals = [created];
  }
  return referrals.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    rewardAmountCents: r.rewardAmountCents ?? null,
    issuedAt: r.issuedAt,
    usedAt: r.usedAt ?? null,
    rewardedAt: r.rewardedAt ?? null,
  }));
}

export async function getPortalMessages(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'messaging')) {
    throw new Error('Messaging is not enabled');
  }
  const { getConversationByCustomer } = await import('./messages360');
  const { conversation, messages } = await getConversationByCustomer(ctx.organizationId, ctx.customer.id);
  return {
    conversationId: conversation.id,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      channel: m.channel,
      body: m.body,
      createdAt: m.createdAt,
      attachmentUrls: m.attachmentUrls ?? [],
      status: m.status ?? null,
      readAt: m.readAt ?? null,
    })),
  };
}

export async function sendPortalMessage(token: string, body: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'messaging')) {
    throw new Error('Messaging is not enabled');
  }
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message cannot be empty');
  const { receivePortalMessage } = await import('./messages360');
  const result = await receivePortalMessage(ctx.organizationId, {
    customerId: ctx.customer.id,
    body: trimmed,
  });
  await createPortalTimelineEvent(ctx.organizationId, {
    customerId: ctx.customer.id,
    eventType: 'portal_message',
    title: 'Message sent',
    description: trimmed.slice(0, 120),
    customerVisible: true,
  });
  return {
    id: result.message.id,
    direction: result.message.direction,
    channel: result.message.channel,
    body: result.message.body,
    createdAt: result.message.createdAt,
    attachmentUrls: result.message.attachmentUrls ?? [],
    status: result.message.status ?? null,
    readAt: result.message.readAt ?? null,
  };
}

export async function listPortalProperties(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'properties')) {
    throw new Error('Properties are not enabled');
  }
  const rows = await colListByCustomerId<{
    id: string;
    propertyName?: string;
    label?: string;
    propertyType?: string | null;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    state?: string;
    postalCode?: string;
    accessInstructions?: string | null;
    powerSourceLocations?: string | null;
    previousYearDesignNotes?: string | null;
    galleryPhotos?: Array<{ id: string; url: string; label?: string | null }>;
  }>(ctx.organizationId, 'properties', ctx.customer.id);

  return rows.map((p) => ({
    id: p.id,
    propertyName: String(p.propertyName ?? p.label ?? 'Property'),
    label: String(p.label ?? p.propertyName ?? 'Property'),
    propertyType: p.propertyType ?? null,
    addressLine1: String(p.addressLine1 ?? ''),
    addressLine2: p.addressLine2 ?? null,
    city: String(p.city ?? ''),
    state: String(p.state ?? ''),
    postalCode: String(p.postalCode ?? ''),
    accessInstructions: p.accessInstructions ?? null,
    powerSourceLocations: p.powerSourceLocations ?? null,
    previousYearDesignNotes: p.previousYearDesignNotes ?? null,
    galleryPhotos: (p.galleryPhotos ?? [])
      .filter((g) => !!g?.url)
      .map((g) => ({ id: g.id, url: g.url, label: g.label ?? null })),
  }));
}

export async function listPortalConsultations(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'consultations')) {
    throw new Error('Consultations are not enabled');
  }
  const { listConsultations360 } = await import('./consultations360');
  const rows = await listConsultations360(ctx.organizationId, ctx.customer.id);
  return rows.map((c) => ({
    id: c.id,
    propertyId: c.propertyId ?? null,
    consultationType: c.consultationType,
    status: c.status,
    scheduledAt: c.scheduledAt ?? null,
    completedAt: c.completedAt ?? null,
    customerGoals: c.customerGoals ?? null,
    preferredColors: c.preferredColors ?? null,
    preferredLightStyle: c.preferredLightStyle ?? null,
    powerAvailability: c.powerAvailability ?? null,
    accessRequirements: c.accessRequirements ?? null,
  }));
}

export async function listPortalTakedowns(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'takedowns')) {
    throw new Error('Takedowns are not enabled');
  }

  const { listCalendarEvents } = await import('./schedule360');
  const { inferAppointmentTypeFromJob } = await import('./jobs360');
  type OrgJobRecord = import('./jobs360').OrgJobRecord;
  const [events, jobs] = await Promise.all([
    listCalendarEvents(ctx.organizationId, undefined, undefined, { readOnly: true }),
    colListByCustomerId<OrgJobRecord>(ctx.organizationId, 'jobs', ctx.customer.id),
  ]);

  const fromEvents = events
    .filter((e) => e.customerId === ctx.customer.id && (e.appointmentType === 'takedown' || e.category === 'takedown'))
    .map((e) => ({
      id: e.id,
      source: 'calendar' as const,
      title: e.title,
      status: e.dispatchStatus,
      scheduledStart: e.startAt,
      scheduledEnd: e.endAt,
      propertyAddress: e.propertyAddress ?? null,
      propertyId: e.propertyId ?? null,
    }));

  const eventJobIds = new Set(events.filter((e) => e.jobId).map((e) => e.jobId as string));
  const fromJobs = jobs
    .filter((j) => inferAppointmentTypeFromJob(j) === 'takedown' && !eventJobIds.has(j.id))
    .map((j) => ({
      id: j.id,
      source: 'job' as const,
      title: String(j.title ?? 'Takedown'),
      status: String(j.stage ?? 'removal_scheduled'),
      scheduledStart: j.scheduledStart instanceof Date ? j.scheduledStart : j.scheduledStart ? new Date(String(j.scheduledStart)) : null,
      scheduledEnd: j.scheduledEnd instanceof Date ? j.scheduledEnd : j.scheduledEnd ? new Date(String(j.scheduledEnd)) : null,
      propertyAddress: null as string | null,
      propertyId: j.propertyId ?? null,
    }));

  return [...fromEvents, ...fromJobs].sort((a, b) => {
    const at = a.scheduledStart?.getTime?.() ?? 0;
    const bt = b.scheduledStart?.getTime?.() ?? 0;
    return bt - at;
  });
}

export async function submitPortalScheduleRequest(
  token: string,
  input: {
    appointmentType: 'estimate_visit' | 'design_consultation' | 'installation' | 'takedown' | 'service_call';
    propertyId?: string;
    preferredStartAt?: Date | null;
    preferredEndAt?: Date | null;
    preferredWindows?: string;
    notes?: string;
  },
) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'scheduling') || !ctx.settings.allowSelfScheduling) {
    throw new Error('Self-scheduling is not enabled');
  }

  if (input.propertyId) {
    const prop = await colGet<{ customerId?: string }>(ctx.organizationId, 'properties', input.propertyId);
    if (!prop || prop.customerId !== ctx.customer.id) {
      throw new Error('Invalid property for this account');
    }
  }

  const label = input.appointmentType.replace(/_/g, ' ');
  const body = [
    `Schedule request: ${label}`,
    input.preferredWindows ? `Preferred windows: ${input.preferredWindows}` : null,
    input.preferredStartAt ? `Preferred start: ${new Date(input.preferredStartAt).toISOString()}` : null,
    input.preferredEndAt ? `Preferred end: ${new Date(input.preferredEndAt).toISOString()}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter(Boolean).join('\n');

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: `Schedule request — ${label}`,
    body,
    employeeId: null,
    employeeName: null,
    occurredAt: new Date(),
    followUpRequired: true,
    followUpDate: null,
    relatedPropertyId: input.propertyId ?? null,
    relatedJobId: null,
    relatedQuoteId: null,
  });

  const event = await createPortalTimelineEvent(ctx.organizationId, {
    customerId: ctx.customer.id,
    propertyId: input.propertyId ?? null,
    eventType: 'schedule_request',
    title: `Schedule request: ${label}`,
    description: input.preferredWindows || input.notes || 'Customer requested an appointment window',
    customerVisible: true,
  });

  if (ctx.primaryUser) {
    await createPortalNotification(ctx.organizationId, {
      portalUserId: ctx.primaryUser.id,
      customerId: ctx.customer.id,
      category: 'scheduling',
      title: 'Schedule request received',
      body: 'Your lighting company will confirm your appointment shortly.',
      actionUrl: '#schedule',
    });
  }

  return {
    id: event.id,
    status: 'requested' as const,
    message: 'Your schedule request was submitted. We will confirm the appointment with you.',
  };
}

function mapPortalInvoice(i: Record<string, unknown> & { id: string }) {
  return {
    id: String(i.id),
    invoiceNumber: String(i.invoiceNumber ?? i.id),
    status: String(i.status ?? 'draft'),
    subtotalCents: Number(i.subtotalCents ?? 0),
    amountPaidCents: Number(i.amountPaidCents ?? 0),
    publicToken: (i.publicToken as string) ?? null,
    dueDate: i.dueDate instanceof Date ? i.dueDate : i.dueDate ? new Date(String(i.dueDate)) : null,
    paidAt: i.paidAt instanceof Date ? i.paidAt : i.paidAt ? new Date(String(i.paidAt)) : null,
    issuedAt: i.issuedAt instanceof Date ? i.issuedAt : i.issuedAt ? new Date(String(i.issuedAt)) : null,
  };
}

function mapPortalProposal(p: Record<string, unknown> & { id: string }) {
  return {
    id: String(p.id),
    title: String(p.title ?? 'Proposal'),
    status: String(p.status ?? 'draft'),
    subtotalCents: Number(p.subtotalCents ?? 0),
    publicToken: (p.publicToken as string) ?? null,
    installDate: p.installDate instanceof Date ? p.installDate : p.installDate ? new Date(String(p.installDate)) : null,
    removalDate: p.removalDate instanceof Date ? p.removalDate : p.removalDate ? new Date(String(p.removalDate)) : null,
  };
}

function mapPortalMockup(m: {
  id: string;
  name: string;
  imageUrl: string;
  renderedImageUrl?: string | null;
  status?: string;
  approvalToken?: string | null;
}) {
  return {
    id: m.id,
    name: m.name,
    imageUrl: m.imageUrl,
    renderedImageUrl: m.renderedImageUrl ?? null,
    status: m.status ?? null,
    approvalToken: m.approvalToken ?? null,
  };
}

function mapPortalJobSummary(j: Record<string, unknown> & { id: string }) {
  return {
    id: String(j.id),
    title: String(j.title ?? 'Job'),
    stage: String(j.stage ?? 'draft_proposal'),
    jobType: (j.jobType as string) ?? null,
    scheduledStart: j.scheduledStart instanceof Date ? j.scheduledStart : j.scheduledStart ? new Date(String(j.scheduledStart)) : null,
    scheduledEnd: j.scheduledEnd instanceof Date ? j.scheduledEnd : j.scheduledEnd ? new Date(String(j.scheduledEnd)) : null,
    propertyId: (j.propertyId as string) ?? null,
  };
}

export async function listPortalInvoices(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'billing') || !ctx.settings.permissions.viewInvoices) {
    throw new Error('Billing is not enabled');
  }
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'invoices',
    ctx.customer.id,
  );
  return rows
    .map(mapPortalInvoice)
    .sort((a, b) => (b.dueDate?.getTime?.() ?? 0) - (a.dueDate?.getTime?.() ?? 0));
}

export async function listPortalProposals(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'proposals') || !ctx.settings.permissions.viewProposals) {
    throw new Error('Proposals are not enabled');
  }
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'proposals',
    ctx.customer.id,
  );
  return rows.map(mapPortalProposal).sort((a, b) => b.subtotalCents - a.subtotalCents);
}

export async function listPortalMockups(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'mockups')) {
    throw new Error('Mockups are not enabled');
  }
  const rows = await colListByCustomerId<{
    id: string;
    name: string;
    imageUrl: string;
    renderedImageUrl?: string | null;
    status?: string;
    approvalToken?: string | null;
  }>(ctx.organizationId, 'mockups', ctx.customer.id);
  return rows.map(mapPortalMockup);
}

export async function listPortalJobs(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'install_tracking')) {
    throw new Error('Install tracking is not enabled');
  }
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'jobs',
    ctx.customer.id,
  );
  return rows
    .map(mapPortalJobSummary)
    .sort((a, b) => (b.scheduledStart?.getTime?.() ?? 0) - (a.scheduledStart?.getTime?.() ?? 0));
}

export async function getPortalJobDetail(token: string, jobId: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'install_tracking')) {
    throw new Error('Install tracking is not enabled');
  }

  const job = await colGet<{
    id: string;
    customerId?: string;
    propertyId?: string | null;
    title?: string;
    stage?: string;
    jobType?: string | null;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
    scopeSummary?: string | null;
    accessNotes?: string | null;
    mockupPhotoUrls?: string[] | null;
    approvedPackageName?: string | null;
  }>(ctx.organizationId, 'jobs', jobId);

  if (!job || job.customerId !== ctx.customer.id) {
    throw new Error('Job not found');
  }

  const property = job.propertyId
    ? await colGet<{
        addressLine1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        label?: string;
      }>(ctx.organizationId, 'properties', job.propertyId)
    : null;

  const events = await listCalendarEvents(ctx.organizationId, undefined, undefined, { readOnly: true });
  const event = events.find((e) => e.jobId === jobId && e.customerId === ctx.customer.id);

  return {
    id: jobId,
    title: String(job.title ?? 'Job'),
    stage: String(job.stage ?? 'draft_proposal'),
    jobType: job.jobType ?? null,
    scheduledStart: job.scheduledStart instanceof Date ? job.scheduledStart : job.scheduledStart ? new Date(String(job.scheduledStart)) : null,
    scheduledEnd: job.scheduledEnd instanceof Date ? job.scheduledEnd : job.scheduledEnd ? new Date(String(job.scheduledEnd)) : null,
    scopeSummary: job.scopeSummary ?? null,
    accessNotes: job.accessNotes ?? null,
    approvedPackageName: job.approvedPackageName ?? null,
    mockupPhotoUrls: (job.mockupPhotoUrls ?? []).filter(Boolean),
    property: property
      ? {
          label: String(property.label ?? property.addressLine1 ?? 'Property'),
          addressLine1: String(property.addressLine1 ?? ''),
          city: String(property.city ?? ''),
          state: String(property.state ?? ''),
          postalCode: String(property.postalCode ?? ''),
        }
      : null,
    schedule: event
      ? {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          dispatchStatus: event.dispatchStatus,
          appointmentType: event.appointmentType,
        }
      : null,
  };
}

export async function getPortalSigningHub(token: string) {
  const ctx = await requirePortalAccess(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!portalHasFeature(ctx.enabledFeatures, 'e_sign')) {
    throw new Error('E-sign is not enabled');
  }

  const canApprove = ctx.settings.permissions.approveDesigns;
  const items: Array<{
    id: string;
    kind: 'agreement' | 'proposal' | 'mockup';
    title: string;
    status: string;
    href: string | null;
    detail?: string | null;
  }> = [];

  if (portalHasFeature(ctx.enabledFeatures, 'agreements')) {
    const agreements = await listPortalAgreements(token);
    for (const a of agreements) {
      if (!['awaiting_signature', 'sent', 'draft'].includes(a.status)) continue;
      if (!a.publicToken) continue;
      items.push({
        id: a.id,
        kind: 'agreement',
        title: a.title,
        status: a.status,
        href: `/a/${a.publicToken}`,
        detail: a.propertyLabel,
      });
    }
  }

  if (portalHasFeature(ctx.enabledFeatures, 'proposals') && ctx.settings.permissions.viewProposals) {
    const proposals = await listPortalProposals(token);
    for (const p of proposals) {
      if (['approved', 'deposit_paid', 'scheduled', 'declined', 'expired', 'cancelled'].includes(p.status)) continue;
      if (!p.publicToken) continue;
      items.push({
        id: p.id,
        kind: 'proposal',
        title: p.title,
        status: p.status,
        href: canApprove ? `/p/${p.publicToken}` : null,
        detail: null,
      });
    }
  }

  if (portalHasFeature(ctx.enabledFeatures, 'mockups')) {
    const mockups = await listPortalMockups(token);
    for (const m of mockups) {
      if (m.status !== 'in_review' || !m.approvalToken) continue;
      items.push({
        id: m.id,
        kind: 'mockup',
        title: m.name,
        status: m.status,
        href: canApprove ? `/m/${m.approvalToken}` : null,
        detail: null,
      });
    }
  }

  return { items, canApprove };
}

// Silence unused Timestamp import if tree-shaken elsewhere
void Timestamp;
