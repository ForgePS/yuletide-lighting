import type { AuthContext } from '@clcrm/api';
import type { UserRole } from '@clcrm/validators';
import {
  verifyIdToken,
  getUserByFirebaseUid,
  getOrganization,
  ensureOrganization,
  ensureUser,
  isSubscriptionLocked,
  resolvePlatformCreator,
} from '@yuletide/firebase';
import { cookies, headers } from 'next/headers';

const LEGACY_ROLES: UserRole[] = ['owner', 'admin', 'office', 'crew'];

function normalizeLegacyRole(role: string): UserRole {
  if (LEGACY_ROLES.includes(role as UserRole)) return role as UserRole;
  const map: Record<string, UserRole> = {
    administrator: 'admin',
    office_staff: 'office',
    installer: 'crew',
    crew_leader: 'crew',
    dispatcher: 'office',
    sales_manager: 'office',
    sales_rep: 'office',
    operations_manager: 'office',
    warehouse_staff: 'crew',
    read_only: 'crew',
  };
  return map[role] ?? 'office';
}

function resolveAccessRole(user: { role: string; settingsRole?: string | null }): UserRole {
  if (user.settingsRole) return normalizeLegacyRole(user.settingsRole);
  return normalizeLegacyRole(user.role);
}

export async function createAuthContext(): Promise<AuthContext | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const authHeader = headerStore.get('authorization');
  const token =
    authHeader?.replace('Bearer ', '') ?? cookieStore.get('firebase-token')?.value;

  if (!token) return null;

  try {
    const decoded = await verifyIdToken(token);
    let user = await getUserByFirebaseUid(decoded.uid);

    if (!user) {
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

    const org = await getOrganization(user.organizationId);
    if (!org) {
      console.error('[createAuthContext] organization not found', user.organizationId);
      return null;
    }

    return {
      organizationId: user.organizationId,
      firebaseUid: decoded.uid,
      userId: user.id,
      role: resolveAccessRole(user),
      email: user.email,
      subscriptionLocked: isSubscriptionLocked(org),
      isPlatformCreator: await resolvePlatformCreator(user.email, decoded.uid),
    };
  } catch (err) {
    console.error('[createAuthContext] failed', err);
    return null;
  }
}
