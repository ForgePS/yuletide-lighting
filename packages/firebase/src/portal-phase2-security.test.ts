/**
 * Portal Phase 2 unit tests — permission resolver, crypto, OTP rate limits, redaction.
 * ENVIRONMENT=EMULATOR (pure unit; no live Firebase).
 */
import { describe, expect, it } from 'vitest';
import {
  PORTAL_ACTIONS,
  PORTAL_USER_ROLES,
  listPortalMatrixEntries,
  resolvePortalPermission,
  type PortalAction,
} from '@clcrm/types';
import { PORTAL_FEATURES, type PortalFeatureKey } from '@clcrm/types';
import {
  PORTAL_ENUMERATION_SAFE_MESSAGE,
  checkPortalRateLimit,
  createPortalOtpCode,
  createPortalOpaqueToken,
  hashPortalSecret,
  normalizePortalEmail,
  redactPortalLogMetadata,
  signPortalSessionToken,
  verifyPortalSessionToken,
  timingSafeEqualUtf8,
} from './portal-security';

describe('portal permission resolver', () => {
  it('allows account_owner view on dashboard when active', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'dashboard',
      action: 'view',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d).toEqual({ allowed: true, reason: 'ok' });
  });

  it('rejects suspended account', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'dashboard',
      action: 'view',
      accountStatus: 'suspended',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('account_suspended');
  });

  it('rejects revoked/archived account', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'billing',
      action: 'pay',
      accountStatus: 'archived',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.reason).toBe('account_revoked');
  });

  it('rejects suspended user', () => {
    const d = resolvePortalPermission({
      role: 'authorized_contact',
      feature: 'messaging',
      action: 'message',
      accountStatus: 'active',
      userStatus: 'suspended',
      featureEnabled: true,
    });
    expect(d.reason).toBe('user_suspended');
  });

  it('rejects disabled feature', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'messaging',
      action: 'view',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: false,
    });
    expect(d.reason).toBe('feature_disabled');
  });

  it('rejects view_only manage_users', () => {
    const d = resolvePortalPermission({
      role: 'view_only',
      feature: 'dashboard',
      action: 'manage_users',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('action_not_permitted');
  });

  it('rejects billing_contact service_requests create', () => {
    const d = resolvePortalPermission({
      role: 'billing_contact',
      feature: 'service_requests',
      action: 'create',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.allowed).toBe(false);
  });

  it('allows billing_contact pay on billing', () => {
    const d = resolvePortalPermission({
      role: 'billing_contact',
      feature: 'billing',
      action: 'pay',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.allowed).toBe(true);
  });

  it('rejects unknown role', () => {
    const d = resolvePortalPermission({
      role: 'admin' as never,
      feature: 'dashboard',
      action: 'view',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.reason).toBe('unknown_role');
  });

  it('rejects unknown action', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'dashboard',
      action: 'delete_all' as PortalAction,
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.reason).toBe('unknown_action');
  });

  it('rejects unknown feature', () => {
    const d = resolvePortalPermission({
      role: 'account_owner',
      feature: 'not_a_feature' as PortalFeatureKey,
      action: 'view',
      accountStatus: 'active',
      userStatus: 'active',
      featureEnabled: true,
    });
    expect(d.reason).toBe('unknown_feature');
  });

  it('covers every role × feature with an explicit matrix entry decision', () => {
    const entries = listPortalMatrixEntries();
    expect(entries.length).toBe(PORTAL_USER_ROLES.length * PORTAL_FEATURES.length);
    for (const row of entries) {
      for (const action of PORTAL_ACTIONS) {
        const d = resolvePortalPermission({
          role: row.role,
          feature: row.feature,
          action,
          accountStatus: 'active',
          userStatus: 'active',
          featureEnabled: true,
        });
        if (row.actions.includes(action)) {
          expect(d.allowed).toBe(true);
        } else {
          expect(d.allowed).toBe(false);
        }
      }
    }
  });
});

describe('portal security crypto', () => {
  it('normalizes email', () => {
    expect(normalizePortalEmail('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
  });

  it('hashes secrets stably', () => {
    expect(hashPortalSecret('abc', 'salt')).toBe(hashPortalSecret('abc', 'salt'));
    expect(hashPortalSecret('abc', 'salt')).not.toBe(hashPortalSecret('abc', 'other'));
  });

  it('creates opaque tokens and OTP codes', () => {
    const a = createPortalOpaqueToken();
    const b = createPortalOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
    const otp = createPortalOtpCode(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('signs and verifies portal session tokens', () => {
    const payload = {
      v: 1 as const,
      organizationId: 'org1',
      customerId: 'cust1',
      portalAccountId: 'acc1',
      portalUserId: 'user1',
      role: 'account_owner',
      enabledFeatures: ['dashboard'],
      sessionVersion: 1,
      exp: Date.now() + 60_000,
      iat: Date.now(),
      jti: 'jti1',
    };
    const token = signPortalSessionToken(payload, 'test-secret');
    const verified = verifyPortalSessionToken(token, 'test-secret');
    expect(verified?.portalUserId).toBe('user1');
    expect(verifyPortalSessionToken(token, 'wrong')).toBeNull();
    expect(verifyPortalSessionToken(token.slice(0, -2) + 'xx', 'test-secret')).toBeNull();
  });

  it('rejects expired session payloads', () => {
    const payload = {
      v: 1 as const,
      organizationId: 'org1',
      customerId: 'cust1',
      portalAccountId: 'acc1',
      portalUserId: 'user1',
      role: 'account_owner',
      enabledFeatures: [] as string[],
      sessionVersion: 0,
      exp: Date.now() - 1000,
      iat: Date.now() - 10_000,
      jti: 'jti2',
    };
    const token = signPortalSessionToken(payload, 'test-secret');
    expect(verifyPortalSessionToken(token, 'test-secret')).toBeNull();
  });

  it('timing-safe compares equal strings', () => {
    expect(timingSafeEqualUtf8('abc', 'abc')).toBe(true);
    expect(timingSafeEqualUtf8('abc', 'abd')).toBe(false);
  });
});

describe('portal rate limit + redaction', () => {
  it('enforces max attempts then lock', () => {
    let bucket = undefined as ReturnType<typeof checkPortalRateLimit>['bucket'] | undefined;
    for (let i = 0; i < 5; i++) {
      const r = checkPortalRateLimit(bucket, {
        max: 5,
        windowMs: 60_000,
        lockMs: 300_000,
        now: 1_000,
      });
      expect(r.allowed).toBe(true);
      bucket = r.bucket;
    }
    const blocked = checkPortalRateLimit(bucket, {
      max: 5,
      windowMs: 60_000,
      lockMs: 300_000,
      now: 1_000,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.bucket.lockedUntil).toBeGreaterThan(1_000);
  });

  it('redacts token/otp fields', () => {
    const redacted = redactPortalLogMetadata({
      organizationId: 'org',
      accessToken: 'SECRET_TOKEN_VALUE',
      otpCode: '123456',
      nested: { invitationLink: 'https://x/portal/abc123verysecrettokenvalue' },
    });
    expect(redacted.accessToken).toBe('[REDACTED]');
    expect(redacted.otpCode).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).invitationLink).toBe('[REDACTED]');
    expect(JSON.stringify(redacted)).not.toContain('SECRET_TOKEN');
    expect(JSON.stringify(redacted)).not.toContain('123456');
  });

  it('enumeration-safe message is stable', () => {
    expect(PORTAL_ENUMERATION_SAFE_MESSAGE).toContain('verification instructions');
  });
});
