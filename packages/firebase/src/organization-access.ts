/**
 * YL-S1 — Organization access / membership helpers (application authorization).
 * Reuses single-org user.organizationId binding; does not introduce memberships/*.
 */

import type {
  OrganizationLifecycleStatus,
  OrganizationMembership,
  UserStatus,
} from '@clcrm/types';
import {
  assertSameOrganization,
  isOrganizationLifecycleActive,
  normalizeOrganizationLifecycleStatus,
} from '@clcrm/types';
import type { OrganizationRecord, UserRecord } from './firestore';

export type OrganizationAccessDeniedReason =
  | 'no_org'
  | 'org_inactive'
  | 'membership_mismatch';

export type OrganizationAccessResult =
  | { ok: true; lifecycleStatus: OrganizationLifecycleStatus }
  | { ok: false; reason: OrganizationAccessDeniedReason };

export function membershipFromUser(user: UserRecord): OrganizationMembership {
  const userStatus = (user.status ?? 'active') as UserStatus;
  return {
    userId: user.id,
    firebaseUid: user.firebaseUid,
    organizationId: user.organizationId,
    userStatus,
    role: user.role,
    settingsRole: user.settingsRole ?? null,
  };
}

export function assertUserBelongsToOrganization(
  user: Pick<UserRecord, 'organizationId'>,
  organizationId: string,
): void {
  assertSameOrganization(user.organizationId, organizationId);
}

export function evaluateOrganizationAccess(
  org: OrganizationRecord | null | undefined,
): OrganizationAccessResult {
  if (!org) return { ok: false, reason: 'no_org' };
  const lifecycleStatus = normalizeOrganizationLifecycleStatus(org.lifecycleStatus);
  if (!isOrganizationLifecycleActive(lifecycleStatus)) {
    return { ok: false, reason: 'org_inactive' };
  }
  return { ok: true, lifecycleStatus };
}

export {
  assertSameOrganization,
  isOrganizationLifecycleActive,
  normalizeOrganizationLifecycleStatus,
};
