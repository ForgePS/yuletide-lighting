import { randomUUID } from 'node:crypto';
import type { SettingsRole, UserStatus, CrmPlatformModuleKey } from '@clcrm/types';
import type { UserRole } from '@clcrm/validators';
import {
  getAdminFirestore,
  buildOrganizationProvisioningFields,
  type OrganizationRecord,
  type ProvisionSubscriptionInput,
} from '@yuletide/firebase';

export type SeedOrgOptions = {
  companyName?: string;
  orgId?: string;
  subscription?: Partial<ProvisionSubscriptionInput> & {
    subscriptionStatus?: ProvisionSubscriptionInput['subscriptionStatus'];
  };
  enabledModules?: CrmPlatformModuleKey[] | string[] | null;
  disabledModules?: string[];
  featureFlags?: Record<string, boolean>;
  subscriptionTier?: string;
  /** Extra org fields (e.g. stripeSubscriptionId for lock tests). */
  extra?: Record<string, unknown>;
};

export type SeedUserOptions = {
  firebaseUid?: string;
  userId?: string;
  organizationId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  settingsRole?: SettingsRole;
  status?: UserStatus;
};

export type SeededOrg = {
  id: string;
  companyName: string;
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
  raw: OrganizationRecord & Record<string, unknown>;
};

export type SeededUser = {
  id: string;
  firebaseUid: string;
  organizationId: string;
  email: string;
  role: UserRole;
  settingsRole: SettingsRole;
  status: UserStatus;
};

function nowTs() {
  return new Date();
}

export async function seedOrganization(opts: SeedOrgOptions = {}): Promise<SeededOrg> {
  const db = getAdminFirestore();
  const orgId = opts.orgId ?? `org_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const companyName = opts.companyName ?? `Test Co ${orgId.slice(-6)}`;

  const provisioning = buildOrganizationProvisioningFields({
    subscriptionStatus: opts.subscription?.subscriptionStatus ?? 'trialing',
    subscriptionTier: (opts.subscriptionTier ??
      opts.subscription?.subscriptionTier ??
      'standard') as ProvisionSubscriptionInput['subscriptionTier'],
    subscriptionPlan: opts.subscription?.subscriptionPlan ?? null,
    disabledModules: opts.disabledModules ?? opts.subscription?.disabledModules,
    availableModules: opts.subscription?.availableModules,
  });

  const enabledModules =
    opts.enabledModules === null
      ? null
      : opts.enabledModules !== undefined
        ? [...opts.enabledModules]
        : provisioning.enabledModules;

  const data = {
    companyName,
    brandColor: '#DC2626',
    logoUrl: null,
    agreementMode: 'multi' as const,
    agreementOptions: [
      { code: '1YR', label: '1 Year', active: true },
      { code: '3YR', label: '3 Year', active: true },
    ],
    ...provisioning,
    enabledModules,
    featureFlags: {
      ...provisioning.featureFlags,
      ...(opts.featureFlags ?? {}),
    },
    ...(opts.extra ?? {}),
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };

  await db.collection('organizations').doc(orgId).set(data);
  const snap = await db.collection('organizations').doc(orgId).get();
  const raw = { id: orgId, ...snap.data() } as OrganizationRecord & Record<string, unknown>;

  return {
    id: orgId,
    companyName,
    enabledModules: Array.isArray(enabledModules) ? enabledModules : [],
    featureFlags: (data.featureFlags ?? {}) as Record<string, boolean>,
    raw,
  };
}

export async function seedUser(opts: SeedUserOptions): Promise<SeededUser> {
  const db = getAdminFirestore();
  const firebaseUid = opts.firebaseUid ?? `uid_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const userId = opts.userId ?? firebaseUid;
  const settingsRole = opts.settingsRole ?? 'owner';
  const role =
    opts.role ??
    (settingsRole === 'owner' ? 'owner' : settingsRole === 'administrator' ? 'admin' : 'office');
  const status = opts.status ?? 'active';
  const email = opts.email ?? `${firebaseUid}@test.local`;

  await db
    .collection('users')
    .doc(userId)
    .set({
      firebaseUid,
      organizationId: opts.organizationId,
      email,
      firstName: opts.firstName ?? 'Test',
      lastName: opts.lastName ?? 'User',
      role,
      settingsRole,
      status,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

  return {
    id: userId,
    firebaseUid,
    organizationId: opts.organizationId,
    email,
    role,
    settingsRole,
    status,
  };
}

/** Create an isolated org + owner user for a test case. */
export async function seedTenant(opts?: {
  org?: SeedOrgOptions;
  user?: Omit<SeedUserOptions, 'organizationId'>;
}): Promise<{ org: SeededOrg; user: SeededUser }> {
  const org = await seedOrganization(opts?.org);
  const user = await seedUser({
    organizationId: org.id,
    settingsRole: 'owner',
    role: 'owner',
    status: 'active',
    ...opts?.user,
  });
  return { org, user };
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('users').doc(userId).update({ status, updatedAt: nowTs() });
}

export async function setOrgEnabledModules(
  orgId: string,
  enabledModules: string[] | null,
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('organizations').doc(orgId).update({
    enabledModules,
    updatedAt: nowTs(),
  });
}

export async function setOrgFeatureFlags(
  orgId: string,
  featureFlags: Record<string, boolean>,
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('organizations').doc(orgId).update({
    featureFlags,
    updatedAt: nowTs(),
  });
}

export async function getOrgDoc(orgId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection('organizations').doc(orgId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}
