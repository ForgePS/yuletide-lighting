/**
 * Portal session lifecycle (Phase 2).
 * Cookie name: __portal_session (separate from staff __session).
 * ENVIRONMENT=EMULATOR for automated evidence.
 */
import type { PortalFeatureKey, PortalSessionContext, PortalUserRole } from '@clcrm/types';
import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_MS,
  createPortalOpaqueToken,
  signPortalSessionToken,
  verifyPortalSessionToken,
  type PortalSessionPayload,
} from './portal-security';
import { getPortalAccount, getPortalUser, resolvePortalFeatures } from './portal360';

export { PORTAL_SESSION_COOKIE };

function portalSessionSecret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SESSION_SECRET ||
    'emulator-portal-session-secret-not-for-production'
  );
}

export async function createPortalSessionContext(args: {
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
}): Promise<{ context: PortalSessionContext; token: string; expiresAt: Date } | null> {
  const account = await getPortalAccount(args.organizationId, args.portalAccountId);
  if (!account || !account.portalEnabled) return null;
  if (
    account.status === 'suspended' ||
    account.status === 'archived' ||
    account.status === 'locked'
  ) {
    return null;
  }
  if (account.customerId !== args.customerId) return null;

  const user = await getPortalUser(args.organizationId, args.portalUserId);
  if (!user || user.portalAccountId !== account.id) return null;
  if (user.customerId !== args.customerId) return null;
  if (user.status === 'suspended' || user.status === 'locked') return null;
  if (user.revokedAt) return null;

  const features = await resolvePortalFeatures(args.organizationId);
  const sessionVersion = Math.max(account.sessionVersion ?? 0, user.sessionVersion ?? 0);
  const now = Date.now();
  const exp = now + PORTAL_SESSION_TTL_MS;
  const context: PortalSessionContext = {
    organizationId: args.organizationId,
    customerId: args.customerId,
    portalAccountId: args.portalAccountId,
    portalUserId: args.portalUserId,
    role: user.role,
    enabledFeatures: features.enabled,
    sessionVersion,
  };
  const payload: PortalSessionPayload = {
    v: 1,
    organizationId: context.organizationId,
    customerId: context.customerId,
    portalAccountId: context.portalAccountId,
    portalUserId: context.portalUserId,
    role: context.role,
    enabledFeatures: context.enabledFeatures,
    sessionVersion: context.sessionVersion,
    exp,
    iat: now,
    jti: createPortalOpaqueToken(16),
  };
  const token = signPortalSessionToken(payload, portalSessionSecret());
  return { context, token, expiresAt: new Date(exp) };
}

export async function verifyPortalSessionTokenServer(
  token: string,
): Promise<PortalSessionContext | null> {
  const payload = verifyPortalSessionToken(token, portalSessionSecret());
  if (!payload) return null;

  const account = await getPortalAccount(payload.organizationId, payload.portalAccountId);
  if (!account || !account.portalEnabled) return null;
  if (
    account.status === 'suspended' ||
    account.status === 'archived' ||
    account.status === 'locked'
  ) {
    return null;
  }
  if (account.customerId !== payload.customerId) return null;

  const accountVersion = account.sessionVersion ?? 0;
  if (payload.sessionVersion < accountVersion) return null;

  const user = await getPortalUser(payload.organizationId, payload.portalUserId);
  if (!user || user.portalAccountId !== account.id) return null;
  if (user.customerId !== payload.customerId) return null;
  if (user.status === 'suspended' || user.status === 'locked') return null;
  if (user.revokedAt) return null;
  const userVersion = user.sessionVersion ?? 0;
  if (payload.sessionVersion < userVersion) return null;

  const features = await resolvePortalFeatures(payload.organizationId);
  return {
    organizationId: payload.organizationId,
    customerId: payload.customerId,
    portalAccountId: payload.portalAccountId,
    portalUserId: payload.portalUserId,
    role: user.role as PortalUserRole,
    enabledFeatures: features.enabled,
    sessionVersion: Math.max(accountVersion, userVersion),
  };
}

export function portalSessionCookieOptions(expiresAt: Date) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: PORTAL_SESSION_COOKIE,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export function assertPortalFeature(ctx: PortalSessionContext, feature: PortalFeatureKey): boolean {
  return ctx.enabledFeatures.includes(feature);
}

/**
 * Establish portal session from legacy/canonical magic access token (compatibility path).
 */
export async function establishPortalSessionFromAccessToken(
  accessToken: string,
): Promise<{ context: PortalSessionContext; token: string; expiresAt: Date } | null> {
  const { requirePortalAccess } = await import('./portal360');
  const access = await requirePortalAccess(accessToken);
  if (!access?.account) return null;
  const portalUserId = access.account.primaryPortalUserId;
  if (!portalUserId) return null;
  return createPortalSessionContext({
    organizationId: access.organizationId,
    customerId: access.customer.id,
    portalAccountId: access.account.id,
    portalUserId,
  });
}
