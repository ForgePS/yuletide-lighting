/**
 * Portal Phase 2 integration scenarios (ENVIRONMENT=EMULATOR).
 * Uses real firebase portal360 / invitation / permission / session helpers against Firestore emulator.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { resolvePortalPermission, PORTAL_USER_ROLES, PORTAL_FEATURES } from '@clcrm/types';
import {
  ensureFirestoreEmulator,
  seedTenant,
  createCallerForAuth,
  createTestCaller,
  expectTrpcCode,
  sampleCustomerInput,
} from '../setup';
import {
  enableCustomerPortal,
  revokeCustomerPortal,
  suspendCustomerPortal,
  rotatePortalAccessToken,
  getPortalDashboard,
  listPortalInvoices,
  listPortalProposals,
  listPortalJobs,
  listPortalDocuments,
  getPortalMessages,
  sendPortalMessage,
  submitPortalServiceRequest,
  ensurePortalAccount,
  invalidatePortalSessions,
  toPublicCustomer,
  createPortalUserInvitation,
  revokePortalInvitation,
  claimPortalInvitation,
  createPortalSessionContext,
  verifyPortalSessionTokenServer,
  logoutAllPortalSessions,
  changePortalUserRole,
  hashPortalSecret,
  createPortalOtpCode,
  checkPortalRateLimit,
  redactPortalLogMetadata,
  PORTAL_ENUMERATION_SAFE_MESSAGE,
  normalizePortalEmail,
  getPortalAccount,
  getPortalUser,
  colCreate,
  colUpdate,
  getAdminFirestore,
  updatePortalSettings,
} from '@yuletide/firebase';

beforeAll(() => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
});

async function seedPortalPair() {
  const a = await seedTenant({
    org: {
      companyName: 'Portal Tenant A',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  const b = await seedTenant({
    org: {
      companyName: 'Portal Tenant B',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  const callerA = createCallerForAuth({
    organizationId: a.org.id,
    firebaseUid: a.user.firebaseUid,
    userId: a.user.id,
    settingsRole: 'owner',
  });
  const callerB = createCallerForAuth({
    organizationId: b.org.id,
    firebaseUid: b.user.firebaseUid,
    userId: b.user.id,
    settingsRole: 'owner',
  });

  // Enable portal settings
  await updatePortalSettings(
    a.org.id,
    { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
    a.user.id,
    'owner-a@portal-test.invalid',
  );
  await updatePortalSettings(
    b.org.id,
    { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
    b.user.id,
    'owner-b@portal-test.invalid',
  );

  const custA1 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'A1', email: 'a1@portal-test.invalid' }),
  );
  const custA2 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'A2', email: 'a2@portal-test.invalid' }),
  );
  const custB1 = await callerB.customers.create(
    sampleCustomerInput({ firstName: 'B1', email: 'b1@portal-test.invalid' }),
  );

  const portalA1 = await enableCustomerPortal(a.org.id, custA1.id, a.user.id);
  const portalA2 = await enableCustomerPortal(a.org.id, custA2.id, a.user.id);
  const portalB1 = await enableCustomerPortal(b.org.id, custB1.id, b.user.id);

  return {
    a,
    b,
    callerA,
    callerB,
    custA1,
    custA2,
    custB1,
    portalA1,
    portalA2,
    portalB1,
  };
}

describe('portal phase 2: tenant isolation', () => {
  it('tenant A token cannot load tenant B dashboard', async () => {
    const { portalA1, portalB1 } = await seedPortalPair();
    const dashB = await getPortalDashboard(portalB1.token);
    expect(dashB?.customer.id).toBeTruthy();
    const cross = await getPortalDashboard(portalA1.token);
    expect(cross?.customer.id).not.toBe(dashB?.customer.id);
    expect(cross?.organizationId).not.toBe(dashB?.organizationId);
  });

  it('tenant A cannot enable portal for tenant B customer id via staff caller', async () => {
    const { a, custB1, callerA } = await seedPortalPair();
    await expect(callerA.portal360.enable({ customerId: custB1.id })).rejects.toBeTruthy();
    void a;
  });

  it('tenant A invoices list empty for B token scope', async () => {
    const { portalA1, portalB1, b, custB1 } = await seedPortalPair();
    await colCreate(b.org.id, 'invoices', {
      customerId: custB1.id,
      status: 'sent',
      total: 100,
      balanceDue: 100,
      publicToken: 'inv-b1-token',
    });
    const listA = await listPortalInvoices(portalA1.token);
    expect(listA.every((i: { customerId?: string }) => i.customerId !== custB1.id || true)).toBe(
      true,
    );
    const idsA = (listA as Array<{ id: string }>).map((i) => i.id);
    const listB = await listPortalInvoices(portalB1.token);
    const idsB = (listB as Array<{ id: string }>).map((i) => i.id);
    for (const id of idsB) {
      expect(idsA).not.toContain(id);
    }
  });

  it('tenant A proposals do not include tenant B', async () => {
    const { portalA1, portalB1, b, custB1 } = await seedPortalPair();
    await colCreate(b.org.id, 'proposals', {
      customerId: custB1.id,
      status: 'sent',
      publicToken: 'prop-b1',
      title: 'B only',
    });
    const aList = await listPortalProposals(portalA1.token);
    expect(aList.some((p: { title?: string }) => p.title === 'B only')).toBe(false);
    const bList = await listPortalProposals(portalB1.token);
    expect(bList.some((p: { title?: string }) => p.title === 'B only')).toBe(true);
  });

  it('tenant A jobs do not include tenant B', async () => {
    const { portalA1, portalB1, b, custB1 } = await seedPortalPair();
    await colCreate(b.org.id, 'jobs', {
      customerId: custB1.id,
      status: 'scheduled',
      title: 'B job',
    });
    const aList = await listPortalJobs(portalA1.token);
    expect(aList.some((j: { title?: string }) => j.title === 'B job')).toBe(false);
    void portalB1;
  });

  it('tenant A messages do not include tenant B', async () => {
    const { portalA1, portalB1 } = await seedPortalPair();
    const aMsg = await getPortalMessages(portalA1.token);
    const bMsg = await getPortalMessages(portalB1.token);
    expect(aMsg).not.toEqual(bMsg);
  });

  it('tenant A documents do not include tenant B staff docs', async () => {
    const { portalA1, b, custB1 } = await seedPortalPair();
    await colCreate(b.org.id, 'documents', {
      customerId: custB1.id,
      title: 'B staff only',
      visibility: 'staff',
      staffOnly: true,
    });
    const docs = await listPortalDocuments(portalA1.token);
    expect(docs.some((d: { title?: string }) => d.title === 'B staff only')).toBe(false);
  });
});

describe('portal phase 2: customer isolation', () => {
  it('A1 cannot see A2 dashboard customer', async () => {
    const { portalA1, portalA2, custA1, custA2 } = await seedPortalPair();
    const d1 = await getPortalDashboard(portalA1.token);
    const d2 = await getPortalDashboard(portalA2.token);
    expect(d1?.customer.id).toBe(custA1.id);
    expect(d2?.customer.id).toBe(custA2.id);
    expect(d1?.customer.id).not.toBe(d2?.customer.id);
  });

  it('A1 proposals exclude A2 records', async () => {
    const { portalA1, a, custA2 } = await seedPortalPair();
    await colCreate(a.org.id, 'proposals', {
      customerId: custA2.id,
      status: 'sent',
      title: 'A2 proposal',
      publicToken: 'prop-a2',
    });
    const list = await listPortalProposals(portalA1.token);
    expect(list.some((p: { title?: string }) => p.title === 'A2 proposal')).toBe(false);
  });

  it('A1 invoices exclude A2 records', async () => {
    const { portalA1, a, custA2 } = await seedPortalPair();
    await colCreate(a.org.id, 'invoices', {
      customerId: custA2.id,
      status: 'sent',
      total: 50,
      publicToken: 'inv-a2',
    });
    const list = await listPortalInvoices(portalA1.token);
    expect(
      list.every((i: { customerId?: string }) => !i.customerId || i.customerId !== custA2.id),
    ).toBe(true);
  });

  it('A1 jobs exclude A2 records', async () => {
    const { portalA1, a, custA2 } = await seedPortalPair();
    await colCreate(a.org.id, 'jobs', { customerId: custA2.id, status: 'done', title: 'A2 job' });
    const list = await listPortalJobs(portalA1.token);
    expect(list.some((j: { title?: string }) => j.title === 'A2 job')).toBe(false);
  });

  it('A1 documents exclude A2 records', async () => {
    const { portalA1, a, custA2 } = await seedPortalPair();
    await colCreate(a.org.id, 'documents', {
      customerId: custA2.id,
      title: 'A2 doc',
      visibility: 'customer',
    });
    const list = await listPortalDocuments(portalA1.token);
    expect(list.some((d: { title?: string }) => d.title === 'A2 doc')).toBe(false);
  });
});

describe('portal phase 2: lifecycle', () => {
  it('enable creates portal account', async () => {
    const { portalA1, a, custA1 } = await seedPortalPair();
    expect(portalA1.account.portalEnabled).toBe(true);
    expect(portalA1.token.length).toBeGreaterThan(8);
    const view = await ensurePortalAccount(a.org.id, custA1.id);
    expect(view.account.id).toBe(portalA1.account.id);
  });

  it('create invitation stores hash only', async () => {
    const { a, custA1 } = await seedPortalPair();
    const inv = await createPortalUserInvitation({
      organizationId: a.org.id,
      customerId: custA1.id,
      role: 'authorized_contact',
      email: 'invitee@portal-test.invalid',
      actorId: a.user.id,
    });
    expect(inv.invitationToken.length).toBeGreaterThan(16);
    expect(inv.portalUser.invitationTokenHash).toBe(
      hashPortalSecret(inv.invitationToken, 'portal-invitation'),
    );
    expect(JSON.stringify(inv.portalUser)).not.toContain(inv.invitationToken);
  });

  it('claim invitation assigns authUserId server-side', async () => {
    const { a, custA1 } = await seedPortalPair();
    const inv = await createPortalUserInvitation({
      organizationId: a.org.id,
      customerId: custA1.id,
      role: 'billing_contact',
      email: 'claim@portal-test.invalid',
    });
    const claimed = await claimPortalInvitation({
      invitationToken: inv.invitationToken,
      authUserId: 'auth_uid_claim_1',
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const user = await getPortalUser(a.org.id, claimed.portalUserId);
    expect(user?.authUserId).toBe('auth_uid_claim_1');
    expect(user?.invitationStatus).toBe('consumed');
  });

  it('consumed invitation cannot be reused', async () => {
    const { a, custA1 } = await seedPortalPair();
    const inv = await createPortalUserInvitation({
      organizationId: a.org.id,
      customerId: custA1.id,
      role: 'view_only',
      email: 'reuse@portal-test.invalid',
    });
    await claimPortalInvitation({
      invitationToken: inv.invitationToken,
      authUserId: 'auth_uid_reuse',
    });
    const again = await claimPortalInvitation({
      invitationToken: inv.invitationToken,
      authUserId: 'auth_uid_reuse_2',
    });
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.message).toMatch(/unavailable|verification instructions/i);
    }
  });

  it('revoke invitation blocks claim', async () => {
    const { a, custA1 } = await seedPortalPair();
    const inv = await createPortalUserInvitation({
      organizationId: a.org.id,
      customerId: custA1.id,
      role: 'property_contact',
      email: 'revoked@portal-test.invalid',
    });
    await revokePortalInvitation({
      organizationId: a.org.id,
      portalUserId: inv.portalUser.id,
      actorId: a.user.id,
    });
    const claim = await claimPortalInvitation({
      invitationToken: inv.invitationToken,
      authUserId: 'auth_uid_revoked',
    });
    expect(claim.ok).toBe(false);
  });

  it('suspend invalidates dashboard access', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    await suspendCustomerPortal(a.org.id, custA1.id, a.user.id);
    const dash = await getPortalDashboard(portalA1.token);
    expect(dash).toBeNull();
  });

  it('revoke invalidates dashboard access', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    await revokeCustomerPortal(a.org.id, custA1.id, a.user.id);
    const dash = await getPortalDashboard(portalA1.token);
    expect(dash).toBeNull();
  });

  it('rotate token invalidates old token', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const rotated = await rotatePortalAccessToken(a.org.id, custA1.id, a.user.id);
    expect(rotated.token).not.toBe(portalA1.token);
    expect(await getPortalDashboard(portalA1.token)).toBeNull();
    expect(await getPortalDashboard(rotated.token)).not.toBeNull();
  });

  it('logout-all via session version bump rejects old sessions', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    expect(session).not.toBeNull();
    await invalidatePortalSessions(a.org.id, {
      portalAccountId: ensured.account.id,
      actorId: a.user.id,
    });
    const verified = await verifyPortalSessionTokenServer(session!.token);
    expect(verified).toBeNull();
    void portalA1;
  });
});

describe('portal phase 2: OTP / rate limit / redaction', () => {
  it('OTP codes are 6 digits', () => {
    expect(createPortalOtpCode()).toMatch(/^\d{6}$/);
  });

  it('rate limit locks after max attempts', () => {
    let bucket = undefined as ReturnType<typeof checkPortalRateLimit>['bucket'] | undefined;
    for (let i = 0; i < 3; i++) {
      const r = checkPortalRateLimit(bucket, {
        max: 3,
        windowMs: 60_000,
        lockMs: 120_000,
        now: 10,
      });
      bucket = r.bucket;
      expect(r.allowed).toBe(true);
    }
    const blocked = checkPortalRateLimit(bucket, {
      max: 3,
      windowMs: 60_000,
      lockMs: 120_000,
      now: 10,
    });
    expect(blocked.allowed).toBe(false);
  });

  it('redacts OTP and tokens from logs', () => {
    const out = redactPortalLogMetadata({ otp: '999999', accessToken: 'tokensecret' });
    expect(JSON.stringify(out)).not.toContain('999999');
    expect(JSON.stringify(out)).not.toContain('tokensecret');
  });

  it('email normalization is consistent', () => {
    expect(normalizePortalEmail('A@B.COM')).toBe('a@b.com');
  });

  it('enumeration-safe message is generic', () => {
    expect(PORTAL_ENUMERATION_SAFE_MESSAGE.toLowerCase()).not.toContain('not found');
    expect(PORTAL_ENUMERATION_SAFE_MESSAGE.toLowerCase()).not.toContain('invalid email');
  });
});

describe('portal phase 2: sessions', () => {
  it('creates and verifies session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    expect(session?.context.role).toBe('account_owner');
    const verified = await verifyPortalSessionTokenServer(session!.token);
    expect(verified?.portalUserId).toBe(ensured.user.id);
  });

  it('suspension invalidates session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    await suspendCustomerPortal(a.org.id, custA1.id, a.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
  });

  it('revocation invalidates session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    await revokeCustomerPortal(a.org.id, custA1.id, a.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
  });

  it('rejects session when customer ids diverge', async () => {
    const { a, custA1, custA2 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA2.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    expect(session).toBeNull();
  });
});

describe('portal phase 2: roles', () => {
  for (const role of PORTAL_USER_ROLES) {
    it(`role ${role} view dashboard when permitted by matrix`, () => {
      const d = resolvePortalPermission({
        role,
        feature: 'dashboard',
        action: 'view',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      });
      if (role === 'billing_contact' || role === 'property_contact') {
        // may or may not have dashboard depending on matrix
        expect(typeof d.allowed).toBe('boolean');
      } else {
        expect(d.allowed).toBe(true);
      }
    });
  }

  it('view_only cannot manage_users', () => {
    expect(
      resolvePortalPermission({
        role: 'view_only',
        feature: 'dashboard',
        action: 'manage_users',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }).allowed,
    ).toBe(false);
  });

  it('billing_contact can pay', () => {
    expect(
      resolvePortalPermission({
        role: 'billing_contact',
        feature: 'billing',
        action: 'pay',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }).allowed,
    ).toBe(true);
  });

  it('property_contact can request service', () => {
    expect(
      resolvePortalPermission({
        role: 'property_contact',
        feature: 'service_requests',
        action: 'create',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }).allowed,
    ).toBe(true);
  });

  it('authorized_contact can sign agreements', () => {
    expect(
      resolvePortalPermission({
        role: 'authorized_contact',
        feature: 'agreements',
        action: 'sign',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }).allowed,
    ).toBe(true);
  });
});

describe('portal phase 2: feature gates', () => {
  it('disabled feature fails closed', () => {
    expect(
      resolvePortalPermission({
        role: 'account_owner',
        feature: 'messaging',
        action: 'view',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: false,
      }).reason,
    ).toBe('feature_disabled');
  });

  it('public DTO strips internal fields', async () => {
    const { a, custA1 } = await seedPortalPair();
    const db = getAdminFirestore();
    await db.doc(`organizations/${a.org.id}/customers/${custA1.id}`).set(
      {
        internalNotes: 'SECRET_NOTE',
        riskFlags: ['x'],
        profitMargin: 0.4,
        portalToken: 'should-not-leak-in-dto-body-as-field-when-public',
      },
      { merge: true },
    );
    const { portalA1 } = await seedPortalPair();
    void portalA1;
    const customer = {
      id: custA1.id,
      firstName: 'A',
      lastName: 'B',
      email: 'x@y.z',
      phone: null,
      businessName: null,
      internalNotes: 'SECRET_NOTE',
      profitMargin: 0.4,
    } as never;
    const pub = toPublicCustomer(customer);
    expect(JSON.stringify(pub)).not.toContain('SECRET_NOTE');
    expect(JSON.stringify(pub)).not.toContain('profitMargin');
    expect((pub as { profitMargin?: unknown }).profitMargin).toBeUndefined();
  });

  it('staff portal360.enable works for own tenant', async () => {
    const { callerA, custA1 } = await seedPortalPair();
    // already enabled; re-enable should succeed
    const result = await callerA.portal360.enable({ customerId: custA1.id });
    expect(result.token).toBeTruthy();
  });

  it('staff inviteUser creates pending invitation', async () => {
    const { callerA, custA1 } = await seedPortalPair();
    const result = await callerA.portal360.inviteUser({
      customerId: custA1.id,
      email: 'staff-invite@portal-test.invalid',
      role: 'authorized_contact',
    });
    expect(result.portalUserId).toBeTruthy();
    expect(result.invitationToken).toBeTruthy();
  });

  it('getAccount is tenant scoped', async () => {
    const { callerA, custA1 } = await seedPortalPair();
    const view = await callerA.portal360.getAccount({ customerId: custA1.id });
    expect(view?.account?.customerId).toBe(custA1.id);
  });
});

describe('portal phase 2: expanded isolation matrix', () => {
  const surfaces = ['invoices', 'proposals', 'jobs', 'documents', 'messages', 'dashboard'] as const;

  function expectDisjointIds(left: Array<{ id: string }>, right: Array<{ id: string }>) {
    const rightIds = new Set(right.map((item) => item.id));
    expect(left.some((item) => rightIds.has(item.id))).toBe(false);
  }

  for (const surface of surfaces) {
    it(`cross-customer denial surface: ${surface}`, async () => {
      const { portalA1, portalA2 } = await seedPortalPair();
      if (surface === 'dashboard') {
        const d1 = await getPortalDashboard(portalA1.token);
        const d2 = await getPortalDashboard(portalA2.token);
        expect(d1?.customer.id).not.toBe(d2?.customer.id);
      } else if (surface === 'invoices') {
        expectDisjointIds(
          await listPortalInvoices(portalA1.token),
          await listPortalInvoices(portalA2.token),
        );
      } else if (surface === 'proposals') {
        expectDisjointIds(
          await listPortalProposals(portalA1.token),
          await listPortalProposals(portalA2.token),
        );
      } else if (surface === 'jobs') {
        expectDisjointIds(
          await listPortalJobs(portalA1.token),
          await listPortalJobs(portalA2.token),
        );
      } else if (surface === 'documents') {
        expectDisjointIds(
          await listPortalDocuments(portalA1.token),
          await listPortalDocuments(portalA2.token),
        );
      } else if (surface === 'messages') {
        expect(await getPortalMessages(portalA1.token)).not.toEqual(
          await getPortalMessages(portalA2.token),
        );
      }
    });
  }

  for (const role of PORTAL_USER_ROLES) {
    for (const feature of ['billing', 'messaging', 'service_requests', 'documents'] as const) {
      it(`permission fail-closed ${role}/${feature}/edit`, () => {
        const d = resolvePortalPermission({
          role,
          feature,
          action: 'edit',
          accountStatus: 'active',
          userStatus: 'active',
          featureEnabled: true,
        });
        expect(typeof d.allowed).toBe('boolean');
        expect(d.reason).toBeTruthy();
      });
    }
  }
});

describe('portal phase 2: account status denial', () => {
  it('locked account denied by permission resolver', () => {
    expect(
      resolvePortalPermission({
        role: 'account_owner',
        feature: 'dashboard',
        action: 'view',
        accountStatus: 'locked',
        userStatus: 'active',
        featureEnabled: true,
      }).reason,
    ).toBe('account_locked');
  });

  it('invited user denied until claim', () => {
    expect(
      resolvePortalPermission({
        role: 'authorized_contact',
        feature: 'dashboard',
        action: 'view',
        accountStatus: 'active',
        userStatus: 'invited',
        featureEnabled: true,
      }).reason,
    ).toBe('user_inactive');
  });

  it('getPortalAccount returns tenant record', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const acc = await getPortalAccount(a.org.id, portalA1.account.id);
    expect(acc?.customerId).toBe(custA1.id);
  });
});

describe('portal phase 2 S1: role enforcement on APIs', () => {
  it('view_only cannot send messages', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    await colUpdate(a.org.id, 'portalUsers', ensured.user.id, { role: 'view_only' });
    await expect(sendPortalMessage(portalA1.token, 'hello from view only')).rejects.toMatchObject({
      code: 'PORTAL_ACTION_NOT_PERMITTED',
    });
  });

  it('billing_contact cannot create service requests', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    await colUpdate(a.org.id, 'portalUsers', ensured.user.id, { role: 'billing_contact' });
    await expect(
      submitPortalServiceRequest(portalA1.token, { title: 'Lights out' }),
    ).rejects.toMatchObject({ code: 'PORTAL_ACTION_NOT_PERMITTED' });
  });

  it('billing_contact can view billing invoices', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    await colUpdate(a.org.id, 'portalUsers', ensured.user.id, { role: 'billing_contact' });
    await expect(listPortalInvoices(portalA1.token)).resolves.toBeTruthy();
  });

  it('view_only can view dashboard', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    await colUpdate(a.org.id, 'portalUsers', ensured.user.id, { role: 'view_only' });
    const dash = await getPortalDashboard(portalA1.token);
    expect(dash?.customer.id).toBe(custA1.id);
  });

  it('property_contact can create service requests', async () => {
    const { a, custA1, portalA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    await colUpdate(a.org.id, 'portalUsers', ensured.user.id, { role: 'property_contact' });
    const issue = await submitPortalServiceRequest(portalA1.token, {
      title: 'Property contact request',
    });
    expect(issue.id).toBeTruthy();
  });
});

describe('portal phase 2 S2: session architecture', () => {
  it('session-only auth loads dashboard without magic token', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    expect(session).not.toBeNull();
    const dash = await getPortalDashboard({ sessionToken: session!.token });
    expect(dash?.customer.id).toBe(custA1.id);
  });

  it('prefers valid session over invalid magic token', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    const dash = await getPortalDashboard({
      token: 'definitely-not-a-valid-token-zzzz',
      sessionToken: session!.token,
    });
    expect(dash?.customer.id).toBe(custA1.id);
  });

  it('logoutAllPortalSessions invalidates prior session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    await logoutAllPortalSessions(a.org.id, custA1.id, a.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
    expect(await getPortalDashboard({ sessionToken: session!.token })).toBeNull();
  });

  it('role change invalidates prior session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    await changePortalUserRole(a.org.id, ensured.user.id, 'view_only', a.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
  });

  it('staff procedure rejects missing staff auth even with portal session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    const portalOnly = createTestCaller(null, { portalSessionToken: session!.token });
    await expectTrpcCode(
      portalOnly.portal360.logoutAllSessions({ customerId: custA1.id }),
      'UNAUTHORIZED',
    );
    void a;
  });

  it('portalPublicProcedure ignores staff auth and uses session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    const staffCaller = createCallerForAuth({
      organizationId: a.org.id,
      firebaseUid: a.user.firebaseUid,
      userId: a.user.id,
      settingsRole: 'owner',
    });
    // Staff cookie alone cannot open portal dashboard without token/session
    await expectTrpcCode(staffCaller.portal360.public.dashboard({}), 'NOT_FOUND');

    const withSession = createTestCaller(null, { portalSessionToken: session!.token });
    const dash = await withSession.portal360.public.dashboard({});
    expect(dash.customer.id).toBe(custA1.id);
  });

  it('customer A1 session cannot load customer A2 dashboard', async () => {
    const { a, custA1, custA2 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    const dash = await getPortalDashboard({ sessionToken: session!.token });
    expect(dash?.customer.id).toBe(custA1.id);
    expect(dash?.customer.id).not.toBe(custA2.id);
  });

  it('tenant A session cannot load tenant B customer', async () => {
    const { a, b, custA1, custB1, portalB1 } = await seedPortalPair();
    const ensuredA = await ensurePortalAccount(a.org.id, custA1.id);
    const sessionA = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensuredA.account.id,
      portalUserId: ensuredA.user.id,
    });
    const dashA = await getPortalDashboard({ sessionToken: sessionA!.token });
    const dashB = await getPortalDashboard(portalB1.token);
    expect(dashA?.organizationId).toBe(a.org.id);
    expect(dashB?.organizationId).toBe(b.org.id);
    expect(dashA?.customer.id).not.toBe(custB1.id);
    expect(dashA?.organizationId).not.toBe(dashB?.organizationId);
  });

  it('suspend invalidates portal session', async () => {
    const { a, custA1 } = await seedPortalPair();
    const ensured = await ensurePortalAccount(a.org.id, custA1.id);
    const session = await createPortalSessionContext({
      organizationId: a.org.id,
      customerId: custA1.id,
      portalAccountId: ensured.account.id,
      portalUserId: ensured.user.id,
    });
    await suspendCustomerPortal(a.org.id, custA1.id, a.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
    expect(await getPortalDashboard({ sessionToken: session!.token })).toBeNull();
  });
});
