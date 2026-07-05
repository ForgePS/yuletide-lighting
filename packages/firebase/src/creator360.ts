import type {
  CreatorDashboardKpis,
  CreatorHealthCheck,
  CreatorOrgModules,
  CreatorOrganizationDetail,
  CreatorOrganizationSummary,
  CreatorPaymentSummary,
  CreatorProvisionResult,
  CreatorSubscriptionPreset,
  CreatorSubscriptionSummary,
  CreatorUserSummary,
  CrmPlatformModuleKey,
  PlatformAuditLogEntry,
  PlatformSettings,
} from '@clcrm/types';
import { DEFAULT_AVAILABLE_MODULES, DEFAULT_PLATFORM_SETTINGS, SUBSCRIPTION_PRICING } from '@clcrm/types';
import type { SubscriptionStatus } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';import { mapTimestampsFromData } from './firestore-utils';
import {
  getOrganization,
  updateOrganization,
  type OrganizationRecord,
  type UserRecord,
} from './firestore';
import { inviteOrgUser } from './settings360';
import {
  getOrgSubscriptionState,
  isSubscriptionLocked,
  listSubscriptionPayments,
} from './billing';

function ts() {
  return Timestamp.now();
}

function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseCreatorAllowList(raw: string | undefined) {
  return (raw ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformCreator(email: string, firebaseUid?: string | null) {
  const emails = parseCreatorAllowList(process.env.PLATFORM_CREATOR_EMAILS);
  const uids = parseCreatorAllowList(process.env.PLATFORM_CREATOR_UIDS);
  if (emails.includes(email.trim().toLowerCase())) return true;
  if (firebaseUid && uids.includes(firebaseUid.trim().toLowerCase())) return true;
  return false;
}

/** Env allowlist + Firestore platform/config operator list. */
export async function resolvePlatformCreator(email: string, firebaseUid?: string | null): Promise<boolean> {
  if (isPlatformCreator(email, firebaseUid)) return true;
  try {
    const settings = await getPlatformSettings();
    const emails = (settings.platformCreatorEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (emails.includes(email.trim().toLowerCase())) return true;
    if (firebaseUid) {
      const uids = (settings.platformCreatorUids ?? []).map((u) => u.trim().toLowerCase()).filter(Boolean);
      if (uids.includes(firebaseUid.trim().toLowerCase())) return true;
    }
  } catch {
    // Firestore unavailable — env allowlist only
  }
  return false;
}

async function logPlatformAudit(entry: Omit<PlatformAuditLogEntry, 'id' | 'createdAt'>) {
  const db = getAdminFirestore();
  const ref = db.collection('platformAuditLogs').doc();
  const now = ts();
  await ref.set({ ...entry, createdAt: now });
  return ref.id;
}

export async function listPlatformAuditLogs(limit = 50): Promise<PlatformAuditLogEntry[]> {
  const db = getAdminFirestore();
  const snap = await db.collection('platformAuditLogs')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()
    .catch(async () => db.collection('platformAuditLogs').limit(limit).get());

  return snap.docs
    .map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as PlatformAuditLogEntry)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = getAdminFirestore();
  const snap = await db.collection('platform').doc('config').get();
  if (!snap.exists) return { ...DEFAULT_PLATFORM_SETTINGS };
  const merged = { ...DEFAULT_PLATFORM_SETTINGS, ...snap.data()! };
  if (!Array.isArray(merged.availableModules) || merged.availableModules.length === 0) {
    merged.availableModules = [...DEFAULT_AVAILABLE_MODULES];
  }
  return mapTimestampsFromData(merged) as PlatformSettings;
}

export async function updatePlatformSettings(
  input: PlatformSettings,
  actor: { userId: string; email: string },
): Promise<PlatformSettings> {
  const db = getAdminFirestore();
  const now = ts();
  const payload: PlatformSettings = {
    ...input,
    platformLogoUrl: input.platformLogoUrl ?? null,
    marketingUrl: input.marketingUrl ?? null,
    hostingUrl: input.hostingUrl ?? null,
    docsUrl: input.docsUrl ?? null,
    announcementBanner: input.announcementBanner ?? null,
    platformCreatorEmails: (input.platformCreatorEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean),
    platformCreatorUids: (input.platformCreatorUids ?? []).map((u) => u.trim().toLowerCase()).filter(Boolean),
  };
  await db.collection('platform').doc('config').set({ ...payload, updatedAt: now }, { merge: true });
  await logPlatformAudit({
    action: 'platform_settings_update',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    details: input as unknown as Record<string, unknown>,
  });
  return getPlatformSettings();
}

async function loadAllOrganizations(): Promise<OrganizationRecord[]> {
  const db = getAdminFirestore();
  const snap = await db.collection('organizations').get();
  return snap.docs
    .map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as OrganizationRecord)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

async function loadAllUsers(): Promise<UserRecord[]> {
  const db = getAdminFirestore();
  const snap = await db.collection('users').get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as UserRecord);
}

function countUsersByOrg(users: UserRecord[]) {
  const map = new Map<string, number>();
  for (const user of users) {
    map.set(user.organizationId, (map.get(user.organizationId) ?? 0) + 1);
  }
  return map;
}

async function countCustomers(orgId: string) {
  const db = getAdminFirestore();
  try {
    const snap = await db.collection(`organizations/${orgId}/customers`).count().get();
    return snap.data().count;
  } catch {
    const snap = await db.collection(`organizations/${orgId}/customers`).get();
    return snap.size;
  }
}

function estimateMrr(orgs: OrganizationRecord[]) {
  let mrr = 0;
  for (const org of orgs) {
    const status = org.subscriptionStatus ?? 'none';
    if (status !== 'active' && status !== 'trialing' && status !== 'past_due') continue;
    if (org.subscriptionPlan === 'monthly') mrr += SUBSCRIPTION_PRICING.monthly.amountCents;
    if (org.subscriptionPlan === 'yearly') mrr += Math.round(SUBSCRIPTION_PRICING.yearly.amountCents / 12);
  }
  return mrr;
}

function orgMatchesStatus(org: OrganizationRecord, status: string) {
  if (status === 'all') return true;
  if (status === 'locked') return isSubscriptionLocked(org);
  if (status === 'no_access') return !getOrgSubscriptionState(org).hasAccess;
  const sub = org.subscriptionStatus ?? 'none';
  return sub === status;
}

function orgMrrCents(org: OrganizationRecord) {
  const status = org.subscriptionStatus ?? 'none';
  if (status !== 'active' && status !== 'trialing' && status !== 'past_due') return 0;
  if (org.subscriptionPlan === 'monthly') return SUBSCRIPTION_PRICING.monthly.amountCents;
  if (org.subscriptionPlan === 'yearly') return Math.round(SUBSCRIPTION_PRICING.yearly.amountCents / 12);
  return 0;
}

function orgPlanLabel(org: OrganizationRecord) {
  if (!org.subscriptionPlan) return null;
  return SUBSCRIPTION_PRICING[org.subscriptionPlan].label;
}

function toSubscriptionSummary(org: OrganizationRecord, userCount: number): CreatorSubscriptionSummary {
  const state = getOrgSubscriptionState(org);
  return {
    id: org.id,
    companyName: org.companyName,
    subscriptionStatus: state.status,
    subscriptionPlan: state.plan,
    subscriptionInterval: state.interval,
    planLabel: orgPlanLabel(org),
    isLocked: state.isLocked,
    hasAccess: state.hasAccess,
    userCount,
    mrrCents: orgMrrCents(org),
    trialEndsAt: state.trialEndsAt,
    currentPeriodEnd: state.currentPeriodEnd,
    lockAt: state.lockAt,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd ?? false,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    createdAt: org.createdAt,
  };
}

function toOrgSummary(org: OrganizationRecord, userCount: number, customerCount: number): CreatorOrganizationSummary {
  const state = getOrgSubscriptionState(org);
  return {
    id: org.id,
    companyName: org.companyName,
    subscriptionStatus: state.status,
    subscriptionPlan: state.plan,
    isLocked: state.isLocked,
    userCount,
    customerCount,
    createdAt: org.createdAt,
    currentPeriodEnd: state.currentPeriodEnd,
    trialEndsAt: state.trialEndsAt,
    stripeCustomerId: org.stripeCustomerId ?? null,
  };
}

export async function getCreatorDashboard(): Promise<CreatorDashboardKpis> {
  const [orgs, users] = await Promise.all([loadAllOrganizations(), loadAllUsers()]);
  const now = new Date();
  const weekStartDate = weekStart(now);
  const monthStartDate = monthStart(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  let activeSubscriptions = 0;
  let trialingOrganizations = 0;
  let lockedOrganizations = 0;
  let pastDueOrganizations = 0;
  let paymentsLast30DaysCents = 0;

  for (const org of orgs) {
    const status = org.subscriptionStatus ?? 'none';
    if (status === 'active') activeSubscriptions++;
    if (status === 'trialing') trialingOrganizations++;
    if (status === 'past_due') pastDueOrganizations++;
    if (isSubscriptionLocked(org)) lockedOrganizations++;

    const payments = await listSubscriptionPayments(org.id, 12);
    paymentsLast30DaysCents += payments
      .filter((p) => p.paidAt >= thirtyDaysAgo && p.status === 'paid')
      .reduce((s, p) => s + p.amountCents, 0);
  }

  const mrr = estimateMrr(orgs);

  return {
    totalOrganizations: orgs.length,
    newOrganizationsThisWeek: orgs.filter((o) => o.createdAt >= weekStartDate).length,
    newOrganizationsThisMonth: orgs.filter((o) => o.createdAt >= monthStartDate).length,
    totalUsers: users.length,
    activeSubscriptions,
    trialingOrganizations,
    lockedOrganizations,
    pastDueOrganizations,
    estimatedMrrCents: mrr,
    estimatedArrCents: mrr * 12,
    paymentsLast30DaysCents,
  };
}

export async function listCreatorOrganizations(input: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: CreatorOrganizationSummary[]; total: number }> {
  const [orgs, users] = await Promise.all([loadAllOrganizations(), loadAllUsers()]);
  const userCounts = countUsersByOrg(users);
  const search = input.search?.trim().toLowerCase();
  const status = input.status ?? 'all';

  let filtered = orgs.filter((org) => orgMatchesStatus(org, status));
  if (search) {
    filtered = filtered.filter((org) =>
      org.companyName.toLowerCase().includes(search) ||
      org.id.toLowerCase().includes(search) ||
      (org.stripeCustomerId ?? '').toLowerCase().includes(search),
    );
  }

  const total = filtered.length;
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const page = filtered.slice(offset, offset + limit);

  const items = await Promise.all(
    page.map(async (org) => {
      const customerCount = await countCustomers(org.id);
      return toOrgSummary(org, userCounts.get(org.id) ?? 0, customerCount);
    }),
  );

  return { items, total };
}

export async function getCreatorOrganizationDetail(orgId: string): Promise<CreatorOrganizationDetail | null> {
  const org = await getOrganization(orgId);
  if (!org) return null;

  const db = getAdminFirestore();
  const [usersSnap, payments, customerCount, proposalsSnap, jobsSnap, invoicesSnap] = await Promise.all([
    db.collection('users').where('organizationId', '==', orgId).get(),
    listSubscriptionPayments(orgId, 12),
    countCustomers(orgId),
    db.collection(`organizations/${orgId}/proposals`).get(),
    db.collection(`organizations/${orgId}/jobs`).get(),
    db.collection(`organizations/${orgId}/invoices`).get(),
  ]);

  const users = usersSnap.docs.map((d) => {
    const u = mapTimestampsFromData({ id: d.id, ...d.data()! }) as UserRecord;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      role: u.settingsRole ?? u.role,
      createdAt: u.createdAt,
    };
  });

  const state = getOrgSubscriptionState(org);
  const summary = toOrgSummary(org, users.length, customerCount);

  return {
    ...summary,
    brandColor: org.brandColor,
    logoUrl: org.logoUrl ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd ?? false,
    lockAt: state.lockAt,
    hasAccess: state.hasAccess,
    subscriptionInterval: state.interval,
    planLabel: orgPlanLabel(org),
    mrrCents: orgMrrCents(org),
    users,
    recentPayments: payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      status: p.status,
      plan: p.plan,
      paidAt: p.paidAt,
    })),
    proposalCount: proposalsSnap.size,
    jobCount: jobsSnap.size,
    invoiceCount: invoicesSnap.size,
  };
}

export async function listCreatorSubscriptions(input: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: CreatorSubscriptionSummary[]; total: number }> {
  const [orgs, users] = await Promise.all([loadAllOrganizations(), loadAllUsers()]);
  const userCounts = countUsersByOrg(users);
  const search = input.search?.trim().toLowerCase();
  const status = input.status ?? 'all';

  let filtered = orgs.filter((org) => orgMatchesStatus(org, status));
  if (search) {
    filtered = filtered.filter((org) =>
      org.companyName.toLowerCase().includes(search) ||
      org.id.toLowerCase().includes(search) ||
      (org.stripeCustomerId ?? '').toLowerCase().includes(search) ||
      (org.stripeSubscriptionId ?? '').toLowerCase().includes(search),
    );
  }

  const total = filtered.length;
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const page = filtered.slice(offset, offset + limit);

  return {
    items: page.map((org) => toSubscriptionSummary(org, userCounts.get(org.id) ?? 0)),
    total,
  };
}

export async function listCreatorUsers(input: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: CreatorUserSummary[]; total: number }> {
  const [users, orgs] = await Promise.all([loadAllUsers(), loadAllOrganizations()]);
  const orgNames = new Map(orgs.map((o) => [o.id, o.companyName]));
  const search = input.search?.trim().toLowerCase();

  let filtered = users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.settingsRole ?? user.role,
    organizationId: user.organizationId,
    organizationName: orgNames.get(user.organizationId) ?? 'Unknown',
    createdAt: user.createdAt,
  }));

  if (search) {
    filtered = filtered.filter((user) =>
      user.email.toLowerCase().includes(search) ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase().includes(search) ||
      user.organizationName.toLowerCase().includes(search),
    );
  }

  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = filtered.length;
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  return { items: filtered.slice(offset, offset + limit), total };
}

export async function listCreatorRecentPayments(limit = 40): Promise<CreatorPaymentSummary[]> {
  const orgs = await loadAllOrganizations();
  const all: CreatorPaymentSummary[] = [];

  for (const org of orgs.slice(0, 100)) {
    const payments = await listSubscriptionPayments(org.id, 5);
    for (const payment of payments) {
      all.push({
        id: payment.id,
        organizationId: org.id,
        organizationName: org.companyName,
        amountCents: payment.amountCents,
        status: payment.status,
        plan: payment.plan,
        paidAt: payment.paidAt,
      });
    }
  }

  return all.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime()).slice(0, limit);
}

export async function updateCreatorOrganizationSubscription(
  input: {
    organizationId: string;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionPlan?: 'monthly' | 'yearly' | null;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    note?: string;
  },
  actor: { userId: string; email: string },
) {
  const org = await getOrganization(input.organizationId);
  if (!org) throw new Error('Organization not found');

  const patch: Partial<OrganizationRecord> = {};
  if (input.subscriptionStatus !== undefined) patch.subscriptionStatus = input.subscriptionStatus;
  if (input.subscriptionPlan !== undefined) patch.subscriptionPlan = input.subscriptionPlan;
  if (input.trialEndsAt !== undefined) patch.trialEndsAt = input.trialEndsAt;
  if (input.currentPeriodEnd !== undefined) patch.currentPeriodEnd = input.currentPeriodEnd;
  if (input.cancelAtPeriodEnd !== undefined) patch.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
  if (input.subscriptionStatus === 'locked') patch.lockedAt = new Date();
  if (input.subscriptionStatus === 'active' || input.subscriptionStatus === 'trialing') patch.lockedAt = null;

  await updateOrganization(input.organizationId, patch);
  await logPlatformAudit({
    action: 'org_subscription_update',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { patch, note: input.note ?? null },
  });

  return getCreatorOrganizationDetail(input.organizationId);
}

export async function applyCreatorSubscriptionPreset(
  input: { organizationId: string; preset: CreatorSubscriptionPreset; days?: number; note?: string },
  actor: { userId: string; email: string },
) {
  const org = await getOrganization(input.organizationId);
  if (!org) throw new Error('Organization not found');

  const settings = await getPlatformSettings();
  const now = new Date();
  let patch: Partial<OrganizationRecord> = { lockedAt: null };

  switch (input.preset) {
    case 'start_trial': {
      const days = input.days ?? settings.defaultTrialDays ?? 14;
      const trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + days);
      patch = { subscriptionStatus: 'trialing', trialEndsAt, subscriptionPlan: null, cancelAtPeriodEnd: false };
      break;
    }
    case 'activate_monthly': {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      patch = {
        subscriptionStatus: 'active',
        subscriptionPlan: 'monthly',
        subscriptionInterval: 'month',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      };
      break;
    }
    case 'activate_yearly': {
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);
      patch = {
        subscriptionStatus: 'active',
        subscriptionPlan: 'yearly',
        subscriptionInterval: 'year',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      };
      break;
    }
    case 'complimentary': {
      const days = input.days ?? 30;
      const end = new Date(now);
      end.setDate(end.getDate() + days);
      patch = {
        subscriptionStatus: 'active',
        subscriptionPlan: null,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      };
      break;
    }
    case 'mark_past_due':
      patch = { subscriptionStatus: 'past_due' };
      break;
    case 'cancel':
      patch = { subscriptionStatus: 'canceled', cancelAtPeriodEnd: true };
      break;
    case 'reactivate':
      patch = {
        subscriptionStatus: org.stripeSubscriptionId ? 'active' : 'trialing',
        cancelAtPeriodEnd: false,
        lockedAt: null,
      };
      if (!org.trialEndsAt && !org.stripeSubscriptionId) {
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + (settings.defaultTrialDays ?? 14));
        patch.trialEndsAt = trialEndsAt;
      }
      break;
    default:
      throw new Error('Unknown subscription preset');
  }

  await updateOrganization(input.organizationId, patch);
  await logPlatformAudit({
    action: 'org_subscription_preset',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { preset: input.preset, days: input.days ?? null, patch, note: input.note ?? null },
  });

  return getCreatorOrganizationDetail(input.organizationId);
}

export async function extendCreatorOrganizationTrial(
  input: { organizationId: string; additionalDays: number; note?: string },
  actor: { userId: string; email: string },
) {
  const org = await getOrganization(input.organizationId);
  if (!org) throw new Error('Organization not found');

  const base = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
  const trialEndsAt = new Date(base);
  trialEndsAt.setDate(trialEndsAt.getDate() + input.additionalDays);

  await updateOrganization(input.organizationId, {
    subscriptionStatus: 'trialing',
    trialEndsAt,
    lockedAt: null,
  });

  await logPlatformAudit({
    action: 'org_trial_extend',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { additionalDays: input.additionalDays, trialEndsAt, note: input.note ?? null },
  });

  return getCreatorOrganizationDetail(input.organizationId);
}

export async function lockCreatorOrganization(
  orgId: string,
  actor: { userId: string; email: string },
  note?: string,
) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error('Organization not found');
  await updateOrganization(orgId, { subscriptionStatus: 'locked', lockedAt: new Date() });
  await logPlatformAudit({
    action: 'org_lock',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { note: note ?? null },
  });
  return getCreatorOrganizationDetail(orgId);
}

export async function unlockCreatorOrganization(
  orgId: string,
  actor: { userId: string; email: string },
  note?: string,
) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error('Organization not found');
  await updateOrganization(orgId, {
    subscriptionStatus: org.stripeSubscriptionId ? 'active' : 'trialing',
    lockedAt: null,
  });
  await logPlatformAudit({
    action: 'org_unlock',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { note: note ?? null },
  });
  return getCreatorOrganizationDetail(orgId);
}

function normalizeOrgModules(org: OrganizationRecord, available: CrmPlatformModuleKey[]): CrmPlatformModuleKey[] {
  const stored = org.enabledModules ?? [];
  if (stored.length === 0) return [...available];
  return stored.filter((key): key is CrmPlatformModuleKey => available.includes(key as CrmPlatformModuleKey));
}

export async function getCreatorOrgModules(organizationId: string): Promise<CreatorOrgModules | null> {
  const [org, settings] = await Promise.all([getOrganization(organizationId), getPlatformSettings()]);
  if (!org) return null;
  const available = settings.availableModules ?? DEFAULT_AVAILABLE_MODULES;
  return {
    organizationId: org.id,
    companyName: org.companyName,
    availableModules: available,
    enabledModules: normalizeOrgModules(org, available),
  };
}

export async function updateCreatorOrgModules(
  input: { organizationId: string; enabledModules: CrmPlatformModuleKey[]; note?: string },
  actor: { userId: string; email: string },
): Promise<CreatorOrgModules> {
  const org = await getOrganization(input.organizationId);
  if (!org) throw new Error('Organization not found');
  const settings = await getPlatformSettings();
  const available = new Set(settings.availableModules ?? DEFAULT_AVAILABLE_MODULES);
  const enabledModules = input.enabledModules.filter((key) => available.has(key));

  await updateOrganization(input.organizationId, { enabledModules });
  await logPlatformAudit({
    action: 'org_modules_update',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: org.id,
    organizationName: org.companyName,
    details: { enabledModules, note: input.note ?? null },
  });

  const result = await getCreatorOrgModules(input.organizationId);
  if (!result) throw new Error('Organization not found');
  return result;
}

export async function provisionCreatorOrganization(
  input: { companyName: string; ownerEmail?: string; trialDays?: number; note?: string },
  actor: { userId: string; email: string },
): Promise<CreatorProvisionResult> {
  const settings = await getPlatformSettings();
  const db = getAdminFirestore();
  const now = ts();
  const trialDays = input.trialDays ?? settings.defaultTrialDays ?? 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const orgRef = db.collection('organizations').doc();
  await orgRef.set({
    companyName: input.companyName.trim(),
    brandColor: '#DC2626',
    logoUrl: null,
    agreementMode: 'multi',
    agreementOptions: [
      { code: '1YR', label: '1 Year', active: true },
      { code: '3YR', label: '3 Year', active: true },
      { code: '5YR', label: '5 Year', active: true },
    ],
    subscriptionStatus: trialDays > 0 ? 'trialing' : 'none',
    trialEndsAt: trialDays > 0 ? trialEndsAt : null,
    enabledModules: settings.availableModules ?? DEFAULT_AVAILABLE_MODULES,
    createdAt: now,
    updatedAt: now,
  });

  await logPlatformAudit({
    action: 'org_provision',
    actorEmail: actor.email,
    actorUserId: actor.userId,
    organizationId: orgRef.id,
    organizationName: input.companyName.trim(),
    details: { ownerEmail: input.ownerEmail ?? null, trialDays, note: input.note ?? null },
  });

  let ownerInviteSent = false;
  if (input.ownerEmail?.trim()) {
    try {
      await inviteOrgUser(
        orgRef.id,
        { email: input.ownerEmail.trim(), role: 'owner' },
        actor.userId,
        actor.email,
      );
      ownerInviteSent = true;
    } catch (err) {
      await logPlatformAudit({
        action: 'org_note',
        actorEmail: actor.email,
        actorUserId: actor.userId,
        organizationId: orgRef.id,
        organizationName: input.companyName.trim(),
        details: {
          note: 'Owner invite failed during provision',
          ownerEmail: input.ownerEmail,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  return {
    organizationId: orgRef.id,
    companyName: input.companyName.trim(),
    trialEndsAt,
    ownerInviteSent,
  };
}

export async function listPlatformCreatorAccounts(): Promise<Array<{ id: string; email: string; firstName: string | null; lastName: string | null }>> {
  const envEmails = parseCreatorAllowList(process.env.PLATFORM_CREATOR_EMAILS);
  const envUids = parseCreatorAllowList(process.env.PLATFORM_CREATOR_UIDS);
  const settings = await getPlatformSettings();
  const configEmails = (settings.platformCreatorEmails ?? []).map((e) => e.trim().toLowerCase());
  const configUids = (settings.platformCreatorUids ?? []).map((u) => u.trim().toLowerCase());
  const emails = [...new Set([...envEmails, ...configEmails])];
  const uids = [...new Set([...envUids, ...configUids])];
  if (emails.length === 0 && uids.length === 0) return [];

  const users = await loadAllUsers();
  return users
    .filter((user) =>
      emails.includes(user.email.trim().toLowerCase()) ||
      uids.includes(user.id.trim().toLowerCase()) ||
      uids.includes((user.firebaseUid ?? '').trim().toLowerCase()),
    )
    .map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    }));
}

export async function runCreatorHealthChecks(): Promise<CreatorHealthCheck[]> {
  const checks: CreatorHealthCheck[] = [];
  const settings = await getPlatformSettings();

  try {
    const db = getAdminFirestore();
    await db.collection('platform').doc('config').get();
    checks.push({ id: 'firestore', label: 'Firestore connection', status: 'pass', detail: 'Platform config readable' });
  } catch (err) {
    checks.push({ id: 'firestore', label: 'Firestore connection', status: 'fail', detail: err instanceof Error ? err.message : 'Connection failed' });
  }

  const orgs = await loadAllOrganizations();
  checks.push({
    id: 'tenants',
    label: 'Tenant organizations',
    status: orgs.length > 0 ? 'pass' : 'warn',
    detail: orgs.length > 0 ? `${orgs.length} organizations registered` : 'No organizations yet',
  });

  const locked = orgs.filter((o) => isSubscriptionLocked(o)).length;
  if (locked > 0) {
    checks.push({ id: 'locked', label: 'Locked accounts', status: 'warn', detail: `${locked} organization(s) locked` });
  } else {
    checks.push({ id: 'locked', label: 'Locked accounts', status: 'pass', detail: 'No locked organizations' });
  }

  checks.push({
    id: 'stripe',
    label: 'Stripe configuration',
    status: process.env.STRIPE_SECRET_KEY ? 'pass' : 'warn',
    detail: process.env.STRIPE_SECRET_KEY ? 'Stripe secret key configured' : 'STRIPE_SECRET_KEY not set',
  });

  checks.push({
    id: 'signup',
    label: 'Public sign-ups',
    status: settings.signupEnabled ? 'pass' : 'warn',
    detail: settings.signupEnabled ? 'New sign-ups enabled' : 'Sign-ups disabled in platform settings',
  });

  checks.push({
    id: 'maintenance',
    label: 'Maintenance mode',
    status: settings.maintenanceMode ? 'warn' : 'pass',
    detail: settings.maintenanceMode ? 'Maintenance mode is ON' : 'Platform operating normally',
  });

  const creators = await listPlatformCreatorAccounts();
  checks.push({
    id: 'creators',
    label: 'Creator accounts',
    status: creators.length > 0 ? 'pass' : 'warn',
    detail: creators.length > 0 ? `${creators.length} creator account(s) matched` : 'No creator accounts matched env allow-list',
  });

  return checks;
}
