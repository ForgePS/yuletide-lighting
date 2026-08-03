import {
  emitPortalMagicTelemetry,
  generatePortalAccessToken,
  magicAccessFingerprint,
  portalMagicCredentialWriteFields,
  resolvePortalMagicAccess,
} from './portal-magic-access';
import type {
  CustomerPortalSettings,
  PortalAccount,
  PortalAccountStatus,
  PortalAction,
  PortalCustomerPublic,
  PortalFeatureKey,
  PortalNotification,
  PortalOrgPublic,
  PortalTimelineEvent,
  PortalUser,
  PortalUserRole,
  PortalUserStatus,
} from '@clcrm/types';
import {
  DEFAULT_PORTAL_FEATURES,
  PHASE1_ACTIVE_PORTAL_FEATURES,
  resolvePortalPermission,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefinedDeep } from './firestore-utils';
import {
  colCreate,
  colGet,
  colList,
  colUpdate,
  getOrganization,
  type CustomerRecord,
} from './firestore';
import { getBrandingForCustomerFacing, getPortalSettings } from './settings360';
import { createServiceIssue360 } from './service-issues';
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

/** Staff/public-safe portal account — never includes raw token, hash, or portalToken. */
export type SanitizedPortalAccountDto = {
  id: string;
  customerId: string;
  portalEnabled: boolean;
  status: PortalAccountStatus;
  invitedAt?: Date | null;
  lastLoginAt?: Date | null;
  updatedAt?: Date;
  sessionVersion: number;
  credentialConfigured: boolean;
  credentialFingerprint?: string | null;
};

export function toSanitizedPortalAccountDto(account: PortalAccount): SanitizedPortalAccountDto {
  return {
    id: account.id,
    customerId: account.customerId,
    portalEnabled: account.portalEnabled,
    status: account.status,
    invitedAt: account.invitedAt ?? null,
    lastLoginAt: account.lastLoginAt ?? null,
    updatedAt: account.updatedAt,
    sessionVersion: account.sessionVersion ?? 0,
    credentialConfigured: Boolean(account.accessTokenHash || account.accessToken),
    credentialFingerprint: magicAccessFingerprint(account.accessTokenHash),
  };
}

export function toPublicCustomer(customer: CustomerRecord): PortalCustomerPublic {
  return {
    id: customer.id,
    firstName: customer.firstName ?? null,
    lastName: customer.lastName ?? null,
    businessName: customer.businessName ?? null,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
  };
}

/**
 * Canonical customer-scoped portal query (P2-S4).
 * Fail closed: never scan the organization collection and filter in memory.
 */
async function colListByCustomerId<T extends { id: string }>(
  orgId: string,
  collection: string,
  customerId: string,
): Promise<T[]> {
  if (!orgId || !customerId) return [];
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/${collection}`)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data() }) as T);
}

/** Customer-scoped calendar events — no organization-wide read. */
async function listPortalCalendarEventsForCustomer(
  orgId: string,
  customerId: string,
  limit = 100,
): Promise<
  Array<{
    id: string;
    customerId?: string;
    title: string;
    appointmentType: string;
    category?: string;
    startAt: Date;
    endAt: Date;
    propertyAddress?: string | null;
    propertyId?: string | null;
    jobId?: string | null;
    dispatchStatus: string;
  }>
> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/calendarEvents`)
    .where('customerId', '==', customerId)
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const mapped = mapTimestampsFromData({ id: d.id, ...d.data() }) as Record<string, unknown>;
    return {
      id: String(mapped.id),
      customerId: mapped.customerId ? String(mapped.customerId) : undefined,
      title: String(mapped.title ?? 'Event'),
      appointmentType: String(mapped.appointmentType ?? 'other'),
      category: mapped.category ? String(mapped.category) : undefined,
      startAt:
        mapped.startAt instanceof Date
          ? mapped.startAt
          : new Date(String(mapped.startAt ?? Date.now())),
      endAt:
        mapped.endAt instanceof Date ? mapped.endAt : new Date(String(mapped.endAt ?? Date.now())),
      propertyAddress: (mapped.propertyAddress as string | null) ?? null,
      propertyId: (mapped.propertyId as string | null) ?? null,
      jobId: (mapped.jobId as string | null) ?? null,
      dispatchStatus: String(mapped.dispatchStatus ?? 'scheduled'),
    };
  });
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
  const platformModules = platform.availableModules?.length ? platform.availableModules : [];
  const portalOffered = platformModules.length === 0 || platformModules.includes('customer_portal');
  // Org-level deny only when modules are explicitly set AND portal key is present in platform but omitted from org.
  // Soft migration: orgs whose module lists predate `customer_portal` keep access when settings.enabled.
  const orgHasLegacyModuleList =
    enabledModules.length > 0 && !enabledModules.includes('customer_portal');
  const orgAllowsPortal =
    enabledModules.length === 0 ||
    enabledModules.includes('customer_portal') ||
    orgHasLegacyModuleList;

  const moduleEnabled = Boolean(settings.enabled && portalOffered && orgAllowsPortal);
  const available = (
    platform.availablePortalFeatures?.length
      ? platform.availablePortalFeatures
      : DEFAULT_PORTAL_FEATURES
  ) as PortalFeatureKey[];

  // Explicit tenant enabledFeatures is authoritative (P2-S5). Soft-enable newly shipped
  // surfaces only when the tenant has not saved an explicit feature list (legacy default path).
  const hasExplicitFeatureList = Boolean(settings.enabledFeatures?.length);
  const stored = (
    hasExplicitFeatureList ? settings.enabledFeatures! : PHASE1_ACTIVE_PORTAL_FEATURES
  ) as PortalFeatureKey[];

  const newlyShipped: PortalFeatureKey[] = [
    'agreements',
    'e_sign',
    'documents',
    'storage',
    'messaging',
    'reviews',
    'referrals',
    'consultations',
    'takedowns',
  ];
  const tenantRequested = (
    hasExplicitFeatureList
      ? stored
      : Array.from(new Set([...stored, ...newlyShipped.filter((f) => available.includes(f))]))
  ) as PortalFeatureKey[];

  const enabled = moduleEnabled ? tenantRequested.filter((f) => available.includes(f)) : [];

  return { moduleEnabled, available, enabled, settings };
}

export function portalHasFeature(enabled: PortalFeatureKey[], feature: PortalFeatureKey) {
  return enabled.includes(feature);
}

/** Typed public-safe feature denial (no entitlement internals). */
export class PortalFeatureNotEnabledError extends Error {
  readonly code = 'PORTAL_FEATURE_NOT_ENABLED' as const;
  constructor(feature?: PortalFeatureKey) {
    super('PORTAL_FEATURE_NOT_ENABLED');
    this.name = 'PortalFeatureNotEnabledError';
    void feature;
  }
}

/** Typed public-safe permission denial (no role matrix internals). */
export class PortalActionNotPermittedError extends Error {
  readonly code = 'PORTAL_ACTION_NOT_PERMITTED' as const;
  readonly reason: string;
  constructor(reason = 'action_not_permitted') {
    super('PORTAL_ACTION_NOT_PERMITTED');
    this.name = 'PortalActionNotPermittedError';
    this.reason = reason;
  }
}

export class PortalAccessDeniedError extends Error {
  readonly code = 'PORTAL_ACCESS_DENIED' as const;
  constructor() {
    super('Invalid portal access');
    this.name = 'PortalAccessDeniedError';
  }
}

export function requirePortalFeatureEnabled(
  enabled: PortalFeatureKey[],
  feature: PortalFeatureKey,
): void {
  if (!portalHasFeature(enabled, feature)) {
    throw new PortalFeatureNotEnabledError(feature);
  }
}

export function assertPortalUserAction(args: {
  role: PortalUserRole | null | undefined;
  feature: PortalFeatureKey;
  action: PortalAction;
  accountStatus: PortalAccountStatus;
  userStatus: PortalUserStatus | null | undefined;
  featureEnabled: boolean;
}): void {
  if (!args.role || !args.userStatus) {
    throw new PortalActionNotPermittedError('user_inactive');
  }
  const decision = resolvePortalPermission({
    role: args.role,
    feature: args.feature,
    action: args.action,
    accountStatus: args.accountStatus,
    userStatus: args.userStatus,
    featureEnabled: args.featureEnabled,
  });
  if (!decision.allowed) {
    if (decision.reason === 'feature_disabled') {
      throw new PortalFeatureNotEnabledError(args.feature);
    }
    throw new PortalActionNotPermittedError(decision.reason);
  }
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

export type PortalAuthorizedContext = PortalAccessContext & {
  /** Server-resolved acting portal user — never client-selected. */
  actingUser: PortalUser;
};

/** Magic token and/or dedicated portal session cookie (P2-S2). */
export type PortalAuthInput = {
  token?: string | null;
  sessionToken?: string | null;
};

export function asPortalAuth(input: string | PortalAuthInput): PortalAuthInput {
  return typeof input === 'string' ? { token: input } : input;
}

/**
 * Canonical portal authorization gate (P2-S1).
 * Resolves magic-token access and/or verified portal session, then fail-closed
 * permission check via resolvePortalPermission. Client cannot supply role/org/customer.
 */
async function resolvePortalAuthorizedContext(args: {
  token?: string | null;
  sessionToken?: string | null;
}): Promise<PortalAccessContext | null> {
  if (args.token) {
    const viaMagicToken = await requirePortalAccess(args.token);
    if (viaMagicToken) return viaMagicToken;
  }
  if (!args.sessionToken) return null;

  const { verifyPortalSessionTokenServer } = await import('./portal-session');
  const session = await verifyPortalSessionTokenServer(args.sessionToken);
  if (!session) return null;

  const account = await getPortalAccount(session.organizationId, session.portalAccountId);
  const acting = await getPortalUser(session.organizationId, session.portalUserId);
  if (
    !account?.portalEnabled ||
    account.customerId !== session.customerId ||
    !acting ||
    acting.portalAccountId !== account.id ||
    acting.customerId !== session.customerId ||
    acting.revokedAt
  ) {
    return null;
  }

  // P2-S7: session path must not require stored plaintext magic token.
  const viaSession = await buildPortalAccessContext({
    orgId: session.organizationId,
    account,
    accessToken: '',
    primaryUserOverride: acting,
  });
  if (!viaSession) return null;
  return { ...viaSession, primaryUser: acting };
}

export async function requirePortalAuthorized(args: {
  token?: string | null;
  sessionToken?: string | null;
  feature: PortalFeatureKey;
  action: PortalAction;
  /** Extra tenant settings gate (e.g. allowServiceRequests). Default true. */
  settingsAllows?: boolean | ((settings: CustomerPortalSettings) => boolean);
}): Promise<PortalAuthorizedContext> {
  const ctx = await resolvePortalAuthorizedContext(args);
  if (!ctx) throw new PortalAccessDeniedError();

  const actingUser = ctx.primaryUser;
  if (!actingUser || actingUser.revokedAt) {
    throw new PortalAccessDeniedError();
  }

  const settingsAllows =
    typeof args.settingsAllows === 'function'
      ? args.settingsAllows(ctx.settings)
      : args.settingsAllows !== false;
  const featureEnabled = settingsAllows && portalHasFeature(ctx.enabledFeatures, args.feature);

  const accountStatus: PortalAccountStatus = ctx.account?.status ?? 'active';

  assertPortalUserAction({
    role: actingUser.role,
    feature: args.feature,
    action: args.action,
    accountStatus,
    userStatus: actingUser.status,
    featureEnabled,
  });

  return { ...ctx, actingUser };
}

async function buildPortalAccessContext(args: {
  orgId: string;
  account: PortalAccount;
  /** Presented raw magic token for session exchange only; empty for session-only auth. */
  accessToken?: string;
  primaryUserOverride?: PortalUser | null;
}): Promise<PortalAccessContext | null> {
  const { orgId, account } = args;
  if (
    !account.portalEnabled ||
    account.status === 'locked' ||
    account.status === 'suspended' ||
    account.status === 'archived' ||
    account.revokedAt
  ) {
    return null;
  }
  const customer = await colGet<CustomerRecord>(orgId, 'customers', account.customerId);
  if (!customer) return null;

  const features = await resolvePortalFeatures(orgId);
  if (!features.moduleEnabled || !portalHasFeature(features.enabled, 'dashboard')) {
    return null;
  }

  const [organization, branding, primaryUser] = await Promise.all([
    getOrganization(orgId),
    getBrandingForCustomerFacing(orgId),
    args.primaryUserOverride
      ? Promise.resolve(args.primaryUserOverride)
      : account.primaryPortalUserId
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
    // Never rehydrate plaintext from Firestore — only echo presented token when provided.
    accessToken: args.accessToken ?? '',
  };
}

export async function requirePortalAccess(token: string): Promise<PortalAccessContext | null> {
  // P2-S7: canonical hash-first resolver (+ centralized legacy plaintext compatibility).
  const resolved = await resolvePortalMagicAccess(token);
  if (!resolved) return null;
  return buildPortalAccessContext({
    orgId: resolved.orgId,
    account: resolved.account,
    accessToken: resolved.rawTokenPresented,
  });
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
      ? {
          ...organization,
          companyName: branding.companyName,
          brandColor: branding.brandColor,
          logoUrl: branding.logoUrl,
        }
      : null,
    settings: ctx.settings,
  };
}

export async function getPortalAccountByCustomer(
  orgId: string,
  customerId: string,
): Promise<PortalAccount | null> {
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

export async function getPortalAccount(
  orgId: string,
  portalAccountId: string,
): Promise<PortalAccount | null> {
  return colGet<PortalAccount>(orgId, 'portalAccounts', portalAccountId);
}

export async function getPortalUser(
  orgId: string,
  portalUserId: string,
): Promise<PortalUser | null> {
  return colGet<PortalUser>(orgId, 'portalUsers', portalUserId);
}

/** Bump session versions so existing portal cookies are rejected. */
export async function invalidatePortalSessions(
  orgId: string,
  args: { portalAccountId: string; portalUserId?: string | null; actorId?: string | null },
): Promise<void> {
  const account = await getPortalAccount(orgId, args.portalAccountId);
  if (!account) return;
  const nextAccountVersion = (account.sessionVersion ?? 0) + 1;
  await colUpdate(orgId, 'portalAccounts', account.id, {
    sessionVersion: nextAccountVersion,
    updatedBy: args.actorId ?? null,
  });
  if (args.portalUserId) {
    const user = await getPortalUser(orgId, args.portalUserId);
    if (user) {
      await colUpdate(orgId, 'portalUsers', user.id, {
        sessionVersion: (user.sessionVersion ?? 0) + 1,
        updatedBy: args.actorId ?? null,
      });
    }
  } else {
    const db = getAdminFirestore();
    const snap = await db
      .collection(`organizations/${orgId}/portalUsers`)
      .where('portalAccountId', '==', account.id)
      .get();
    await Promise.all(
      snap.docs.map((doc) =>
        colUpdate(orgId, 'portalUsers', doc.id, {
          sessionVersion: ((doc.data().sessionVersion as number) ?? 0) + 1,
          updatedBy: args.actorId ?? null,
        }),
      ),
    );
  }
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
  let customer: CustomerRecord | null = null;
  const customerLookupAttempts = process.env.FIRESTORE_EMULATOR_HOST ? 20 : 1;
  for (let attempt = 0; attempt < customerLookupAttempts; attempt++) {
    customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
    if (customer) break;
    if (process.env.FIRESTORE_EMULATOR_HOST && attempt < customerLookupAttempts - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (!customer) throw new Error('Customer not found');

  let existing = await getPortalAccountByCustomer(orgId, customerId);
  const now = new Date();
  /** Raw token returned once for enable/rotate delivery — never persisted after S7. */
  let issuedRaw: string | null = opts?.token?.trim() || null;

  if (!existing) {
    issuedRaw = issuedRaw || generatePortalAccessToken();
    const fields = portalMagicCredentialWriteFields(issuedRaw);
    const created = await colCreate(orgId, 'portalAccounts', {
      customerId,
      organizationId: orgId,
      portalEnabled: opts?.portalEnabled ?? customer.portalEnabled ?? false,
      status: opts?.status ?? (customer.portalEnabled ? 'active' : 'not_invited'),
      accessToken: null,
      accessTokenHash: fields.accessTokenHash,
      accessTokenHashVersion: fields.accessTokenHashVersion,
      primaryPortalUserId: null,
      invitedAt: customer.portalInviteSentAt ?? null,
      activatedAt: customer.portalEnabled ? now : null,
      suspendedAt: null,
      lastLoginAt: customer.portalLastLoginAt ?? null,
    });
    existing = (await colGet<PortalAccount>(orgId, 'portalAccounts', created.id))!;
    await colUpdate(orgId, 'customers', customerId, { portalToken: null });
    emitPortalMagicTelemetry('portal.magic_token.created', {
      organizationId: orgId,
      customerId,
      portalAccountId: existing.id,
    });
  } else if (opts?.token || opts?.status != null || opts?.portalEnabled != null) {
    const patch: Record<string, unknown> = stripUndefinedDeep({
      status: opts?.status ?? existing.status,
      portalEnabled: opts?.portalEnabled ?? existing.portalEnabled,
    });
    if (opts?.token) {
      issuedRaw = opts.token.trim();
      const fields = portalMagicCredentialWriteFields(issuedRaw);
      patch.accessToken = null;
      patch.accessTokenHash = fields.accessTokenHash;
      patch.accessTokenHashVersion = fields.accessTokenHashVersion;
      await colUpdate(orgId, 'customers', customerId, { portalToken: null });
    }
    await colUpdate(orgId, 'portalAccounts', existing.id, patch);
    existing = (await colGet<PortalAccount>(orgId, 'portalAccounts', existing.id))!;
  }

  let user = await getPrimaryPortalUser(orgId, customerId);
  if (!user) {
    let contactId: string | null = null;
    let displayName =
      customer.businessName ||
      `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
      'Account owner';
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
      normalizedEmail: email ? String(email).trim().toLowerCase() : null,
      invitationStatus: 'none',
      failedVerificationCount: 0,
      sessionVersion: 0,
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
        await colUpdate(
          orgId,
          'portalUsers',
          user.id,
          stripUndefinedDeep({
            contactId: primary.id,
            email: user.email ?? primary.email ?? null,
            displayName:
              user.displayName ||
              `${primary.firstName ?? ''} ${primary.lastName ?? ''}`.trim() ||
              undefined,
          }),
        );
        user = { ...user, contactId: primary.id };
      }
    } catch {
      // Best-effort backfill
    }
  }

  // Existing accounts without a new issue: do not invent a retrievable raw token from storage.
  const token = issuedRaw ?? '';
  return { account: existing, user, token };
}

export async function ensureCustomerPortalToken(
  orgId: string,
  customerId: string,
): Promise<string> {
  const { token } = await ensurePortalAccount(orgId, customerId);
  return token;
}

export async function enableCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{
  token: string;
  accessUrl: string;
  credential: { token: string; accessUrl: string };
  account: SanitizedPortalAccountDto;
}> {
  const features = await resolvePortalFeatures(orgId);
  if (!features.moduleEnabled && !features.settings.enabled) {
    throw new Error('Customer Portal is disabled for this organization');
  }
  // Allow enable when settings.enabled even if module list is legacy-empty; block if settings off
  if (!features.settings.enabled) {
    throw new Error('Customer Portal is disabled in organization settings');
  }

  const now = new Date();
  // Mint a fresh hash-only credential on enable (raw returned once).
  const rawToken = generatePortalAccessToken();
  const { account, token } = await ensurePortalAccount(orgId, customerId, {
    token: rawToken,
    portalEnabled: true,
    status: 'active',
  });

  await colUpdate(orgId, 'customers', customerId, {
    portalEnabled: true,
    portalInviteSentAt: now,
    portalToken: null,
  });
  await colUpdate(orgId, 'portalAccounts', account.id, {
    portalEnabled: true,
    status: 'active',
    invitedAt: now,
    activatedAt: now,
    suspendedAt: null,
    revokedAt: null,
    revokedBy: null,
  });

  await createPortalTimelineEvent(orgId, {
    customerId,
    eventType: 'portal_enabled',
    title: 'Portal access enabled',
    description: 'Your customer portal is ready.',
    customerVisible: true,
    occurredAt: now,
  });

  await logCustomerActivity(
    orgId,
    customerId,
    'email_sent',
    'Customer portal access enabled',
    userId,
    'System',
  );
  const fresh = (await colGet<PortalAccount>(orgId, 'portalAccounts', account.id))!;
  const accessUrl = portalAccessUrl(token);
  return {
    token,
    accessUrl,
    credential: { token, accessUrl },
    account: toSanitizedPortalAccountDto(fresh),
  };
}

export async function revokeCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<PortalAccount | null> {
  const account = await getPortalAccountByCustomer(orgId, customerId);
  // Clear legacy plaintext so fallback cannot restore access after revoke.
  await colUpdate(orgId, 'customers', customerId, { portalEnabled: false, portalToken: null });
  if (account) {
    await colUpdate(orgId, 'portalAccounts', account.id, {
      portalEnabled: false,
      status: 'archived',
      revokedAt: new Date(),
      revokedBy: userId ?? null,
      accessToken: null,
      // Keep accessTokenHash so we can detect rotated/revoked hash mismatch vs stale plaintext.
    });
    await invalidatePortalSessions(orgId, { portalAccountId: account.id, actorId: userId });
    emitPortalMagicTelemetry('portal.magic_token.revoked', {
      organizationId: orgId,
      customerId,
      portalAccountId: account.id,
    });
  }
  await logCustomerActivity(
    orgId,
    customerId,
    'note_added',
    'Customer portal access revoked',
    userId,
    'System',
  );
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
    suspendedBy: userId ?? null,
  });
  await colUpdate(orgId, 'customers', customerId, { portalEnabled: false });
  await invalidatePortalSessions(orgId, {
    portalAccountId: account.account.id,
    actorId: userId,
  });
  await logCustomerActivity(
    orgId,
    customerId,
    'note_added',
    'Customer portal suspended',
    userId,
    'System',
  );
  return colGet<PortalAccount>(orgId, 'portalAccounts', account.account.id);
}

export async function rotatePortalAccessToken(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{
  token: string;
  accessUrl: string;
  credential: { token: string; accessUrl: string };
  account: SanitizedPortalAccountDto;
}> {
  const token = generatePortalAccessToken();
  const fields = portalMagicCredentialWriteFields(token);
  const { account } = await ensurePortalAccount(orgId, customerId, {
    token,
    portalEnabled: true,
    status: 'active',
  });
  await colUpdate(orgId, 'customers', customerId, { portalToken: null, portalEnabled: true });
  await colUpdate(orgId, 'portalAccounts', account.id, {
    accessToken: null,
    accessTokenHash: fields.accessTokenHash,
    accessTokenHashVersion: fields.accessTokenHashVersion,
    portalEnabled: true,
    status: 'active',
    revokedAt: null,
    revokedBy: null,
  });
  await invalidatePortalSessions(orgId, { portalAccountId: account.id, actorId: userId });
  emitPortalMagicTelemetry('portal.magic_token.rotated', {
    organizationId: orgId,
    customerId,
    portalAccountId: account.id,
  });
  await logCustomerActivity(
    orgId,
    customerId,
    'note_added',
    'Customer portal access link rotated',
    userId,
    'System',
  );
  const fresh = (await colGet<PortalAccount>(orgId, 'portalAccounts', account.id))!;
  const accessUrl = portalAccessUrl(token);
  return {
    token,
    accessUrl,
    credential: { token, accessUrl },
    account: toSanitizedPortalAccountDto(fresh),
  };
}

/** Bump session versions for all users on a portal account (logout-all). */
export async function logoutAllPortalSessions(
  orgId: string,
  customerId: string,
  actorId?: string | null,
): Promise<{ sessionVersion: number }> {
  const account = await getPortalAccountByCustomer(orgId, customerId);
  if (!account) throw new Error('Portal account not found');
  await invalidatePortalSessions(orgId, { portalAccountId: account.id, actorId });
  const fresh = await getPortalAccount(orgId, account.id);
  return { sessionVersion: fresh?.sessionVersion ?? 0 };
}

/** Staff role change — invalidates sessions so role/entitlements refresh. */
export async function changePortalUserRole(
  orgId: string,
  portalUserId: string,
  role: PortalUserRole,
  actorId?: string | null,
): Promise<PortalUser | null> {
  if (
    ![
      'account_owner',
      'authorized_contact',
      'billing_contact',
      'property_contact',
      'view_only',
    ].includes(role)
  ) {
    throw new Error('Invalid portal role');
  }
  const user = await getPortalUser(orgId, portalUserId);
  if (!user) return null;
  await colUpdate(orgId, 'portalUsers', user.id, {
    role,
    updatedBy: actorId ?? null,
  });
  await invalidatePortalSessions(orgId, {
    portalAccountId: user.portalAccountId,
    portalUserId: user.id,
    actorId,
  });
  await logCustomerActivity(
    orgId,
    user.customerId,
    'note_added',
    'Portal user role changed',
    actorId,
    'System',
  );
  return getPortalUser(orgId, user.id);
}

export async function getStaffPortalAccountView(orgId: string, customerId: string) {
  const customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
  if (!customer) return null;
  let account = await getPortalAccountByCustomer(orgId, customerId);
  if (!account && (customer.portalToken || customer.portalEnabled)) {
    const ensured = await ensurePortalAccount(orgId, customerId);
    account = ensured.account;
  }
  const sanitized = account ? toSanitizedPortalAccountDto(account) : null;
  // P2-S7A: never return raw token / magic URL from normal staff reads.
  return {
    account: sanitized,
    enabled: account?.portalEnabled ?? customer.portalEnabled ?? false,
    status: account?.status ?? (customer.portalEnabled ? 'active' : 'not_invited'),
    inviteSentAt: account?.invitedAt ?? customer.portalInviteSentAt ?? null,
    lastLoginAt: account?.lastLoginAt ?? customer.portalLastLoginAt ?? null,
    credentialExists: sanitized?.credentialConfigured ?? false,
    credentialConfigured: sanitized?.credentialConfigured ?? false,
    credentialFingerprint: sanitized?.credentialFingerprint ?? null,
    accessUrl: null,
    accessLinkPlaceholder: `${(process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')}/portal/login`,
  };
}

export async function backfillPortalAccountsForOrg(
  orgId: string,
): Promise<{ created: number; skipped: number }> {
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

export async function recordPortalLogin(
  orgId: string,
  customerId: string,
  accountId?: string | null,
) {
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

export async function listPortalTimeline(
  auth: string | PortalAuthInput,
  limit = 20,
): Promise<PortalTimelineEvent[]> {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'dashboard',
    action: 'view',
  });
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(`organizations/${ctx.organizationId}/portalTimelineEvents`)
      .where('customerId', '==', ctx.customer.id)
      .where('customerVisible', '==', true)
      .orderBy('occurredAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const row = mapTimestampsFromData({ id: d.id, ...d.data() }) as Record<string, unknown>;
      return {
        id: d.id,
        organizationId: ctx.organizationId,
        customerId: ctx.customer.id,
        propertyId: (row.propertyId as string | null) ?? null,
        eventType: String(row.eventType ?? 'activity'),
        title: String(row.title ?? 'Activity'),
        description: (row.description as string | null) ?? null,
        relatedRecordType: (row.relatedRecordType as string | null) ?? null,
        relatedRecordId: (row.relatedRecordId as string | null) ?? null,
        customerVisible: row.customerVisible === true,
        occurredAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(0),
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(0),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(0),
      };
    });
  } catch {
    // Fail closed — do not broaden to organization scans when index/query fails.
    return [];
  }
}

export async function listPortalNotifications(
  auth: string | PortalAuthInput,
  limit = 20,
): Promise<PortalNotification[]> {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'dashboard',
    action: 'view',
  });
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collection(`organizations/${ctx.organizationId}/portalNotifications`)
      .where('portalUserId', '==', ctx.actingUser.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const row = mapTimestampsFromData({ id: d.id, ...d.data() }) as Record<string, unknown>;
      return {
        id: d.id,
        organizationId: ctx.organizationId,
        portalUserId: ctx.actingUser.id,
        customerId: ctx.customer.id,
        category: String(row.category ?? 'account'),
        title: String(row.title ?? 'Notification'),
        body: String(row.body ?? ''),
        actionUrl: (row.actionUrl as string | null) ?? null,
        readAt: row.readAt instanceof Date ? row.readAt : null,
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(0),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(0),
      };
    });
  } catch {
    // Fail closed — do not scan organization notifications.
    return [];
  }
}

export async function markPortalNotificationRead(
  auth: string | PortalAuthInput,
  notificationId: string,
) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'dashboard',
    action: 'view',
  });
  const note = await colGet<PortalNotification & { customerId?: string }>(
    ctx.organizationId,
    'portalNotifications',
    notificationId,
  );
  if (
    !note ||
    note.portalUserId !== ctx.actingUser.id ||
    (note.customerId != null && note.customerId !== ctx.customer.id)
  ) {
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }
  await colUpdate(ctx.organizationId, 'portalNotifications', notificationId, {
    readAt: new Date(),
  });
  return { success: true };
}

export type PortalDashboardPublic = {
  organizationId: string;
  customer: PortalCustomerPublic;
  organization: PortalOrgPublic | null;
  settings: Pick<
    CustomerPortalSettings,
    | 'portalPrimaryColor'
    | 'portalLogoUrl'
    | 'allowOnlinePayments'
    | 'allowServiceRequests'
    | 'allowSelfScheduling'
    | 'permissions'
  >;
  enabledFeatures: PortalFeatureKey[];
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
  properties: Array<{
    id: string;
    label: string;
    addressLine1: string;
    city: string;
    state: string;
  }>;
  timeline: PortalTimelineEvent[];
  notifications: PortalNotification[];
  featureDisabledMessage?: string | null;
};

export async function getPortalDashboard(
  auth: string | PortalAuthInput,
): Promise<PortalDashboardPublic | null> {
  const creds = asPortalAuth(auth);
  let ctx: PortalAuthorizedContext;
  try {
    ctx = await requirePortalAuthorized({ ...creds, feature: 'dashboard', action: 'view' });
  } catch (error) {
    if (error instanceof PortalAccessDeniedError) return null;
    throw error;
  }

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
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(
          organizationId,
          'proposals',
          customer.id,
        )
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'billing')
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(
          organizationId,
          'invoices',
          customer.id,
        )
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'scheduling')
      ? listPortalCalendarEventsForCustomer(organizationId, customer.id, 100)
      : Promise.resolve([]),
    portalHasFeature(enabledFeatures, 'install_tracking')
      ? colListByCustomerId<Record<string, unknown> & { id: string }>(
          organizationId,
          'jobs',
          customer.id,
        )
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
    listPortalTimeline(auth, 10),
    listPortalNotifications(auth, 10),
  ]);

  const proposals = proposalsRaw
    .map((p) => ({
      id: String(p.id),
      title: String(p.title ?? 'Proposal'),
      status: String(p.status ?? 'draft'),
      subtotalCents: Number(p.subtotalCents ?? 0),
      publicToken: (p.publicToken as string) ?? null,
      installDate:
        p.installDate instanceof Date
          ? p.installDate
          : p.installDate
            ? new Date(String(p.installDate))
            : null,
      removalDate:
        p.removalDate instanceof Date
          ? p.removalDate
          : p.removalDate
            ? new Date(String(p.removalDate))
            : null,
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

  const schedule = (
    events as Array<{
      id: string;
      customerId?: string;
      title: string;
      appointmentType: string;
      startAt: Date;
      endAt: Date;
      propertyAddress?: string | null;
      dispatchStatus: string;
    }>
  )
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
    scheduledStart:
      j.scheduledStart instanceof Date
        ? j.scheduledStart
        : j.scheduledStart
          ? new Date(String(j.scheduledStart))
          : null,
    scheduledEnd:
      j.scheduledEnd instanceof Date
        ? j.scheduledEnd
        : j.scheduledEnd
          ? new Date(String(j.scheduledEnd))
          : null,
  }));

  const mockups = mockupsRaw.map((m) => ({
    id: m.id,
    name: m.name,
    imageUrl: m.imageUrl,
    renderedImageUrl: m.renderedImageUrl ?? null,
    status: m.status,
    approvalToken: m.approvalToken ?? null,
  }));

  const canProposals =
    portalHasFeature(enabledFeatures, 'proposals') && settings.permissions.viewProposals;
  const canInvoices =
    portalHasFeature(enabledFeatures, 'billing') && settings.permissions.viewInvoices;
  const canMockups = portalHasFeature(enabledFeatures, 'mockups');
  const canPay =
    portalHasFeature(enabledFeatures, 'online_payments') && settings.allowOnlinePayments;

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
  auth: string | PortalAuthInput,
  input: {
    title: string;
    description?: string;
    category?: string;
    propertyId?: string;
    priority?: import('@clcrm/types').ServiceIssuePriority;
    accessInstructions?: string;
    locationNote?: string;
    photoUrls?: string[];
    idempotencyKey?: string;
  },
) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'service_requests',
    action: 'create',
    settingsAllows: (settings) =>
      settings.allowServiceRequests && settings.permissions.requestService,
  });
  const { getPortalResourceScope } = await import('./portal-ownership');
  const { withPortalIdempotency } = await import('./portal-mutation');
  const scope = getPortalResourceScope(ctx);

  const { result } = await withPortalIdempotency({
    scope,
    action: 'service_request.create',
    resourceId: 'new',
    clientKey: input.idempotencyKey,
    execute: async () => {
      const customerName =
        ctx.customer.businessName ||
        `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim() ||
        'Customer';

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
      ]
        .filter(Boolean)
        .join('\n\n');

      const photoUrls = (
        await Promise.all(
          (input.photoUrls ?? [])
            .slice(0, 6)
            .map((url) =>
              resolvePortalPhotoUrlForPersist(ctx.organizationId, ctx.customer.id, url),
            ),
        )
      ).filter((u): u is string => !!u);

      const issue = await createServiceIssue360(ctx.organizationId, {
        customerId: ctx.customer.id,
        customerName,
        propertyId: input.propertyId ?? '',
        propertyLabel: propertyLabel ?? '',
        title: input.title,
        description: details,
        category:
          (input.category as import('@clcrm/types').ServiceIssueCategory) ?? 'customer_request',
        priority: input.priority ?? 'normal',
        status: 'reported',
        warranty: false,
        photoUrls,
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

      return { id: issue.id, status: issue.status ?? 'reported' };
    },
  });

  return result;
}

async function resolvePortalPhotoUrlForPersist(
  organizationId: string,
  customerId: string,
  raw: string,
): Promise<string | null> {
  const value = raw.trim();
  if (!value) return null;
  const { verifyPortalFileTicket, resolvePortalStoragePath, assertSafePortalStoragePath } =
    await import('./portal-file-access');
  // Accept short-lived portal tickets and persist durable staff-proxy path (not public ACL).
  if (value.includes('/api/portal/files') && value.includes('ticket=')) {
    try {
      const url = value.startsWith('http') ? new URL(value) : new URL(value, 'http://portal.local');
      const ticket = url.searchParams.get('ticket');
      if (!ticket) return null;
      const payload = verifyPortalFileTicket(ticket);
      if (!payload) return null;
      if (payload.organizationId !== organizationId || payload.customerId !== customerId) {
        return null;
      }
      return `/api/files?path=${encodeURIComponent(payload.storagePath)}`;
    } catch {
      return null;
    }
  }
  const storagePath = resolvePortalStoragePath(organizationId, value);
  if (!storagePath) return null;
  try {
    assertSafePortalStoragePath(organizationId, customerId, storagePath);
  } catch {
    return null;
  }
  return `/api/files?path=${encodeURIComponent(storagePath)}`;
}

export async function uploadPortalPhoto(
  auth: string | PortalAuthInput,
  input: { dataBase64: string; contentType: string; filename?: string },
): Promise<{ url: string; canPreview: boolean; canDownload: boolean }> {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'service_requests',
    action: 'create',
    settingsAllows: (settings) =>
      settings.allowServiceRequests && settings.permissions.requestService,
  });
  const { getPortalSecurityConfig } = await import('./portal-security-config');
  const { createPortalFileAccess, sanitizePortalFilename } = await import('./portal-file-access');
  const cfg = getPortalSecurityConfig();
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(input.contentType)) {
    throw new Error('Unsupported photo type');
  }
  const buffer = Buffer.from(input.dataBase64, 'base64');
  if (buffer.length < 32) throw new Error('Invalid photo data');
  if (buffer.length > cfg.maxUploadBytes) {
    throw new Error('Photo exceeds maximum upload size');
  }
  const { uploadFile } = await import('./storage');
  const uploaded = await uploadFile(
    ctx.organizationId,
    `portal-service/${ctx.customer.id}`,
    buffer,
    input.contentType,
    sanitizePortalFilename(input.filename ?? `photo-${Date.now()}.jpg`),
  );
  const file = await createPortalFileAccess({
    authorized: ctx,
    fileId: uploaded.path.split('/').pop() ?? 'photo',
    name: sanitizePortalFilename(input.filename ?? 'photo.jpg'),
    contentType: input.contentType,
    size: buffer.length,
    sourceUrlOrPath: uploaded.path,
    visibility: 'customer_visible',
  });
  if (!file.accessUrl) {
    throw new Error('Could not create secure photo access');
  }
  // Public DTO: ticket URL only — never raw Storage path or permanent bucket URL.
  return {
    url: file.accessUrl,
    canPreview: file.canPreview,
    canDownload: file.canDownload,
  };
}

export async function submitPortalRebookRequest(
  auth: string | PortalAuthInput,
  input: {
    notes?: string;
    preferredMonth?: string;
    sameDesign?: boolean;
    upgradeRequested?: boolean;
    idempotencyKey?: string;
  },
) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'rebooking',
    action: 'request',
  });
  const { getPortalResourceScope } = await import('./portal-ownership');
  const { withPortalIdempotency } = await import('./portal-mutation');
  const scope = getPortalResourceScope(ctx);

  const { result, replayed } = await withPortalIdempotency({
    scope,
    action: 'rebooking.request',
    resourceId: ctx.customer.id,
    clientKey: input.idempotencyKey,
    execute: async () => {
      const outcome = await processPortalRebook(ctx.organizationId, ctx.customer.id, {
        sameDesign: input.sameDesign ?? true,
        upgradeRequested: input.upgradeRequested ?? false,
        preferredMonth: input.preferredMonth,
        notes: input.notes,
      });
      return {
        newProposalId: outcome.newProposalId,
        status: outcome.status,
        bookedValueCents: outcome.bookedValueCents,
        replayed: Boolean((outcome as { replayed?: boolean }).replayed),
      };
    },
  });

  if (replayed || result.replayed) {
    return result;
  }

  const body = [
    input.upgradeRequested
      ? 'Customer requested upgrade for next season.'
      : 'Customer rebooked same design for next season.',
    input.preferredMonth ? `Preferred month: ${input.preferredMonth}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: input.upgradeRequested
      ? 'Upgrade request — next season'
      : 'Rebook request — next season',
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
  await logCustomerActivity(
    ctx.organizationId,
    ctx.customer.id,
    'note_added',
    'Rebook submitted via portal',
    null,
    'Portal',
  );
  await createPortalTimelineEvent(ctx.organizationId, {
    customerId: ctx.customer.id,
    eventType: 'rebook_request',
    title: 'Rebook request submitted',
    description: input.upgradeRequested
      ? 'Upgrade requested for next season'
      : 'Same design requested for next season',
    customerVisible: true,
  });

  return { success: true, ...result };
}

export async function getPortalRebookInfo(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'rebooking',
    action: 'view',
  });
  const rebook = await getPortalRebookContext(ctx.organizationId, ctx.customer.id);
  return {
    ...rebook,
    customerName:
      ctx.customer.businessName ||
      `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim(),
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
    if (
      !account?.portalEnabled ||
      account.status === 'suspended' ||
      account.status === 'archived'
    ) {
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

export async function markAllPortalNotificationsRead(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({ ...creds, feature: 'dashboard', action: 'view' });
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${ctx.organizationId}/portalNotifications`)
    .where('portalUserId', '==', ctx.actingUser.id)
    .get();
  const unread = snap.docs.filter((d) => !d.data().readAt);
  await Promise.all(
    unread.map((d) =>
      colUpdate(ctx.organizationId, 'portalNotifications', d.id, { readAt: new Date() }),
    ),
  );
  return { success: true };
}

export async function listPortalContacts(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'dashboard',
    action: 'view',
  });
  const items = await colListByCustomerId<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: string | null;
    title?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }>(ctx.organizationId, 'contacts', ctx.customer.id);
  return items.slice(0, 100).map((c) => ({
    id: c.id,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    role: c.role ?? null,
    title: c.title ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    isPrimary: Boolean(c.isPrimary),
  }));
}

export async function listPortalServiceRequests(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'service_requests',
    action: 'view',
    settingsAllows: (settings) => settings.allowServiceRequests,
  });
  const items = await colListByCustomerId<{
    id: string;
    title?: string;
    status?: string;
    category?: string;
    priority?: string;
    propertyLabel?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }>(ctx.organizationId, 'serviceIssues', ctx.customer.id);
  return items
    .sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0))
    .slice(0, 50)
    .map((i) => ({
      id: i.id,
      title: i.title ?? 'Service request',
      status: i.status ?? 'open',
      category: i.category ?? 'other',
      priority: i.priority ?? 'normal',
      propertyLabel: i.propertyLabel ?? null,
      createdAt: i.createdAt ?? null,
      updatedAt: i.updatedAt ?? null,
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
  const customerName =
    customer.businessName ||
    `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
    'there';

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
  await logCustomerActivity(
    orgId,
    customerId,
    'email_sent',
    `Portal invite emailed to ${email}`,
    userId,
    'System',
  );
  await notifyPortalCustomer(orgId, customerId, {
    category: 'account',
    title: 'Welcome to your portal',
    body: 'Your customer portal is ready. Explore your schedule, proposals, and billing.',
    actionUrl: '#',
  });

  return { sent: true, accessUrl, email };
}

export async function listPortalAgreements(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'agreements',
    action: 'view',
  });
  const items = await colListByCustomerId<{
    id: string;
    title?: string;
    status?: string;
    optionCode?: string | null;
    optionLabel?: string | null;
    startSeason?: number | null;
    endSeason?: number | null;
    annualValueCents?: number | null;
    totalValueCents?: number | null;
    depositPercent?: number | null;
    propertyLabel?: string | null;
    signedAt?: Date | null;
    signedByName?: string | null;
    publicToken?: string | null;
    signedDocumentUrl?: string | null;
  }>(ctx.organizationId, 'multiYearAgreements', ctx.customer.id);
  const { createPortalFileAccess } = await import('./portal-file-access');
  return Promise.all(
    items.slice(0, 100).map(async (a) => {
      const file = a.signedDocumentUrl
        ? await createPortalFileAccess({
            authorized: ctx,
            fileId: `${a.id}-signed`,
            name: `${a.title ?? 'Agreement'}.pdf`,
            contentType: 'application/pdf',
            sourceUrlOrPath: a.signedDocumentUrl,
            visibility: 'customer_visible',
            parent: { collection: 'multiYearAgreements', id: a.id },
          })
        : null;
      return {
        id: a.id,
        title: a.title ?? 'Agreement',
        status: a.status ?? 'draft',
        optionCode: a.optionCode ?? null,
        optionLabel: a.optionLabel ?? null,
        startSeason: a.startSeason ?? null,
        endSeason: a.endSeason ?? null,
        annualValueCents: a.annualValueCents ?? null,
        totalValueCents: a.totalValueCents ?? null,
        depositPercent: a.depositPercent ?? null,
        propertyLabel: a.propertyLabel ?? null,
        signedAt: a.signedAt ?? null,
        signedByName: a.signedByName ?? null,
        publicToken: a.publicToken ?? null,
        signedDocumentUrl: file?.accessUrl ?? null,
        canDownloadSigned: Boolean(file?.canDownload),
      };
    }),
  );
}

export async function listPortalDocuments(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'documents',
    action: 'view',
  });
  const { listCustomerDocuments360 } = await import('./documents360');
  const { createPortalFileAccess } = await import('./portal-file-access');
  const docs = await listCustomerDocuments360(ctx.organizationId, ctx.customer.id);
  const visible = docs.filter((d) => {
    if (!d.url) return false;
    const visibility = String(
      (d as { visibility?: string }).visibility ?? 'customer_visible',
    ).toLowerCase();
    if (visibility !== 'customer_visible') return false;
    const category = String(d.category ?? '').toLowerCase();
    if (category === 'internal' || category === 'staff_only' || category === 'loto') return false;
    return true;
  });
  return Promise.all(
    visible.map(async (d) => {
      const file = await createPortalFileAccess({
        authorized: ctx,
        fileId: d.id,
        name: d.title,
        contentType: 'application/octet-stream',
        category: d.category,
        createdAt: d.createdAt,
        sourceUrlOrPath: d.url,
        visibility: 'customer_visible',
      });
      return {
        id: d.id,
        title: d.title,
        category: d.category,
        createdAt: d.createdAt,
        canPreview: file.canPreview,
        canDownload: file.canDownload,
        url: file.accessUrl,
      };
    }),
  );
}

export async function listPortalStorage(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'storage',
    action: 'view',
  });
  const { listStorageRecords, getStorageRecord } = await import('./storage360');
  const records = await listStorageRecords(ctx.organizationId, ctx.customer.id);
  return Promise.all(
    records.map(async (r) => {
      if (r.customerId !== ctx.customer.id) {
        return null;
      }
      const detail = await getStorageRecord(ctx.organizationId, r.id);
      if (detail && detail.record.customerId !== ctx.customer.id) {
        return null;
      }
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
  ).then((rows) => rows.filter((row): row is NonNullable<typeof row> => row != null));
}

export async function listPortalReviews(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'reviews',
    action: 'view',
  });
  const rows = await colListByCustomerId<{
    id: string;
    status?: string;
    rating?: number | null;
    submittedAt?: Date | null;
    publicToken?: string | null;
    sentAt?: Date | null;
  }>(ctx.organizationId, 'reviewRequests', ctx.customer.id);
  return rows.map((r) => ({
    id: r.id,
    status: r.status ?? 'pending',
    rating: r.rating ?? null,
    submittedAt: r.submittedAt ?? null,
    publicToken: r.publicToken ?? null,
    sentAt: r.sentAt ?? null,
  }));
}

export async function listPortalReferrals(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'referrals',
    action: 'view',
  });
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

export async function getPortalMessages(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'messaging',
    action: 'view',
  });
  const { getConversationByCustomer } = await import('./messages360');
  const { createPortalFileAccess } = await import('./portal-file-access');
  const { conversation, messages } = await getConversationByCustomer(
    ctx.organizationId,
    ctx.customer.id,
  );
  return {
    conversationId: conversation.id,
    messages: await Promise.all(
      messages.map(async (m) => {
        const raw = m.attachmentUrls ?? [];
        const attachments = await Promise.all(
          raw.map(async (url, index) => {
            const file = await createPortalFileAccess({
              authorized: ctx,
              fileId: `${m.id}-att-${index}`,
              name: `attachment-${index + 1}`,
              sourceUrlOrPath: url,
              visibility: 'customer_visible',
              // Conversation is the customer-owned parent (messages are nested).
              parent: { collection: 'conversations', id: conversation.id },
            });
            return file.accessUrl;
          }),
        );
        return {
          id: m.id,
          direction: m.direction,
          channel: m.channel,
          body: m.body,
          createdAt: m.createdAt,
          attachmentUrls: attachments.filter((u): u is string => !!u),
          status: m.status ?? null,
          readAt: m.readAt ?? null,
        };
      }),
    ),
  };
}

export async function sendPortalMessage(
  auth: string | PortalAuthInput,
  body: string,
  opts?: { idempotencyKey?: string },
) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'messaging',
    action: 'message',
  });
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message cannot be empty');

  const { getPortalResourceScope } = await import('./portal-ownership');
  const { withPortalIdempotency } = await import('./portal-mutation');
  const { consumePortalRateLimit, portalRateLimitKey } = await import('./portal-rate-limit');
  const scope = getPortalResourceScope(ctx);
  // Rate limit applies only to new sends (inside execute). Idempotent retries do not consume quota.
  const { result } = await withPortalIdempotency({
    scope,
    action: 'messaging.send',
    resourceId: 'thread',
    clientKey: opts?.idempotencyKey,
    execute: async () => {
      const rate = consumePortalRateLimit(
        portalRateLimitKey([
          'portal-message',
          scope.organizationId,
          scope.customerId,
          scope.portalUserId,
        ]),
        { max: 30, windowMs: 15 * 60 * 1000 },
      );
      if (!rate.allowed) {
        throw new Error('Too many messages. Please wait and try again.');
      }
      const { receivePortalMessage } = await import('./messages360');
      const sent = await receivePortalMessage(ctx.organizationId, {
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
        id: sent.message.id,
        direction: sent.message.direction,
        channel: sent.message.channel,
        body: sent.message.body,
        createdAt: sent.message.createdAt,
        attachmentUrls: sent.message.attachmentUrls ?? [],
        status: sent.message.status ?? null,
        readAt: sent.message.readAt ?? null,
      };
    },
  });
  return result;
}

export async function listPortalProperties(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'properties',
    action: 'view',
  });
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

  const { createPortalFileAccess } = await import('./portal-file-access');
  return Promise.all(
    rows.map(async (p) => {
      const galleryPhotos = await Promise.all(
        (p.galleryPhotos ?? [])
          .filter((g) => !!g?.url)
          .map(async (g) => {
            const file = await createPortalFileAccess({
              authorized: ctx,
              fileId: g.id,
              name: g.label ?? 'Photo',
              contentType: 'image/jpeg',
              sourceUrlOrPath: g.url,
              visibility: 'customer_visible',
              parent: { collection: 'properties', id: p.id },
            });
            return {
              id: g.id,
              url: file.accessUrl,
              label: g.label ?? null,
              canPreview: file.canPreview,
            };
          }),
      );
      return {
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
        galleryPhotos: galleryPhotos.filter((g) => !!g.url),
      };
    }),
  );
}

export async function listPortalConsultations(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'consultations',
    action: 'view',
  });
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

export async function listPortalTakedowns(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'takedowns',
    action: 'view',
  });
  const { inferAppointmentTypeFromJob } = await import('./jobs360');
  type OrgJobRecord = import('./jobs360').OrgJobRecord;
  const [events, jobs] = await Promise.all([
    listPortalCalendarEventsForCustomer(ctx.organizationId, ctx.customer.id, 200),
    colListByCustomerId<OrgJobRecord>(ctx.organizationId, 'jobs', ctx.customer.id),
  ]);

  const fromEvents = events
    .filter((e) => e.appointmentType === 'takedown' || e.category === 'takedown')
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
      scheduledStart:
        j.scheduledStart instanceof Date
          ? j.scheduledStart
          : j.scheduledStart
            ? new Date(String(j.scheduledStart))
            : null,
      scheduledEnd:
        j.scheduledEnd instanceof Date
          ? j.scheduledEnd
          : j.scheduledEnd
            ? new Date(String(j.scheduledEnd))
            : null,
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
  auth: string | PortalAuthInput,
  input: {
    appointmentType:
      | 'estimate_visit'
      | 'design_consultation'
      | 'installation'
      | 'takedown'
      | 'service_call';
    propertyId?: string;
    preferredStartAt?: Date | null;
    preferredEndAt?: Date | null;
    preferredWindows?: string;
    notes?: string;
    idempotencyKey?: string;
  },
) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'scheduling',
    action: 'request',
    settingsAllows: (settings) => settings.allowSelfScheduling,
  });
  const { getPortalResourceScope } = await import('./portal-ownership');
  const { withPortalIdempotency } = await import('./portal-mutation');
  const scope = getPortalResourceScope(ctx);

  const { result } = await withPortalIdempotency({
    scope,
    action: 'scheduling.request',
    resourceId: 'new',
    clientKey: input.idempotencyKey,
    execute: async () => {
      if (input.propertyId) {
        const prop = await colGet<{ customerId?: string }>(
          ctx.organizationId,
          'properties',
          input.propertyId,
        );
        if (!prop || prop.customerId !== ctx.customer.id) {
          throw new Error('Invalid property for this account');
        }
      }

      const label = input.appointmentType.replace(/_/g, ' ');
      const body = [
        `Schedule request: ${label}`,
        input.preferredWindows ? `Preferred windows: ${input.preferredWindows}` : null,
        input.preferredStartAt
          ? `Preferred start: ${new Date(input.preferredStartAt).toISOString()}`
          : null,
        input.preferredEndAt
          ? `Preferred end: ${new Date(input.preferredEndAt).toISOString()}`
          : null,
        input.notes ? `Notes: ${input.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

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
        description:
          input.preferredWindows || input.notes || 'Customer requested an appointment window',
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
    },
  });

  return result;
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
    issuedAt:
      i.issuedAt instanceof Date ? i.issuedAt : i.issuedAt ? new Date(String(i.issuedAt)) : null,
  };
}

function mapPortalProposal(p: Record<string, unknown> & { id: string }) {
  return {
    id: String(p.id),
    title: String(p.title ?? 'Proposal'),
    status: String(p.status ?? 'draft'),
    subtotalCents: Number(p.subtotalCents ?? 0),
    publicToken: (p.publicToken as string) ?? null,
    installDate:
      p.installDate instanceof Date
        ? p.installDate
        : p.installDate
          ? new Date(String(p.installDate))
          : null,
    removalDate:
      p.removalDate instanceof Date
        ? p.removalDate
        : p.removalDate
          ? new Date(String(p.removalDate))
          : null,
  };
}

const CUSTOMER_VISIBLE_MOCKUP_STATUSES = new Set([
  'published',
  'approved',
  'pending_approval',
  'sent',
  'customer_review',
  'in_review',
  'revision_requested',
]);

async function mapPortalMockup(
  ctx: PortalAuthorizedContext,
  m: {
    id: string;
    name: string;
    imageUrl: string;
    renderedImageUrl?: string | null;
    status?: string;
    approvalToken?: string | null;
    visibility?: string | null;
  },
) {
  const status = String(m.status ?? '').toLowerCase();
  const visibility = String(m.visibility ?? 'customer_visible').toLowerCase();
  if (visibility === 'staff_only' || visibility === 'internal' || visibility === 'system') {
    return null;
  }
  // Fail closed for explicitly internal/draft; allow legacy empty status + published set.
  if (status === 'draft' || status === 'internal') {
    return null;
  }
  if (status && !CUSTOMER_VISIBLE_MOCKUP_STATUSES.has(status)) {
    // Unknown non-empty status: deny (do not infer customer visibility).
    return null;
  }

  const { createPortalFileAccess } = await import('./portal-file-access');
  const primary = await createPortalFileAccess({
    authorized: ctx,
    fileId: `${m.id}-image`,
    name: m.name,
    contentType: 'image/jpeg',
    sourceUrlOrPath: m.imageUrl,
    visibility: 'customer_visible',
    parent: { collection: 'mockups', id: m.id },
  });
  const rendered = m.renderedImageUrl
    ? await createPortalFileAccess({
        authorized: ctx,
        fileId: `${m.id}-rendered`,
        name: `${m.name}-rendered`,
        contentType: 'image/jpeg',
        sourceUrlOrPath: m.renderedImageUrl,
        visibility: 'customer_visible',
        parent: { collection: 'mockups', id: m.id },
      })
    : null;

  return {
    id: m.id,
    name: m.name,
    imageUrl: primary.accessUrl,
    renderedImageUrl: rendered?.accessUrl ?? null,
    canPreview: primary.canPreview,
    canDownload: primary.canDownload,
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
    scheduledStart:
      j.scheduledStart instanceof Date
        ? j.scheduledStart
        : j.scheduledStart
          ? new Date(String(j.scheduledStart))
          : null,
    scheduledEnd:
      j.scheduledEnd instanceof Date
        ? j.scheduledEnd
        : j.scheduledEnd
          ? new Date(String(j.scheduledEnd))
          : null,
    propertyId: (j.propertyId as string) ?? null,
  };
}

export async function listPortalInvoices(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'billing',
    action: 'view',
    settingsAllows: (settings) => settings.permissions.viewInvoices,
  });
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'invoices',
    ctx.customer.id,
  );
  return rows
    .map(mapPortalInvoice)
    .sort((a, b) => (b.dueDate?.getTime?.() ?? 0) - (a.dueDate?.getTime?.() ?? 0));
}

export async function listPortalProposals(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'proposals',
    action: 'view',
    settingsAllows: (settings) => settings.permissions.viewProposals,
  });
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'proposals',
    ctx.customer.id,
  );
  return rows.map(mapPortalProposal).sort((a, b) => b.subtotalCents - a.subtotalCents);
}

export async function listPortalMockups(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'mockups',
    action: 'view',
  });
  const rows = await colListByCustomerId<{
    id: string;
    name: string;
    imageUrl: string;
    renderedImageUrl?: string | null;
    status?: string;
    approvalToken?: string | null;
    visibility?: string | null;
  }>(ctx.organizationId, 'mockups', ctx.customer.id);
  const mapped = await Promise.all(rows.map((m) => mapPortalMockup(ctx, m)));
  return mapped.filter((m): m is NonNullable<typeof m> => m != null);
}

export async function listPortalJobs(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'install_tracking',
    action: 'view',
  });
  const rows = await colListByCustomerId<Record<string, unknown> & { id: string }>(
    ctx.organizationId,
    'jobs',
    ctx.customer.id,
  );
  return rows
    .map(mapPortalJobSummary)
    .sort((a, b) => (b.scheduledStart?.getTime?.() ?? 0) - (a.scheduledStart?.getTime?.() ?? 0));
}

export async function getPortalJobDetail(auth: string | PortalAuthInput, jobId: string) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'install_tracking',
    action: 'view',
  });
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
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }

  const property = job.propertyId
    ? await colGet<{
        addressLine1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        label?: string;
        customerId?: string;
      }>(ctx.organizationId, 'properties', job.propertyId)
    : null;
  if (property && property.customerId && property.customerId !== ctx.customer.id) {
    throw new Error('PORTAL_RESOURCE_NOT_FOUND');
  }

  const events = await listPortalCalendarEventsForCustomer(
    ctx.organizationId,
    ctx.customer.id,
    100,
  );
  const event = events.find((e) => e.jobId === jobId);

  const { createPortalFileAccess } = await import('./portal-file-access');
  const mockupPhotoUrls = (
    await Promise.all(
      (job.mockupPhotoUrls ?? []).filter(Boolean).map(async (url, index) => {
        const file = await createPortalFileAccess({
          authorized: ctx,
          fileId: `${jobId}-mockup-${index}`,
          name: `Job photo ${index + 1}`,
          contentType: 'image/jpeg',
          sourceUrlOrPath: url,
          visibility: 'customer_visible',
          parent: { collection: 'jobs', id: jobId },
        });
        return file.accessUrl;
      }),
    )
  ).filter((u): u is string => !!u);

  return {
    id: jobId,
    title: String(job.title ?? 'Job'),
    stage: String(job.stage ?? 'draft_proposal'),
    jobType: job.jobType ?? null,
    scheduledStart:
      job.scheduledStart instanceof Date
        ? job.scheduledStart
        : job.scheduledStart
          ? new Date(String(job.scheduledStart))
          : null,
    scheduledEnd:
      job.scheduledEnd instanceof Date
        ? job.scheduledEnd
        : job.scheduledEnd
          ? new Date(String(job.scheduledEnd))
          : null,
    scopeSummary: job.scopeSummary ?? null,
    accessNotes: job.accessNotes ?? null,
    approvedPackageName: job.approvedPackageName ?? null,
    mockupPhotoUrls,
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

export async function getPortalSigningHub(auth: string | PortalAuthInput) {
  const creds = asPortalAuth(auth);
  const ctx = await requirePortalAuthorized({
    ...creds,
    feature: 'e_sign',
    action: 'view',
  });
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
    const agreements = await listPortalAgreements(auth);
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

  if (
    portalHasFeature(ctx.enabledFeatures, 'proposals') &&
    ctx.settings.permissions.viewProposals
  ) {
    const proposals = await listPortalProposals(auth);
    for (const p of proposals) {
      if (
        ['approved', 'deposit_paid', 'scheduled', 'declined', 'expired', 'cancelled'].includes(
          p.status,
        )
      )
        continue;
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
    const mockups = await listPortalMockups(auth);
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
