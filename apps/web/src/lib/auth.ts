import type { AuthContext } from '@clcrm/api';
import type { PermissionMatrix, SettingsRole, UserStatus } from '@clcrm/types';
import { DEFAULT_PERMISSION_MATRIX, SYSTEM_ROLES, hasPermission } from '@clcrm/types';
import type { UserRole } from '@clcrm/validators';
import {
  verifyIdToken,
  getUserByFirebaseUid,
  getOrganization,
  ensureOrganization,
  ensureUser,
  isSubscriptionLocked,
  isPlatformCreator,
  getUserPermissions,
} from '@yuletide/firebase';
import { cookies, headers } from 'next/headers';
import { createHash } from 'crypto';
import { redirect } from 'next/navigation';

const LEGACY_ROLES: UserRole[] = ['owner', 'admin', 'office', 'crew'];
const AUTH_CACHE_TTL_MS = 45_000;
const AUTH_FAIL_TTL_MS = 8_000;
const INACTIVE_STATUSES: UserStatus[] = ['suspended', 'archived'];

type CacheEntry =
  | { ok: true; ctx: AuthContext; expiresAt: number }
  | { ok: false; reason: AccessDeniedReason; expiresAt: number };

export type AccessDeniedReason =
  | 'unauthenticated'
  | 'inactive'
  | 'pending'
  | 'no_account'
  | 'no_org'
  | 'forbidden';

export type AppAccessResult =
  | { status: 'ok'; ctx: AuthContext }
  | { status: 'denied'; reason: AccessDeniedReason };

const authCache = new Map<string, CacheEntry>();

function tokenCacheKey(token: string) {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

function settingsRoleFromUser(user: { role: string; settingsRole?: string | null }): SettingsRole {
  const raw = (user.settingsRole || user.role || 'office_staff').toLowerCase();
  const known = SYSTEM_ROLES.find((r) => r.slug === raw);
  if (known) return known.slug;
  const map: Record<string, SettingsRole> = {
    owner: 'owner',
    admin: 'administrator',
    administrator: 'administrator',
    office: 'office_staff',
    office_staff: 'office_staff',
    crew: 'installer',
    installer: 'installer',
    crew_leader: 'crew_leader',
    read_only: 'read_only',
    sales_manager: 'sales_manager',
    sales_rep: 'sales_rep',
    operations_manager: 'operations_manager',
    dispatcher: 'dispatcher',
    warehouse_staff: 'warehouse_staff',
  };
  return map[raw] ?? 'office_staff';
}

/**
 * Map settings roles to coarse API roles. read_only must NOT become a write-capable role.
 * Crew can read field data; write gates use permissions / requirePermission.
 */
function normalizeLegacyRole(settingsRole: SettingsRole, fallbackRole: string): UserRole {
  if (settingsRole === 'read_only') return 'crew';
  if (LEGACY_ROLES.includes(fallbackRole as UserRole)) {
    return fallbackRole as UserRole;
  }
  const map: Record<SettingsRole, UserRole> = {
    owner: 'owner',
    administrator: 'admin',
    sales_manager: 'office',
    sales_rep: 'office',
    operations_manager: 'office',
    dispatcher: 'office',
    crew_leader: 'crew',
    installer: 'crew',
    warehouse_staff: 'crew',
    office_staff: 'office',
    read_only: 'crew',
  };
  return map[settingsRole] ?? 'office';
}

function permissionsForRole(settingsRole: SettingsRole): PermissionMatrix {
  return SYSTEM_ROLES.find((r) => r.slug === settingsRole)?.permissions ?? DEFAULT_PERMISSION_MATRIX;
}

function allowAutoProvision(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_AUTO_ORG_PROVISION === '1';
}

async function resolvePermissions(orgId: string, settingsRole: SettingsRole): Promise<PermissionMatrix> {
  try {
    return await getUserPermissions(orgId, settingsRole);
  } catch {
    return permissionsForRole(settingsRole);
  }
}

function readTokenFromRequest(): Promise<string | null> {
  return (async () => {
    const headerStore = await headers();
    const cookieStore = await cookies();
    const authHeader = headerStore.get('authorization');
    const fromHeader = authHeader?.replace(/^Bearer\s+/i, '') ?? null;
    if (fromHeader) return fromHeader;
    // Firebase Hosting only forwards `__session` to the SSR backend.
    return cookieStore.get('__session')?.value ?? cookieStore.get('firebase-token')?.value ?? null;
  })();
}

export async function resolveAppAccess(): Promise<AppAccessResult> {
  const token = await readTokenFromRequest();
  if (!token) return { status: 'denied', reason: 'unauthenticated' };

  const key = tokenCacheKey(token);
  const cached = authCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.ok) return { status: 'ok', ctx: cached.ctx };
    return { status: 'denied', reason: cached.reason };
  }

  try {
    const decoded = await Promise.race([
      verifyIdToken(token),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Token verification timed out')), 8_000);
      }),
    ]);
    let user = await getUserByFirebaseUid(decoded.uid);

    if (!user) {
      if (!allowAutoProvision()) {
        authCache.set(key, { ok: false, reason: 'no_account', expiresAt: Date.now() + AUTH_FAIL_TTL_MS });
        return { status: 'denied', reason: 'no_account' };
      }
      const org = await ensureOrganization(
        decoded.name ?? decoded.email?.split('@')[0] ?? 'My Company',
        decoded.uid,
      );
      user = await ensureUser(
        decoded.uid,
        decoded.email ?? '',
        org.id,
        decoded.name?.split(' ')[0],
        decoded.name?.split(' ').slice(1).join(' ') || null,
        'owner',
      );
    }

    const status = ((user as { status?: UserStatus }).status ?? 'active') as UserStatus;
    if (INACTIVE_STATUSES.includes(status)) {
      authCache.set(key, { ok: false, reason: 'inactive', expiresAt: Date.now() + AUTH_FAIL_TTL_MS });
      return { status: 'denied', reason: 'inactive' };
    }
    if (status === 'pending') {
      authCache.set(key, { ok: false, reason: 'pending', expiresAt: Date.now() + AUTH_FAIL_TTL_MS });
      return { status: 'denied', reason: 'pending' };
    }

    const org = await getOrganization(user.organizationId);
    if (!org) {
      authCache.set(key, { ok: false, reason: 'no_org', expiresAt: Date.now() + AUTH_FAIL_TTL_MS });
      return { status: 'denied', reason: 'no_org' };
    }

    const settingsRole = settingsRoleFromUser(user);
    const permissions = await resolvePermissions(user.organizationId, settingsRole);
    const ctx: AuthContext = {
      organizationId: user.organizationId,
      firebaseUid: decoded.uid,
      userId: user.id,
      role: normalizeLegacyRole(settingsRole, user.role),
      settingsRole,
      permissions,
      email: user.email,
      subscriptionLocked: isSubscriptionLocked(org),
      isPlatformCreator: isPlatformCreator(user.email, decoded.uid),
    };
    authCache.set(key, { ok: true, ctx, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    return { status: 'ok', ctx };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    authCache.set(key, { ok: false, reason: 'unauthenticated', expiresAt: Date.now() + AUTH_FAIL_TTL_MS });
    if (/PERMISSION_DENIED|invalid_grant|Could not load the default credentials/i.test(msg)) {
      console.error(
        '[resolveAppAccess] Firebase Admin cannot access project data.\n' +
          '  Fix: set FIREBASE_SERVICE_ACCOUNT_PATH to a yuletide-lighting service account JSON file,\n' +
          '  or grant your Google account access to project yuletide-lighting and re-run\n' +
          '  `gcloud auth application-default login` + set-quota-project yuletide-lighting.',
      );
    } else {
      console.error('[resolveAppAccess] failed', err);
    }
    return { status: 'denied', reason: 'unauthenticated' };
  }
}

/** tRPC / API: authenticated context or null. */
export async function createAuthContext(): Promise<AuthContext | null> {
  const result = await resolveAppAccess();
  return result.status === 'ok' ? result.ctx : null;
}

/** Server layouts: redirect unauthenticated / denied users before shell renders. */
export async function requireAppSession(opts?: { allowLockedSubscription?: boolean }) {
  const result = await resolveAppAccess();
  if (result.status === 'denied') {
    if (result.reason === 'unauthenticated') {
      // Prefer access-denied when a cookie was present but verification failed,
      // so client Firebase persistence cannot bounce forever against /sign-in.
      const token = await readTokenFromRequest();
      if (token) {
        redirect('/access-denied?reason=unauthenticated');
      }
      redirect('/sign-in');
    }
    redirect(`/access-denied?reason=${result.reason}`);
  }
  if (result.ctx.subscriptionLocked && !opts?.allowLockedSubscription) {
    redirect('/app/settings/subscription');
  }
  return result.ctx;
}

export function userHasPermission(
  ctx: AuthContext,
  resource: Parameters<typeof hasPermission>[1],
  action: Parameters<typeof hasPermission>[2],
) {
  return hasPermission(ctx.permissions, resource, action);
}
