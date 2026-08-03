/**
 * PORTAL-P2-S7 magic-access token hardening integration evidence.
 * ENVIRONMENT=EMULATOR. Real firebase helpers — no mocking requirePortalAccess / resolvePortalMagicAccess.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PORTAL_FEATURES } from '@clcrm/types';
import {
  authorizePortalPath,
  colCreate,
  colGet,
  colUpdate,
  enableCustomerPortal,
  establishPortalSessionFromAccessToken,
  generatePortalAccessToken,
  getPortalAccountByCustomer,
  getPortalDashboard,
  getStaffPortalAccountView,
  hashPortalAccessToken,
  requirePortalAccess,
  requirePortalMutation,
  resolvePortalMagicAccess,
  revokeCustomerPortal,
  rotatePortalAccessToken,
  suspendCustomerPortal,
  updatePortalSettings,
  verifyPortalSessionTokenServer,
  PortalResourceNotFoundError,
} from '@yuletide/firebase';
import {
  createCallerForAuth,
  ensureFirestoreEmulator,
  sampleCustomerInput,
  seedTenant,
} from '../setup';

type OwnerKey = 'hash' | 'legacy' | 'rotate' | 'revoke' | 'suspend' | 'dupA' | 'dupB';

const owners = {} as Record<
  OwnerKey,
  {
    orgId: string;
    customerId: string;
    token: string;
    accountId: string;
    portalUserId: string;
  }
>;

let staffUserId = '';
let crossTenant: { orgId: string; customerId: string; token: string; invoiceId: string } | null =
  null;

const savedMagicMode = process.env.PORTAL_MAGIC_TOKEN_MODE;

function setMagicMode(mode: 'COMPATIBILITY' | 'HASH_ONLY' | undefined) {
  if (mode === undefined) delete process.env.PORTAL_MAGIC_TOKEN_MODE;
  else process.env.PORTAL_MAGIC_TOKEN_MODE = mode;
}

afterEach(() => {
  setMagicMode(savedMagicMode as 'COMPATIBILITY' | 'HASH_ONLY' | undefined);
});

beforeAll(async () => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  setMagicMode('COMPATIBILITY');

  const tenant = await seedTenant({
    org: {
      companyName: 'Portal S7 Tenant A',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  staffUserId = tenant.user.id;
  const caller = createCallerForAuth({
    organizationId: tenant.org.id,
    firebaseUid: tenant.user.firebaseUid,
    userId: tenant.user.id,
    settingsRole: 'owner',
  });
  await updatePortalSettings(
    tenant.org.id,
    {
      enabled: true,
      enabledFeatures: PORTAL_FEATURES.map((f) => f.key),
      allowSelfScheduling: true,
    },
    tenant.user.id,
    's7@portal-test.invalid',
  );

  async function seedOwner(key: OwnerKey, label: string) {
    const customer = await caller.customers.create(
      sampleCustomerInput({
        firstName: `S7-${label}`,
        email: `s7-${label}@portal-test.invalid`,
      }),
    );
    const portal = await enableCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    const account = await getPortalAccountByCustomer(tenant.org.id, customer.id);
    if (!account?.primaryPortalUserId) throw new Error(`missing portal user for ${key}`);
    owners[key] = {
      orgId: tenant.org.id,
      customerId: customer.id,
      token: portal.token,
      accountId: account.id,
      portalUserId: account.primaryPortalUserId,
    };
  }

  await seedOwner('hash', 'hash');
  await seedOwner('legacy', 'legacy');
  await seedOwner('rotate', 'rotate');
  await seedOwner('revoke', 'revoke');
  await seedOwner('suspend', 'suspend');
  await seedOwner('dupA', 'dup-a');
  await seedOwner('dupB', 'dup-b');

  // Legacy-only credential: plaintext accessToken, no hash
  const legacyRaw = generatePortalAccessToken();
  await colUpdate(owners.legacy.orgId, 'portalAccounts', owners.legacy.accountId, {
    accessToken: legacyRaw,
    accessTokenHash: null,
    accessTokenHashVersion: null,
    portalEnabled: true,
    status: 'active',
    revokedAt: null,
    revokedBy: null,
  });
  owners.legacy.token = legacyRaw;

  // Duplicate hash collision
  const sharedHash = hashPortalAccessToken(owners.dupA.token);
  await colUpdate(owners.dupB.orgId, 'portalAccounts', owners.dupB.accountId, {
    accessToken: null,
    accessTokenHash: sharedHash,
    accessTokenHashVersion: 1,
  });

  const tenantB = await seedTenant({
    org: {
      companyName: 'Portal S7 Tenant B',
      enabledModules: ['customer_portal', 'crm_core', 'billing'],
      featureFlags: { customer_portal: true },
    },
  });
  await updatePortalSettings(
    tenantB.org.id,
    { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
    tenantB.user.id,
    's7-b@portal-test.invalid',
  );
  const callerB = createCallerForAuth({
    organizationId: tenantB.org.id,
    firebaseUid: tenantB.user.firebaseUid,
    userId: tenantB.user.id,
    settingsRole: 'owner',
  });
  const customerB = await callerB.customers.create(
    sampleCustomerInput({ firstName: 'S7-XB', email: 's7-xb@portal-test.invalid' }),
  );
  const portalB = await enableCustomerPortal(tenantB.org.id, customerB.id, tenantB.user.id);
  const invoiceB = await colCreate(tenantB.org.id, 'invoices', {
    customerId: customerB.id,
    organizationId: tenantB.org.id,
    invoiceNumber: 'S7-XB',
    status: 'sent',
    subtotalCents: 5000,
    amountPaidCents: 0,
    depositCents: 1000,
    publicToken: 's7-inv-xb',
  });
  crossTenant = {
    orgId: tenantB.org.id,
    customerId: customerB.id,
    token: portalB.token,
    invoiceId: invoiceB.id,
  };
}, 180_000);

describe('P2-S7 hash-only enable writes', () => {
  it('new enableCustomerPortal persists hash-only credentials', async () => {
    const o = owners.hash;
    const account = await getPortalAccountByCustomer(o.orgId, o.customerId);
    const customer = await colGet<{ portalToken?: string | null }>(
      o.orgId,
      'customers',
      o.customerId,
    );
    expect(account?.accessTokenHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(account?.accessToken ?? null).toBeNull();
    expect(customer?.portalToken ?? null).toBeNull();
    expect(hashPortalAccessToken(o.token)).toBe(account?.accessTokenHash);
  });
});

describe('P2-S7 hash-only auth', () => {
  it('requirePortalAccess passes for raw token against stored hash', async () => {
    const o = owners.hash;
    const ctx = await requirePortalAccess(o.token);
    expect(ctx?.organizationId).toBe(o.orgId);
    expect(ctx?.customer.id).toBe(o.customerId);
    expect(ctx?.account.id).toBe(o.accountId);
  });
});

describe('P2-S7 legacy plaintext compatibility', () => {
  it('legacy plaintext accessToken passes in COMPATIBILITY mode', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.legacy;
    const resolved = await resolvePortalMagicAccess(o.token);
    expect(resolved?.lookupMethod).toBe('legacy_plaintext');
    expect(await requirePortalAccess(o.token)).not.toBeNull();
  });

  it('legacy plaintext accessToken denied in HASH_ONLY mode', async () => {
    setMagicMode('HASH_ONLY');
    const o = owners.legacy;
    expect(await resolvePortalMagicAccess(o.token)).toBeNull();
    expect(await requirePortalAccess(o.token)).toBeNull();
  });
});

describe('P2-S7 rotation', () => {
  it('rotate invalidates old token, accepts new hash-only credential, bumps sessionVersion', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.rotate;
    const before = await getPortalAccountByCustomer(o.orgId, o.customerId);
    const oldToken = o.token;
    const rotated = await rotatePortalAccessToken(o.orgId, o.customerId, staffUserId);
    expect(rotated.token).not.toBe(oldToken);
    expect(rotated.account).not.toHaveProperty('accessTokenHash');
    expect(await requirePortalAccess(oldToken)).toBeNull();
    expect(await requirePortalAccess(rotated.token)).not.toBeNull();

    const fresh = await getPortalAccountByCustomer(o.orgId, o.customerId);
    expect(fresh?.accessToken ?? null).toBeNull();
    expect(fresh?.accessTokenHash).toBe(hashPortalAccessToken(rotated.token));
    expect((fresh?.sessionVersion ?? 0) > (before?.sessionVersion ?? 0)).toBe(true);
    o.token = rotated.token;
  });
});

describe('P2-S7 revocation', () => {
  it('revoked account denies even when stale plaintext accessToken remains', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.revoke;
    await revokeCustomerPortal(o.orgId, o.customerId, staffUserId);
    await colUpdate(o.orgId, 'portalAccounts', o.accountId, {
      accessToken: o.token,
    });
    expect(await requirePortalAccess(o.token)).toBeNull();
    expect(await resolvePortalMagicAccess(o.token)).toBeNull();
  });
});

describe('P2-S7 suspension', () => {
  it('suspended account denies magic access', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.suspend;
    await suspendCustomerPortal(o.orgId, o.customerId, staffUserId);
    expect(await requirePortalAccess(o.token)).toBeNull();
  });
});

describe('P2-S7 duplicate hash', () => {
  it('resolvePortalMagicAccess returns null when two accounts share accessTokenHash', async () => {
    setMagicMode('COMPATIBILITY');
    expect(await resolvePortalMagicAccess(owners.dupA.token)).toBeNull();
    expect(await resolvePortalMagicAccess(owners.dupB.token)).toBeNull();
  });
});

describe('P2-S7 session exchange', () => {
  it('establishPortalSessionFromAccessToken verifies and powers session-only dashboard', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.hash;
    const session = await establishPortalSessionFromAccessToken(o.token);
    expect(session).not.toBeNull();
    const verified = await verifyPortalSessionTokenServer(session!.token);
    expect(verified?.customerId).toBe(o.customerId);
    const dash = await getPortalDashboard({ sessionToken: session!.token });
    expect(dash?.customer.id).toBe(o.customerId);
    expect(dash).not.toHaveProperty('accessToken');
    expect(JSON.stringify(dash)).not.toMatch(/accessTokenHash|portalToken/);
  });
});

describe('P2-S7 session-first route authorization', () => {
  it('authorizePortalPath allows /portal/app/billing with session when billing enabled', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.hash;
    const session = await establishPortalSessionFromAccessToken(o.token);
    expect(session).not.toBeNull();
    const access = await authorizePortalPath({
      pathname: '/portal/app/billing',
      auth: { sessionToken: session!.token },
    });
    expect(access.allowed).toBe(true);
    if (access.allowed) {
      expect(access.authorized.customer.id).toBe(o.customerId);
    }
  });
});

describe('P2-S7 staff portal view', () => {
  it('getStaffPortalAccountView never returns raw token or magic URL', async () => {
    const o = owners.hash;
    const view = await getStaffPortalAccountView(o.orgId, o.customerId);
    expect(view).not.toBeNull();
    expect(view!.accessUrl).toBeNull();
    expect(JSON.stringify(view)).not.toContain(o.token);
    expect(view!.credentialFingerprint).toMatch(/^[a-f0-9]{8}$/);
    expect(view!.account).not.toHaveProperty('accessToken');
    expect(view!.account).not.toHaveProperty('accessTokenHash');
  });
});

describe('P2-S7A one-time credential + DTO sanitization', () => {
  it('enable returns one-time credential and sanitized account (no hash/plaintext)', async () => {
    const o = owners.hash;
    const rotated = await rotatePortalAccessToken(o.orgId, o.customerId, staffUserId);
    expect(rotated.token.length).toBeGreaterThan(16);
    expect(rotated.credential.token).toBe(rotated.token);
    expect(rotated.account).not.toHaveProperty('accessToken');
    expect(rotated.account).not.toHaveProperty('accessTokenHash');
    expect(rotated.account.credentialConfigured).toBe(true);

    const later = await getStaffPortalAccountView(o.orgId, o.customerId);
    expect(later!.accessUrl).toBeNull();
    expect(JSON.stringify(later)).not.toContain(rotated.token);
    o.token = rotated.token;
  });

  it('getCustomerPortalAccess does not reconstruct magic URL from portalToken', async () => {
    const { getCustomerPortalAccess } = await import('@yuletide/firebase');
    const leaky = getCustomerPortalAccess({
      id: 'c1',
      organizationId: 'o1',
      firstName: 'A',
      lastName: 'B',
      portalEnabled: true,
      portalToken: 'legacy-plaintext-token-value-xxxxxx',
      emailOptIn: true,
      smsOptIn: false,
      billingSameAsPhysical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(leaky.accessUrl).toBeNull();
    expect(leaky.accessLinkPlaceholder).toMatch(/\/portal\/login$/);
    expect(JSON.stringify(leaky)).not.toContain('legacy-plaintext-token-value-xxxxxx');
  });
});

describe('P2-S7A session decoupling', () => {
  it('session remains valid when accessToken and portalToken are absent', async () => {
    setMagicMode('COMPATIBILITY');
    const o = owners.hash;
    const session = await establishPortalSessionFromAccessToken(o.token);
    expect(session).not.toBeNull();
    await colUpdate(o.orgId, 'portalAccounts', o.accountId, { accessToken: null });
    await colUpdate(o.orgId, 'customers', o.customerId, { portalToken: null });
    const verified = await verifyPortalSessionTokenServer(session!.token);
    expect(verified?.customerId).toBe(o.customerId);
    const dash = await getPortalDashboard({ sessionToken: session!.token });
    expect(dash?.customer.id).toBe(o.customerId);
  });
});

describe('P2-S7 cross-tenant denial', () => {
  it('tenant A token cannot authorize tenant B invoice mutation', async () => {
    setMagicMode('COMPATIBILITY');
    expect(crossTenant).toBeTruthy();
    await expect(
      requirePortalMutation({
        auth: owners.hash.token,
        feature: 'billing',
        action: 'pay',
        resource: { type: 'invoice', id: crossTenant!.invoiceId },
      }),
    ).rejects.toBeInstanceOf(PortalResourceNotFoundError);
  });
});
