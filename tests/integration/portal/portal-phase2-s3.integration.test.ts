/**
 * PORTAL-P2-S3 invitation, session, OTP, rate-limit, and enumeration evidence.
 * ENVIRONMENT=EMULATOR only: delivery is captured in memory and Firestore writes
 * are directed to the local emulator.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PortalUserRole } from '@clcrm/types';
import {
  createCallerForAuth,
  ensureFirestoreEmulator,
  sampleCustomerInput,
  seedTenant,
} from '../setup';
import {
  PORTAL_PUBLIC_MESSAGES,
  claimPortalInvitation,
  clearEmulatorDeliveryCaptures,
  clearPortalRateLimitBuckets,
  colUpdate,
  consumePortalRateLimit,
  createEmulatorPortalDeliveryProvider,
  createPortalSessionContext,
  createPortalUserInvitation,
  ensurePortalAccount,
  generatePortalQrCode,
  getAdminFirestore,
  getEmulatorInvitationCaptures,
  getEmulatorOtpCaptures,
  getPortalDashboard,
  getPortalSecurityConfig,
  getPortalUser,
  hashPortalSecret,
  resendPortalUserInvitation,
  revokeCustomerPortal,
  revokePortalInvitation,
  sendPortalQrVerificationCode,
  setPortalDeliveryProviderForTests,
  suspendCustomerPortal,
  updatePortalSettings,
  verifyPortalQrCodeAndActivate,
  verifyPortalSessionTokenServer,
} from '@yuletide/firebase';

beforeAll(() => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.PORTAL_DELIVERY_MODE = 'emulator';
  process.env.NODE_ENV = 'test';
});

type Fixture = Awaited<ReturnType<typeof createFixture>>;

let tenant: Awaited<ReturnType<typeof seedTenant>>;
let caller: ReturnType<typeof createCallerForAuth>;
let sequence = 0;

beforeAll(async () => {
  tenant = await seedTenant({
    org: {
      companyName: 'Portal P2 S3 Emulator',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  caller = createCallerForAuth({
    organizationId: tenant.org.id,
    firebaseUid: tenant.user.firebaseUid,
    userId: tenant.user.id,
    settingsRole: 'owner',
  });
  await updatePortalSettings(
    tenant.org.id,
    { enabled: true },
    tenant.user.id,
    'p2-s3-owner@portal-test.invalid',
  );
});

beforeEach(() => {
  clearPortalRateLimitBuckets();
  clearEmulatorDeliveryCaptures();
  setPortalDeliveryProviderForTests(createEmulatorPortalDeliveryProvider());
});

function nextId(label: string): string {
  sequence += 1;
  return `${label}-${sequence}`;
}

async function createFixture(role: PortalUserRole = 'authorized_contact') {
  const id = nextId('fixture');
  const email = `${id}@portal-test.invalid`;
  const customer = await caller.customers.create(
    sampleCustomerInput({
      firstName: 'S3',
      lastName: id,
      email,
      phone: `555${String(sequence).padStart(7, '0').slice(-7)}`,
    }),
  );
  const invitation = await createPortalUserInvitation({
    organizationId: tenant.org.id,
    customerId: customer.id,
    role,
    email,
    actorId: tenant.user.id,
  });
  return { id, email, customer, invitation };
}

async function claimFixture(role: PortalUserRole = 'authorized_contact') {
  const fixture = await createFixture(role);
  const claim = await claimPortalInvitation({
    invitationToken: fixture.invitation.invitationToken,
    authUserId: `auth_${fixture.id}`,
  });
  expect(claim.ok).toBe(true);
  if (!claim.ok) throw new Error('Expected invitation claim to succeed');
  return { ...fixture, claim };
}

async function createQrFixture() {
  const id = nextId('qr');
  const email = `${id}@portal-test.invalid`;
  const phone = `555${String(sequence).padStart(7, '0').slice(-7)}`;
  const customer = await caller.customers.create(
    sampleCustomerInput({ firstName: 'QR', lastName: id, email, phone }),
  );
  const generated = await generatePortalQrCode(tenant.org.id, {
    customerId: customer.id,
    type: 'customer_portal',
    accessMode: 'activation',
    requireIdentityVerification: true,
    reusable: false,
    userId: tenant.user.id,
  });
  return { id, email, phone, customer, ...generated };
}

async function issueQrOtp() {
  const fixture = await createQrFixture();
  const sent = await sendPortalQrVerificationCode(fixture.rawToken, {
    channel: 'email',
    contact: fixture.email,
  });
  const capture = getEmulatorOtpCaptures().at(-1);
  expect(sent.sent).toBe(true);
  expect(capture).toBeTruthy();
  return { ...fixture, sent, capture: capture! };
}

async function invitationFailure(
  mutate: (fixture: Fixture) => Promise<void>,
): Promise<{ ok: false; message: string }> {
  const fixture = await createFixture();
  await mutate(fixture);
  const result = await claimPortalInvitation({
    invitationToken: fixture.invitation.invitationToken,
    authUserId: `auth_failure_${fixture.id}`,
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected invitation claim to fail');
  return result;
}

describe('PORTAL-P2-S3 invitations', () => {
  it('stores an invitation hash and never the raw token on the portal user', async () => {
    const { invitation } = await createFixture();
    const stored = await getPortalUser(tenant.org.id, invitation.portalUser.id);
    expect(stored?.invitationTokenHash).toBe(
      hashPortalSecret(invitation.invitationToken, 'portal-invitation'),
    );
    expect(JSON.stringify(stored)).not.toContain(invitation.invitationToken);
  });

  it('captures invitation delivery only in the emulator adapter', async () => {
    const { invitation } = await createFixture();
    expect(getEmulatorInvitationCaptures().at(-1)?.invitationToken).toBe(
      invitation.invitationToken,
    );
  });

  it('normalizes invitation email before persistence', async () => {
    const fixture = await createFixture();
    expect(fixture.invitation.portalUser.normalizedEmail).toBe(fixture.email.toLowerCase());
  });

  it('rejects a wrong invitation token with the public message', async () => {
    const result = await claimPortalInvitation({
      invitationToken: 'deterministic-bogus-invitation-token',
      authUserId: 'auth_wrong_token',
    });
    expect(result).toEqual({ ok: false, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable });
  });

  it('rejects an expired invitation', async () => {
    const result = await invitationFailure(async ({ invitation }) => {
      await colUpdate(tenant.org.id, 'portalUsers', invitation.portalUser.id, {
        invitationExpiresAt: new Date(1),
      });
    });
    expect(result.message).toBe(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('marks an expired invitation expired and clears its hash', async () => {
    const fixture = await createFixture();
    await colUpdate(tenant.org.id, 'portalUsers', fixture.invitation.portalUser.id, {
      invitationExpiresAt: new Date(1),
    });
    await claimPortalInvitation({
      invitationToken: fixture.invitation.invitationToken,
      authUserId: `auth_expired_${fixture.id}`,
    });
    const stored = await getPortalUser(tenant.org.id, fixture.invitation.portalUser.id);
    expect(stored?.invitationStatus).toBe('expired');
    expect(stored?.invitationTokenHash).toBeNull();
  });

  it('rejects a revoked invitation', async () => {
    const result = await invitationFailure(async ({ invitation }) => {
      await revokePortalInvitation({
        organizationId: tenant.org.id,
        portalUserId: invitation.portalUser.id,
        actorId: tenant.user.id,
      });
    });
    expect(result.message).toBe(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('revocation clears the invitation hash', async () => {
    const fixture = await createFixture();
    await revokePortalInvitation({
      organizationId: tenant.org.id,
      portalUserId: fixture.invitation.portalUser.id,
    });
    expect(
      (await getPortalUser(tenant.org.id, fixture.invitation.portalUser.id))?.invitationTokenHash,
    ).toBeNull();
  });

  it('rejects the old token after invitation resend replacement', async () => {
    const fixture = await createFixture();
    await colUpdate(tenant.org.id, 'portalUsers', fixture.invitation.portalUser.id, {
      invitationSentAt: new Date(1),
    });
    const replacement = await resendPortalUserInvitation({
      organizationId: tenant.org.id,
      portalUserId: fixture.invitation.portalUser.id,
      actorId: tenant.user.id,
    });
    const oldClaim = await claimPortalInvitation({
      invitationToken: fixture.invitation.invitationToken,
      authUserId: `auth_old_${fixture.id}`,
    });
    expect(oldClaim).toEqual({
      ok: false,
      message: PORTAL_PUBLIC_MESSAGES.accessUnavailable,
    });
    expect(replacement.invitationToken).not.toBe(fixture.invitation.invitationToken);
  });

  it('allows the replacement invitation token to be claimed', async () => {
    const fixture = await createFixture();
    await colUpdate(tenant.org.id, 'portalUsers', fixture.invitation.portalUser.id, {
      invitationSentAt: new Date(1),
    });
    const replacement = await resendPortalUserInvitation({
      organizationId: tenant.org.id,
      portalUserId: fixture.invitation.portalUser.id,
    });
    const result = await claimPortalInvitation({
      invitationToken: replacement.invitationToken,
      authUserId: `auth_replacement_${fixture.id}`,
    });
    expect(result.ok).toBe(true);
  });

  it('enforces invitation resend cooldown', async () => {
    const fixture = await createFixture();
    await expect(
      resendPortalUserInvitation({
        organizationId: tenant.org.id,
        portalUserId: fixture.invitation.portalUser.id,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.tryAgainLater);
  });

  it('rejects reuse of a consumed invitation', async () => {
    const fixture = await claimFixture();
    const result = await claimPortalInvitation({
      invitationToken: fixture.invitation.invitationToken,
      authUserId: `auth_reuse_${fixture.id}`,
    });
    expect(result).toEqual({ ok: false, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable });
  });

  it('allows exactly one concurrent invitation claim', async () => {
    const fixture = await createFixture();
    const results = await Promise.all([
      claimPortalInvitation({
        invitationToken: fixture.invitation.invitationToken,
        authUserId: `auth_concurrent_a_${fixture.id}`,
      }),
      claimPortalInvitation({
        invitationToken: fixture.invitation.invitationToken,
        authUserId: `auth_concurrent_b_${fixture.id}`,
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });

  it('rejects claim when the portal account is suspended', async () => {
    const result = await invitationFailure(async ({ customer }) => {
      await suspendCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    });
    expect(result.message).toBe(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('rejects claim when the portal account is revoked', async () => {
    const result = await invitationFailure(async ({ customer }) => {
      await revokeCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    });
    expect(result.message).toBe(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('rejects claim when the invited portal user is suspended', async () => {
    const result = await invitationFailure(async ({ invitation }) => {
      await colUpdate(tenant.org.id, 'portalUsers', invitation.portalUser.id, {
        status: 'suspended',
      });
    });
    expect(result.message).toBe(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('preserves the server-selected invited role during claim', async () => {
    const fixture = await claimFixture('billing_contact');
    const stored = await getPortalUser(tenant.org.id, fixture.claim.portalUserId);
    expect(stored?.role).toBe('billing_contact');
  });

  it('binds claimed auth user id server-side', async () => {
    const fixture = await claimFixture();
    const stored = await getPortalUser(tenant.org.id, fixture.claim.portalUserId);
    expect(stored?.authUserId).toBe(`auth_${fixture.id}`);
  });

  it('marks a successful invitation consumed and removes its hash', async () => {
    const fixture = await claimFixture();
    const stored = await getPortalUser(tenant.org.id, fixture.claim.portalUserId);
    expect(stored?.invitationStatus).toBe('consumed');
    expect(stored?.invitationTokenHash).toBeNull();
  });

  it('returns the same public message for unknown, expired, and revoked tokens', async () => {
    const expired = await invitationFailure(async ({ invitation }) => {
      await colUpdate(tenant.org.id, 'portalUsers', invitation.portalUser.id, {
        invitationExpiresAt: new Date(1),
      });
    });
    const revoked = await invitationFailure(async ({ invitation }) => {
      await revokePortalInvitation({
        organizationId: tenant.org.id,
        portalUserId: invitation.portalUser.id,
      });
    });
    const unknown = await claimPortalInvitation({
      invitationToken: 'unknown-token-message-parity',
      authUserId: 'auth_unknown_parity',
    });
    expect([expired, revoked, unknown].map((result) => result.message)).toEqual([
      PORTAL_PUBLIC_MESSAGES.accessUnavailable,
      PORTAL_PUBLIC_MESSAGES.accessUnavailable,
      PORTAL_PUBLIC_MESSAGES.accessUnavailable,
    ]);
  });
});

describe('PORTAL-P2-S3 invitation sessions', () => {
  it('creates a session for a claimed invitation', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(session).not.toBeNull();
  });

  it('binds session organization to the claim organization', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(session?.context.organizationId).toBe(tenant.org.id);
  });

  it('binds session customer to the invited customer', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(session?.context.customerId).toBe(fixture.customer.id);
  });

  it('binds session role to the stored portal user role', async () => {
    const fixture = await claimFixture('property_contact');
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(session?.context.role).toBe('property_contact');
  });

  it('includes the current session version', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(session?.context.sessionVersion).toBe(0);
  });

  it('does not put OTP or invitation secrets in session JSON', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(JSON.stringify(session)).not.toMatch(
      /otp|invitationToken|invitationTokenHash|codeHash/i,
    );
    expect(JSON.stringify(session)).not.toContain(fixture.invitation.invitationToken);
  });

  it('verifies a newly established invitation session', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    expect(await verifyPortalSessionTokenServer(session!.token)).toEqual(session!.context);
  });

  it('rejects session creation with a mismatched customer', async () => {
    const fixture = await claimFixture();
    const other = await createFixture();
    expect(
      await createPortalSessionContext({
        organizationId: fixture.claim.organizationId,
        customerId: other.customer.id,
        portalAccountId: fixture.claim.portalAccountId,
        portalUserId: fixture.claim.portalUserId,
      }),
    ).toBeNull();
  });

  it('invalidates an invitation session after account suspension', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    await suspendCustomerPortal(tenant.org.id, fixture.customer.id, tenant.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
  });

  it('invalidates an invitation session after account revocation', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    await revokeCustomerPortal(tenant.org.id, fixture.customer.id, tenant.user.id);
    expect(await verifyPortalSessionTokenServer(session!.token)).toBeNull();
  });

  it('rejects a bogus session token', async () => {
    expect(await verifyPortalSessionTokenServer('bogus-session-token')).toBeNull();
  });

  it('loads the claimed customer dashboard through session auth', async () => {
    const fixture = await claimFixture();
    const session = await createPortalSessionContext({
      organizationId: fixture.claim.organizationId,
      customerId: fixture.claim.customerId,
      portalAccountId: fixture.claim.portalAccountId,
      portalUserId: fixture.claim.portalUserId,
    });
    const dashboard = await getPortalDashboard({ sessionToken: session!.token });
    expect(dashboard?.customer.id).toBe(fixture.customer.id);
  });
});

describe('PORTAL-P2-S3 QR OTP', () => {
  it('sends an OTP for a valid QR contact through emulator delivery', async () => {
    const fixture = await issueQrOtp();
    expect(fixture.sent.sent).toBe(true);
    expect(fixture.capture.to).toBe(fixture.email);
  });

  it('stores the OTP hash but not the raw OTP in Firestore', async () => {
    const fixture = await issueQrOtp();
    const snap = await getAdminFirestore()
      .collection(`organizations/${tenant.org.id}/portalQrVerifications`)
      .where('qrCodeId', '==', fixture.qr.id)
      .get();
    expect(snap.size).toBe(1);
    const json = JSON.stringify(snap.docs[0]!.data());
    expect(json).not.toContain(fixture.capture.otp);
    expect(snap.docs[0]!.data().codeHash).toBe(hashPortalSecret(fixture.capture.otp, 'portal-otp'));
  });

  it('never persists the raw QR token in the QR document', async () => {
    const fixture = await createQrFixture();
    const snap = await getAdminFirestore()
      .doc(`organizations/${tenant.org.id}/portalQrCodes/${fixture.qr.id}`)
      .get();
    expect(JSON.stringify(snap.data())).not.toContain(fixture.rawToken);
    expect(snap.data()?.token).toBeNull();
  });

  it('activates with the correct OTP', async () => {
    const fixture = await issueQrOtp();
    const result = await verifyPortalQrCodeAndActivate(fixture.rawToken, {
      code: fixture.capture.otp,
      acceptTerms: true,
    });
    expect(result.activated).toBe(true);
    expect(result.portalUrl).toContain('/portal/');
  });

  it('rejects an incorrect OTP with access unavailable', async () => {
    const fixture = await issueQrOtp();
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: '000000',
        acceptTerms: true,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('rejects OTP reuse after successful activation', async () => {
    const fixture = await issueQrOtp();
    await verifyPortalQrCodeAndActivate(fixture.rawToken, {
      code: fixture.capture.otp,
      acceptTerms: true,
    });
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: fixture.capture.otp,
        acceptTerms: true,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('requires terms acceptance before OTP activation', async () => {
    const fixture = await issueQrOtp();
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: fixture.capture.otp,
        acceptTerms: false,
      }),
    ).rejects.toThrow(/accept/i);
  });

  it('rejects a wrong contact without capturing an OTP', async () => {
    const fixture = await createQrFixture();
    const result = await sendPortalQrVerificationCode(fixture.rawToken, {
      channel: 'email',
      contact: 'wrong-contact@portal-test.invalid',
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe(PORTAL_PUBLIC_MESSAGES.verificationSent);
    expect(getEmulatorOtpCaptures()).toHaveLength(0);
  });

  it('uses the same response for a bogus QR token and wrong contact', async () => {
    const fixture = await createQrFixture();
    const wrongContact = await sendPortalQrVerificationCode(fixture.rawToken, {
      channel: 'email',
      contact: 'wrong-parity@portal-test.invalid',
    });
    clearPortalRateLimitBuckets();
    const bogus = await sendPortalQrVerificationCode('deterministic-bogus-qr-token', {
      channel: 'email',
      contact: fixture.email,
    });
    expect(bogus.sent).toBe(wrongContact.sent);
    expect(bogus.maskedDestination).toBe(wrongContact.maskedDestination);
    expect(bogus.reason).toBe(wrongContact.reason);
  });

  it('enforces immediate OTP resend cooldown', async () => {
    const fixture = await issueQrOtp();
    clearPortalRateLimitBuckets();
    const second = await sendPortalQrVerificationCode(fixture.rawToken, {
      channel: 'email',
      contact: fixture.email,
    });
    expect(second.sent).toBe(false);
    expect(second.reason).toBe(PORTAL_PUBLIC_MESSAGES.verificationSent);
  });

  it('allows resend after moving the prior verification before cooldown', async () => {
    const fixture = await issueQrOtp();
    const snap = await getAdminFirestore()
      .collection(`organizations/${tenant.org.id}/portalQrVerifications`)
      .where('qrCodeId', '==', fixture.qr.id)
      .get();
    await colUpdate(tenant.org.id, 'portalQrVerifications', snap.docs[0]!.id, {
      createdAt: new Date(1),
    });
    clearPortalRateLimitBuckets();
    const second = await sendPortalQrVerificationCode(fixture.rawToken, {
      channel: 'email',
      contact: fixture.email,
    });
    expect(second.sent).toBe(true);
    expect(getEmulatorOtpCaptures()).toHaveLength(2);
  });

  it('locks an OTP after the configured number of bad attempts', async () => {
    const fixture = await issueQrOtp();
    const max = getPortalSecurityConfig().otpMaxAttempts;
    for (let attempt = 0; attempt < max; attempt += 1) {
      await expect(
        verifyPortalQrCodeAndActivate(fixture.rawToken, {
          code: '000000',
          acceptTerms: true,
        }),
      ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
    }
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: fixture.capture.otp,
        acceptTerms: true,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('rejects an OTP whose persisted purpose is not portal_access', async () => {
    const fixture = await issueQrOtp();
    const snap = await getAdminFirestore()
      .collection(`organizations/${tenant.org.id}/portalQrVerifications`)
      .where('qrCodeId', '==', fixture.qr.id)
      .get();
    await colUpdate(tenant.org.id, 'portalQrVerifications', snap.docs[0]!.id, {
      purpose: 'account_recovery',
    });
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: fixture.capture.otp,
        acceptTerms: true,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });

  it('rejects an expired OTP even when its code is correct', async () => {
    const fixture = await issueQrOtp();
    const snap = await getAdminFirestore()
      .collection(`organizations/${tenant.org.id}/portalQrVerifications`)
      .where('qrCodeId', '==', fixture.qr.id)
      .get();
    await colUpdate(tenant.org.id, 'portalQrVerifications', snap.docs[0]!.id, {
      expiresAt: new Date(1),
    });
    await expect(
      verifyPortalQrCodeAndActivate(fixture.rawToken, {
        code: fixture.capture.otp,
        acceptTerms: true,
      }),
    ).rejects.toThrow(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  });
});

describe('PORTAL-P2-S3 deterministic rate limiting', () => {
  it('allows requests through the configured maximum', () => {
    const config = getPortalSecurityConfig();
    for (let count = 0; count < config.otpRequestMaxPerWindow; count += 1) {
      expect(
        consumePortalRateLimit('s3:allow-through-max', {
          max: config.otpRequestMaxPerWindow,
          now: 1_000,
        }).allowed,
      ).toBe(true);
    }
  });

  it('blocks the request after the configured maximum', () => {
    const key = 's3:block-after-max';
    for (let count = 0; count < 3; count += 1) {
      consumePortalRateLimit(key, { max: 3, now: 1_000, lockMs: 5_000 });
    }
    expect(consumePortalRateLimit(key, { max: 3, now: 1_000, lockMs: 5_000 }).allowed).toBe(false);
  });

  it('returns retry-after when locked', () => {
    const key = 's3:retry-after';
    for (let count = 0; count < 3; count += 1) {
      consumePortalRateLimit(key, { max: 3, now: 1_000, lockMs: 5_000 });
    }
    expect(consumePortalRateLimit(key, { max: 3, now: 1_000, lockMs: 5_000 }).retryAfterMs).toBe(
      5_000,
    );
  });

  it('isolates independent bucket keys', () => {
    for (let count = 0; count < 3; count += 1) {
      consumePortalRateLimit('s3:key-a', { max: 3, now: 1_000 });
    }
    expect(consumePortalRateLimit('s3:key-a', { max: 3, now: 1_000 }).allowed).toBe(false);
    expect(consumePortalRateLimit('s3:key-b', { max: 3, now: 1_000 }).allowed).toBe(true);
  });

  it('clears all buckets deterministically', () => {
    for (let count = 0; count < 3; count += 1) {
      consumePortalRateLimit('s3:clear', { max: 3, now: 1_000 });
    }
    clearPortalRateLimitBuckets();
    expect(consumePortalRateLimit('s3:clear', { max: 3, now: 1_000 }).allowed).toBe(true);
  });

  it('opens a new window after the configured duration', () => {
    const key = 's3:new-window';
    for (let count = 0; count < 3; count += 1) {
      consumePortalRateLimit(key, {
        max: 3,
        now: 1_000,
        windowMs: 1_000,
        lockMs: 500,
      });
    }
    consumePortalRateLimit(key, { max: 3, now: 1_000, windowMs: 1_000, lockMs: 500 });
    expect(
      consumePortalRateLimit(key, {
        max: 3,
        now: 2_001,
        windowMs: 1_000,
        lockMs: 500,
      }).allowed,
    ).toBe(true);
  });
});

describe('PORTAL-P2-S3 security config boundaries', () => {
  const clamps: Array<[string, Parameters<typeof getPortalSecurityConfig>[0], string, number]> = [
    ['invitation TTL minimum', { invitationTtlMinutes: 0 }, 'invitationTtlMinutes', 60],
    ['OTP TTL minimum', { otpTtlMinutes: 0 }, 'otpTtlMinutes', 1],
    ['OTP length minimum', { otpLength: 1 }, 'otpLength', 6],
    ['OTP attempt minimum', { otpMaxAttempts: 1 }, 'otpMaxAttempts', 3],
    ['OTP lockout minimum', { otpLockoutMinutes: 0 }, 'otpLockoutMinutes', 1],
    ['OTP cooldown minimum', { otpResendCooldownSeconds: 0 }, 'otpResendCooldownSeconds', 15],
    ['OTP request minimum', { otpRequestMaxPerWindow: 0 }, 'otpRequestMaxPerWindow', 3],
    ['OTP window minimum', { otpRequestWindowMinutes: 0 }, 'otpRequestWindowMinutes', 1],
    [
      'invitation cooldown minimum',
      { invitationResendCooldownSeconds: 0 },
      'invitationResendCooldownSeconds',
      15,
    ],
    [
      'invitation claim minimum',
      { invitationClaimMaxPerWindow: 0 },
      'invitationClaimMaxPerWindow',
      5,
    ],
    [
      'invitation claim window minimum',
      { invitationClaimWindowMinutes: 0 },
      'invitationClaimWindowMinutes',
      1,
    ],
  ];

  it.each(clamps)('clamps %s', (_label, overrides, field, expected) => {
    expect(
      getPortalSecurityConfig(overrides)[field as keyof ReturnType<typeof getPortalSecurityConfig>],
    ).toBe(expected);
  });

  const publicMessageCases = [
    ['accessUnavailable', 'expired'],
    ['accessUnavailable', 'revoked'],
    ['accessUnavailable', 'customer'],
    ['accessUnavailable', 'organization'],
    ['verificationSent', 'not found'],
    ['verificationSent', 'email exists'],
    ['tryAgainLater', 'attempt count'],
  ] as const;

  it.each(publicMessageCases)('%s does not disclose "%s"', (messageKey, forbiddenFragment) => {
    expect(PORTAL_PUBLIC_MESSAGES[messageKey].toLowerCase()).not.toContain(forbiddenFragment);
  });
});

describe('PORTAL-P2-S3 dashboard enumeration parity', () => {
  it('returns null for a bogus access token', async () => {
    expect(await getPortalDashboard('deterministic-bogus-dashboard-token')).toBeNull();
  });

  it('returns null for a missing access token', async () => {
    expect(await getPortalDashboard('')).toBeNull();
  });

  it('returns null for a suspended account token', async () => {
    const fixture = await createFixture();
    const ensured = await ensurePortalAccount(tenant.org.id, fixture.customer.id, {
      portalEnabled: true,
      status: 'active',
    });
    await suspendCustomerPortal(tenant.org.id, fixture.customer.id, tenant.user.id);
    expect(await getPortalDashboard(ensured.token)).toBeNull();
  });

  it('returns null for a revoked account token', async () => {
    const fixture = await createFixture();
    const ensured = await ensurePortalAccount(tenant.org.id, fixture.customer.id, {
      portalEnabled: true,
      status: 'active',
    });
    await revokeCustomerPortal(tenant.org.id, fixture.customer.id, tenant.user.id);
    expect(await getPortalDashboard(ensured.token)).toBeNull();
  });
});
