/**
 * YL-S1 — Organization / membership domain types.
 *
 * Membership model (authoritative today):
 *   users/{firebaseUid}.organizationId → organizations/{orgId}
 * There is NO separate memberships collection. Multi-org membership is out of scope
 * (Creator manages orgs at platform level).
 */

/** Org operating lifecycle — distinct from Stripe `subscriptionStatus`. */
export type OrganizationLifecycleStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'archived';

export const ORGANIZATION_LIFECYCLE_STATUSES: OrganizationLifecycleStatus[] = [
  'active',
  'inactive',
  'suspended',
  'archived',
];

/** Org statuses that deny staff application access. */
export const INACTIVE_ORGANIZATION_LIFECYCLE_STATUSES: OrganizationLifecycleStatus[] = [
  'inactive',
  'suspended',
  'archived',
];

/**
 * Logical membership view derived from the user document.
 * Not a Firestore collection — documentation + helper contract only.
 */
export type OrganizationMembership = {
  userId: string;
  firebaseUid: string;
  organizationId: string;
  userStatus: 'active' | 'suspended' | 'pending' | 'archived';
  role: string;
  settingsRole?: string | null;
};

export function normalizeOrganizationLifecycleStatus(
  value: unknown,
): OrganizationLifecycleStatus {
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if ((ORGANIZATION_LIFECYCLE_STATUSES as string[]).includes(v)) {
      return v as OrganizationLifecycleStatus;
    }
  }
  // Legacy orgs without the field are treated as active.
  return 'active';
}

export function isOrganizationLifecycleActive(value: unknown): boolean {
  const status = normalizeOrganizationLifecycleStatus(value);
  return !INACTIVE_ORGANIZATION_LIFECYCLE_STATUSES.includes(status);
}

export function assertSameOrganization(
  actorOrganizationId: string | null | undefined,
  resourceOrganizationId: string | null | undefined,
): asserts actorOrganizationId is string {
  if (!actorOrganizationId || !resourceOrganizationId) {
    throw new Error('Organization membership required');
  }
  if (actorOrganizationId !== resourceOrganizationId) {
    throw new Error('Cross-organization access denied');
  }
}
