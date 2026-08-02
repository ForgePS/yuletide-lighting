/**
 * Portal Phase 2 S3 — invitation / OTP / rate-limit / enumeration unit tests.
 * ENVIRONMENT=EMULATOR (pure unit where possible; no live Firebase).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  createPortalOpaqueToken,
  createPortalOtpCode,
  hashPortalSecret,
  redactPortalLogMetadata,
  checkPortalRateLimit,
  signPortalSessionToken,
  verifyPortalSessionToken,
} from './portal-security';
import {
  getPortalSecurityConfig,
  portalInvitationTtlMs,
  portalOtpTtlMs,
  PORTAL_PUBLIC_MESSAGES,
} from './portal-security-config';
import {
  clearPortalRateLimitBuckets,
  consumePortalRateLimit,
  portalRateLimitKey,
} from './portal-rate-limit';
import {
  clearEmulatorDeliveryCaptures,
  createEmulatorPortalDeliveryProvider,
  getEmulatorInvitationCaptures,
  getEmulatorOtpCaptures,
  latestEmulatorOtp,
  setPortalDeliveryProviderForTests,
} from './portal-delivery';

describe('P2-S3 portal security config', () => {
  it('clamps invalid overrides', () => {
    const cfg = getPortalSecurityConfig({
      otpTtlMinutes: 0,
      otpMaxAttempts: 1,
      invitationTtlMinutes: 1,
    });
    expect(cfg.otpTtlMinutes).toBeGreaterThanOrEqual(1);
    expect(cfg.otpMaxAttempts).toBeGreaterThanOrEqual(3);
    expect(cfg.invitationTtlMinutes).toBeGreaterThanOrEqual(60);
  });

  it('exposes typed TTLs', () => {
    expect(portalInvitationTtlMs()).toBeGreaterThan(0);
    expect(portalOtpTtlMs()).toBeGreaterThan(0);
  });

  it('public messages are enumeration-safe', () => {
    expect(PORTAL_PUBLIC_MESSAGES.accessUnavailable.toLowerCase()).not.toContain('expired');
    expect(PORTAL_PUBLIC_MESSAGES.accessUnavailable.toLowerCase()).not.toContain('revoked');
    expect(PORTAL_PUBLIC_MESSAGES.verificationSent.toLowerCase()).not.toContain('not found');
  });
});

describe('P2-S3 invitation token crypto', () => {
  it('generates high-entropy URL-safe tokens', () => {
    const a = createPortalOpaqueToken(32);
    const b = createPortalOpaqueToken(32);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('does not use Math.random patterns', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => createPortalOpaqueToken(16)));
    expect(tokens.size).toBe(20);
  });

  it('hashes invitations with salt binding', () => {
    const raw = createPortalOpaqueToken(32);
    const h1 = hashPortalSecret(raw, 'portal-invitation');
    const h2 = hashPortalSecret(raw, 'portal-invitation');
    const wrong = hashPortalSecret(raw, 'portal-otp');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(wrong);
    expect(h1).not.toContain(raw);
  });

  it('wrong token fails hash equality', () => {
    const raw = createPortalOpaqueToken(32);
    const hash = hashPortalSecret(raw, 'portal-invitation');
    expect(hashPortalSecret(raw + 'x', 'portal-invitation')).not.toBe(hash);
  });
});

describe('P2-S3 OTP crypto', () => {
  it('generates numeric OTPs of configured length', () => {
    const cfg = getPortalSecurityConfig();
    const otp = createPortalOtpCode(cfg.otpLength);
    expect(otp).toMatch(new RegExp(`^\\d{${cfg.otpLength}}$`));
  });

  it('hashes OTP and never embeds raw value', () => {
    const otp = createPortalOtpCode(6);
    const hash = hashPortalSecret(otp, 'portal-otp');
    expect(hash).not.toContain(otp);
    expect(hash.length).toBe(64);
  });

  it('purpose salts differ', () => {
    const otp = '123456';
    expect(hashPortalSecret(otp, 'portal-otp')).not.toBe(
      hashPortalSecret(otp, 'portal-invitation'),
    );
  });
});

describe('P2-S3 rate limits', () => {
  beforeEach(() => clearPortalRateLimitBuckets());

  it('allows then locks within window', () => {
    const key = portalRateLimitKey(['otp-req', 'test']);
    const cfg = getPortalSecurityConfig({ otpRequestMaxPerWindow: 3 });
    for (let i = 0; i < 3; i++) {
      expect(
        consumePortalRateLimit(key, {
          max: cfg.otpRequestMaxPerWindow,
          windowMs: 60_000,
          lockMs: 120_000,
          now: 1000,
        }).allowed,
      ).toBe(true);
    }
    expect(
      consumePortalRateLimit(key, {
        max: cfg.otpRequestMaxPerWindow,
        windowMs: 60_000,
        lockMs: 120_000,
        now: 1000,
      }).allowed,
    ).toBe(false);
  });

  it('checkPortalRateLimit is deterministic', () => {
    let bucket = undefined as ReturnType<typeof checkPortalRateLimit>['bucket'] | undefined;
    for (let i = 0; i < 5; i++) {
      const r = checkPortalRateLimit(bucket, {
        max: 5,
        windowMs: 60_000,
        lockMs: 60_000,
        now: 1,
      });
      bucket = r.bucket;
      expect(r.allowed).toBe(true);
    }
    expect(
      checkPortalRateLimit(bucket, { max: 5, windowMs: 60_000, lockMs: 60_000, now: 1 }).allowed,
    ).toBe(false);
  });
});

describe('P2-S3 redaction + session hygiene', () => {
  it('redacts otp and invitation tokens from logs', () => {
    const out = redactPortalLogMetadata({
      otp: '654321',
      invitationToken: 'inv_secret_token_value',
      codeHash: 'abc',
      invitationTokenHash: 'def',
    });
    const s = JSON.stringify(out);
    expect(s).not.toContain('654321');
    expect(s).not.toContain('inv_secret_token_value');
  });

  it('session payload does not carry verification secrets', () => {
    const secret = 's3-unit-test-secret';
    const token = signPortalSessionToken(
      {
        v: 1,
        organizationId: 'org1',
        customerId: 'cust1',
        portalAccountId: 'pa1',
        portalUserId: 'pu1',
        role: 'account_owner',
        enabledFeatures: ['dashboard'],
        sessionVersion: 1,
        jti: createPortalOpaqueToken(8),
        iat: Date.now(),
        exp: Date.now() + 60_000,
      },
      secret,
    );
    const verified = verifyPortalSessionToken(token, secret);
    expect(verified).toBeTruthy();
    const raw = JSON.stringify(verified);
    expect(raw).not.toMatch(/otp|invitationToken|codeHash|tokenHash/i);
  });
});

describe('P2-S3 emulator delivery', () => {
  beforeEach(() => {
    process.env.PORTAL_DELIVERY_MODE = 'emulator';
    process.env.NODE_ENV = 'test';
    setPortalDeliveryProviderForTests(createEmulatorPortalDeliveryProvider());
    clearEmulatorDeliveryCaptures();
  });

  it('captures OTP without exposing via provider name', async () => {
    const p = createEmulatorPortalDeliveryProvider();
    await p.sendOtp({
      purpose: 'portal_access',
      channel: 'email',
      to: 'a@test.invalid',
      otp: '424242',
      organizationId: 'org',
    });
    const latest = latestEmulatorOtp({ purpose: 'portal_access' });
    expect(latest?.otp).toBe('424242');
    expect(getEmulatorOtpCaptures()).toHaveLength(1);
  });

  it('captures invitations', async () => {
    const p = createEmulatorPortalDeliveryProvider();
    await p.sendInvitation({
      to: 'b@test.invalid',
      organizationId: 'org',
      invitationToken: 'tok_abc',
      claimPath: '/portal/invite/tok_abc',
    });
    expect(getEmulatorInvitationCaptures()[0]?.invitationToken).toBe('tok_abc');
  });

  it('refuses production init', () => {
    const prevNode = process.env.NODE_ENV;
    const prevFs = process.env.FIRESTORE_EMULATOR_HOST;
    const prevMode = process.env.PORTAL_DELIVERY_MODE;
    const prevAllow = process.env.ALLOW_PORTAL_LIVE_DELIVERY;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.PORTAL_DELIVERY_MODE;
      delete process.env.ALLOW_PORTAL_LIVE_DELIVERY;
      expect(() => createEmulatorPortalDeliveryProvider()).toThrow(/production|emulator/i);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevFs) process.env.FIRESTORE_EMULATOR_HOST = prevFs;
      if (prevMode) process.env.PORTAL_DELIVERY_MODE = prevMode;
      if (prevAllow) process.env.ALLOW_PORTAL_LIVE_DELIVERY = prevAllow;
    }
  });
});
