/**
 * AuthContext builders that mirror apps/web/src/lib/auth.ts for createCaller tests.
 * Session resolution reads real Firestore user/org docs (no Firebase Auth token required).
 */

import type { AuthContext } from '@clcrm/api';
import type { PermissionMatrix, SettingsRole, UserStatus } from '@clcrm/types';
import { DEFAULT_PERMISSION_MATRIX, SYSTEM_ROLES } from '@clcrm/types';
import type { UserRole } from '@clcrm/validators';
import {
  getOrganization,
  getUserByFirebaseUid,
  isPlatformCreator,
  isSubscriptionLocked,
  evaluateOrganizationAccess,
} from '@yuletide/firebase';

const LEGACY_ROLES: UserRole[] = ['owner', 'admin', 'office', 'crew'];
const INACTIVE_STATUSES: UserStatus[] = ['suspended', 'archived'];

export type AccessDeniedReason =
  | 'unauthenticated'
  | 'inactive'
  | 'org_inactive'
  | 'pending'
  | 'no_account'
  | 'no_org'
  | 'forbidden';

export type TestSessionResult =
  | { status: 'ok'; ctx: AuthContext }
  | { status: 'denied'; reason: AccessDeniedReason };

export function settingsRoleFromUser(user: {
  role: string;
  settingsRole?: string | null;
}): SettingsRole {
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

export function normalizeLegacyRole(settingsRole: SettingsRole, fallbackRole: string): UserRole {
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

export function permissionsForRole(settingsRole: SettingsRole): PermissionMatrix {
  return (
    SYSTEM_ROLES.find((r) => r.slug === settingsRole)?.permissions ?? DEFAULT_PERMISSION_MATRIX
  );
}

export type SeedAuthOptions = {
  organizationId: string;
  firebaseUid: string;
  userId?: string;
  email?: string;
  settingsRole?: SettingsRole;
  role?: UserRole;
  permissions?: PermissionMatrix;
  subscriptionLocked?: boolean;
  isPlatformCreator?: boolean;
};

/** Build AuthContext from SYSTEM_ROLES / DEFAULT_PERMISSION_MATRIX (no Firestore). */
export function buildAuthContext(opts: SeedAuthOptions): AuthContext {
  const settingsRole = opts.settingsRole ?? 'owner';
  const role = opts.role ?? normalizeLegacyRole(settingsRole, settingsRole);
  return {
    organizationId: opts.organizationId,
    firebaseUid: opts.firebaseUid,
    userId: opts.userId ?? opts.firebaseUid,
    role,
    settingsRole,
    permissions: opts.permissions ?? permissionsForRole(settingsRole),
    email: opts.email ?? `${opts.firebaseUid}@test.local`,
    subscriptionLocked: opts.subscriptionLocked ?? false,
    isPlatformCreator: opts.isPlatformCreator ?? false,
  };
}

/**
 * Mirror resolveAppAccess against emulator user/org docs (skips token verification).
 */
export async function resolveTestSession(
  firebaseUid: string | null | undefined,
): Promise<TestSessionResult> {
  if (!firebaseUid) return { status: 'denied', reason: 'unauthenticated' };

  const user = await getUserByFirebaseUid(firebaseUid);
  if (!user) return { status: 'denied', reason: 'no_account' };

  const status = ((user as { status?: UserStatus }).status ?? 'active') as UserStatus;
  if (INACTIVE_STATUSES.includes(status)) {
    return { status: 'denied', reason: 'inactive' };
  }
  if (status === 'pending') {
    return { status: 'denied', reason: 'pending' };
  }

  const org = await getOrganization(user.organizationId);
  const orgAccess = evaluateOrganizationAccess(org);
  if (!orgAccess.ok || !org) {
    const reason = orgAccess.ok ? 'no_org' : orgAccess.reason === 'org_inactive' ? 'org_inactive' : 'no_org';
    return { status: 'denied', reason };
  }

  const settingsRole = settingsRoleFromUser(user);
  const ctx: AuthContext = {
    organizationId: user.organizationId,
    firebaseUid: user.firebaseUid || firebaseUid,
    userId: user.id,
    role: normalizeLegacyRole(settingsRole, user.role),
    settingsRole,
    permissions: permissionsForRole(settingsRole),
    email: user.email,
    subscriptionLocked: isSubscriptionLocked(org),
    isPlatformCreator: isPlatformCreator(user.email, user.firebaseUid || firebaseUid),
  };
  return { status: 'ok', ctx };
}

export async function authContextFromUser(firebaseUid: string): Promise<AuthContext> {
  const result = await resolveTestSession(firebaseUid);
  if (result.status !== 'ok') {
    throw new Error(`Expected active session for ${firebaseUid}, got ${result.reason}`);
  }
  return result.ctx;
}
