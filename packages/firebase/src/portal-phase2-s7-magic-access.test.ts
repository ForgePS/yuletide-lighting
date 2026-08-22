/**
 * PORTAL-P2-S7 — magic access hash / generation unit tests.
 * ENVIRONMENT=EMULATOR
 */
import { describe, expect, it } from 'vitest';
import {
  assertEmulatorPortalTokenMigration,
  generatePortalAccessToken,
  hashPortalAccessToken,
  magicAccessFingerprint,
  magicAccessHashesEqual,
  parsePortalAccessTokenHash,
  portalMagicCredentialWriteFields,
  allowLegacyPlaintextMagicTokenLookup,
  getPortalMagicTokenMode,
  isPortalAccountHashReady,
  summarizePortalHashReadiness,
  PORTAL_ACCESS_SECRET_DOMAIN,
} from './portal-magic-access';
import { hashPortalSecret } from './portal-security';

describe('P2-S7 magic access generation', () => {
  it('generates URL-safe high-entropy tokens without Math.random', () => {
    const a = generatePortalAccessToken();
    const b = generatePortalAccessToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toBe(b);
  });
});

describe('P2-S7 magic access hashing', () => {
  it('is deterministic and versioned', () => {
    const raw = generatePortalAccessToken();
    const h1 = hashPortalAccessToken(raw);
    const h2 = hashPortalAccessToken(raw);
    expect(h1).toBe(h2);
    expect(h1.startsWith('v1:')).toBe(true);
    expect(parsePortalAccessTokenHash(h1)?.version).toBe(1);
  });

  it('differs for different tokens', () => {
    expect(hashPortalAccessToken(generatePortalAccessToken())).not.toBe(
      hashPortalAccessToken(generatePortalAccessToken()),
    );
  });

  it('rejects invalid input', () => {
    expect(() => hashPortalAccessToken('short')).toThrow(/INVALID_MAGIC_TOKEN/);
  });

  it('uses portal-magic-access domain distinct from invitation/otp', () => {
    expect(PORTAL_ACCESS_SECRET_DOMAIN).toBe('portal-magic-access');
    const raw = generatePortalAccessToken();
    const magic = hashPortalAccessToken(raw);
    const invitation = `v1:${hashPortalSecret(raw, 'portal-invitation')}`;
    const otp = `v1:${hashPortalSecret(raw, 'portal-otp')}`;
    expect(magic).not.toBe(invitation);
    expect(magic).not.toBe(otp);
    expect(magic).toBe(`v1:${hashPortalSecret(raw, PORTAL_ACCESS_SECRET_DOMAIN)}`);
  });

  it('fails closed on unknown hash version', () => {
    expect(parsePortalAccessTokenHash('v99:' + 'a'.repeat(64))).toBeNull();
    expect(parsePortalAccessTokenHash('not-a-hash')).toBeNull();
  });

  it('hash-only write fields clear plaintext', () => {
    const raw = generatePortalAccessToken();
    const fields = portalMagicCredentialWriteFields(raw);
    expect(fields.accessToken).toBeNull();
    expect(fields.accessTokenHash).toBe(hashPortalAccessToken(raw));
    expect(fields.accessTokenHashVersion).toBe(1);
    expect(magicAccessFingerprint(fields.accessTokenHash)).toHaveLength(8);
  });
});

describe('P2-S7 magic token mode', () => {
  it('defaults to COMPATIBILITY', () => {
    const prev = process.env.PORTAL_MAGIC_TOKEN_MODE;
    delete process.env.PORTAL_MAGIC_TOKEN_MODE;
    expect(getPortalMagicTokenMode()).toBe('COMPATIBILITY');
    expect(allowLegacyPlaintextMagicTokenLookup()).toBe(true);
    process.env.PORTAL_MAGIC_TOKEN_MODE = 'HASH_ONLY';
    expect(getPortalMagicTokenMode()).toBe('HASH_ONLY');
    expect(allowLegacyPlaintextMagicTokenLookup()).toBe(false);
    if (prev === undefined) delete process.env.PORTAL_MAGIC_TOKEN_MODE;
    else process.env.PORTAL_MAGIC_TOKEN_MODE = prev;
  });
});

describe('P2-S7 migration guard', () => {
  it('assertEmulatorPortalTokenMigration throws without emulator host', () => {
    const prevFirestore = process.env.FIRESTORE_EMULATOR_HOST;
    const prevAuth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const prevAllow = process.env.PORTAL_TOKEN_MIGRATION_ALLOW_EMULATOR;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.PORTAL_TOKEN_MIGRATION_ALLOW_EMULATOR;
    expect(() => assertEmulatorPortalTokenMigration()).toThrow(
      /PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED/,
    );
    if (prevFirestore === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = prevFirestore;
    if (prevAuth === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    else process.env.FIREBASE_AUTH_EMULATOR_HOST = prevAuth;
    if (prevAllow === undefined) delete process.env.PORTAL_TOKEN_MIGRATION_ALLOW_EMULATOR;
    else process.env.PORTAL_TOKEN_MIGRATION_ALLOW_EMULATOR = prevAllow;
  });
});

describe('P2-S7 hash equality + fingerprint', () => {
  it('magicAccessHashesEqual compares versioned digests safely', () => {
    const raw = generatePortalAccessToken();
    const h = hashPortalAccessToken(raw);
    expect(magicAccessHashesEqual(h, h)).toBe(true);
    expect(magicAccessHashesEqual(h, hashPortalAccessToken(generatePortalAccessToken()))).toBe(
      false,
    );
    expect(magicAccessHashesEqual('v99:' + 'a'.repeat(64), h)).toBe(false);
    expect(magicAccessHashesEqual('not-a-hash', h)).toBe(false);
  });

  it('magicAccessFingerprint is exactly 8 hex chars for valid hashes', () => {
    const raw = generatePortalAccessToken();
    const fp = magicAccessFingerprint(hashPortalAccessToken(raw));
    expect(fp).toHaveLength(8);
    expect(fp).toMatch(/^[a-f0-9]{8}$/);
    expect(magicAccessFingerprint(null)).toBeNull();
    expect(magicAccessFingerprint('garbage')).toBeNull();
  });
});

describe('YL-S12 HASH_ONLY readiness helpers', () => {
  it('isPortalAccountHashReady requires hash and no plaintext', () => {
    const raw = generatePortalAccessToken();
    const fields = portalMagicCredentialWriteFields(raw);
    expect(isPortalAccountHashReady(fields)).toBe(true);
    expect(isPortalAccountHashReady({ accessTokenHash: fields.accessTokenHash, accessToken: raw })).toBe(
      false,
    );
    expect(isPortalAccountHashReady({ accessToken: raw, accessTokenHash: null })).toBe(false);
  });

  it('summarizePortalHashReadiness reports migrate readiness without flipping mode', () => {
    const raw = generatePortalAccessToken();
    const ready = portalMagicCredentialWriteFields(raw);
    const summary = summarizePortalHashReadiness([
      ready,
      { accessToken: 'legacyplaintexttoken1234', accessTokenHash: null },
      { accessTokenHash: ready.accessTokenHash, accessToken: null },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.hashReady).toBe(2);
    expect(summary.stillHasPlaintext).toBe(1);
    expect(summary.missingHash).toBe(1);
    expect(summary.readyForHashOnly).toBe(false);
    expect(summarizePortalHashReadiness([ready, ready]).readyForHashOnly).toBe(true);
    expect(getPortalMagicTokenMode()).not.toBe('HASH_ONLY'); // default env unchanged by helper
  });
});
