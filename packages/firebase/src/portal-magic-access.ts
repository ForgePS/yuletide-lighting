/**
 * PORTAL-P2-S7 — canonical magic-access credential hashing, resolution, and hash-only writes.
 * ENVIRONMENT=EMULATOR for automated evidence. Production token migration is PROHIBITED.
 */
import { getAdminFirestore } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import type { PortalAccount } from '@clcrm/types';
import {
  createPortalOpaqueToken,
  hashPortalSecret,
  redactPortalLogMetadata,
  timingSafeEqualHex,
  timingSafeEqualUtf8,
} from './portal-security';

export type PortalCredentialKind = 'magic_access' | 'invitation' | 'otp' | 'session';

export const PORTAL_MAGIC_ACCESS_HASH_VERSION = 1 as const;
/**
 * Domain-separated secret salt for magic-access hashing (S7A).
 * Must NOT equal invitation (`portal-invitation`) or OTP (`portal-otp`) domains.
 */
export const PORTAL_ACCESS_SECRET_DOMAIN = 'portal-magic-access';
/** @deprecated Use PORTAL_ACCESS_SECRET_DOMAIN — kept as alias for existing imports/tests. */
export const PORTAL_MAGIC_ACCESS_HASH_SALT = PORTAL_ACCESS_SECRET_DOMAIN;

export type PortalMagicTokenMode = 'COMPATIBILITY' | 'HASH_ONLY';

export type PortalMagicLookupMethod = 'hash' | 'legacy_plaintext' | 'none';

export type PortalMagicResolveResult = {
  orgId: string;
  account: PortalAccount;
  lookupMethod: Exclude<PortalMagicLookupMethod, 'none'>;
  /** Never expose raw token from storage — only echo input when needed for session mint. */
  rawTokenPresented: string;
};

/** Typed security mode for magic-access lookups (S7). */
export function getPortalMagicTokenMode(): PortalMagicTokenMode {
  const raw = String(process.env.PORTAL_MAGIC_TOKEN_MODE ?? 'COMPATIBILITY')
    .trim()
    .toUpperCase();
  if (raw === 'HASH_ONLY') return 'HASH_ONLY';
  return 'COMPATIBILITY';
}

export function allowLegacyPlaintextMagicTokenLookup(
  mode: PortalMagicTokenMode = getPortalMagicTokenMode(),
): boolean {
  return mode === 'COMPATIBILITY';
}

/** Cryptographically secure URL-safe magic access token (not Math.random / nanoid for new writes). */
export function generatePortalAccessToken(bytes = 32): string {
  return createPortalOpaqueToken(bytes);
}

/**
 * Canonical magic-access hash. Output format: `v1:<sha256-hex>`.
 * Uses reviewed `hashPortalSecret` with PORTAL_ACCESS_SECRET_DOMAIN.
 * Unknown version prefix → fail closed at parse time.
 */
export function hashPortalAccessToken(rawToken: string): string {
  const normalized = normalizeRawMagicToken(rawToken);
  if (!normalized) throw new Error('INVALID_MAGIC_TOKEN');
  const digest = hashPortalSecret(normalized, PORTAL_ACCESS_SECRET_DOMAIN);
  return `v${PORTAL_MAGIC_ACCESS_HASH_VERSION}:${digest}`;
}

export function normalizeRawMagicToken(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length < 16 || t.length > 256) return null;
  return t;
}

export function parsePortalAccessTokenHash(
  stored: string | null | undefined,
): { version: number; digest: string } | null {
  if (!stored || typeof stored !== 'string') return null;
  const m = /^v(\d+):([a-f0-9]{64})$/i.exec(stored.trim());
  if (!m) return null;
  const version = Number(m[1]);
  if (version !== PORTAL_MAGIC_ACCESS_HASH_VERSION) return null;
  return { version, digest: m[2]!.toLowerCase() };
}

export function magicAccessHashesEqual(a: string, b: string): boolean {
  const pa = parsePortalAccessTokenHash(a);
  const pb = parsePortalAccessTokenHash(b);
  if (!pa || !pb) return false;
  if (pa.version !== pb.version) return false;
  return timingSafeEqualHex(pa.digest, pb.digest);
}

/** Non-secret short fingerprint for staff DTOs (never full hash). */
export function magicAccessFingerprint(tokenHash: string | null | undefined): string | null {
  const parsed = parsePortalAccessTokenHash(tokenHash);
  if (!parsed) return null;
  return parsed.digest.slice(0, 8);
}

export type PortalMagicTelemetryEvent =
  | 'portal.magic_token.created'
  | 'portal.magic_token.rotated'
  | 'portal.magic_token.revoked'
  | 'portal.magic_token.hash_lookup_succeeded'
  | 'portal.magic_token.legacy_lookup_used'
  | 'portal.magic_token.lookup_failed'
  | 'portal.magic_token.session_exchanged'
  | 'portal.magic_token.duplicate_hash_blocked';

/** Sanitized telemetry — never raw token, hash, URL, or session cookie. */
export function emitPortalMagicTelemetry(
  event: PortalMagicTelemetryEvent,
  meta: {
    organizationId?: string | null;
    customerId?: string | null;
    portalAccountId?: string | null;
    requestId?: string | null;
  } = {},
): void {
  const payload = redactPortalLogMetadata({
    event,
    organizationId: meta.organizationId ?? null,
    customerId: meta.customerId ?? null,
    portalAccountId: meta.portalAccountId ?? null,
    requestId: meta.requestId ?? null,
    timestamp: new Date().toISOString(),
    environment: process.env.FIRESTORE_EMULATOR_HOST ? 'EMULATOR' : 'UNKNOWN',
  });
  if (process.env.PORTAL_MAGIC_TELEMETRY_SILENT === '1') return;
  console.info(JSON.stringify(payload));
}

function accountFromDoc(doc: {
  id: string;
  data: () => Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } };
}): { orgId: string; account: PortalAccount } | null {
  const account = mapTimestampsFromData({ id: doc.id, ...doc.data() }) as PortalAccount;
  const orgId = String(account.organizationId ?? doc.ref.parent.parent?.id ?? '');
  if (!orgId) return null;
  return { orgId, account: { ...account, organizationId: account.organizationId ?? orgId } };
}

async function findAccountsByAccessTokenHash(
  tokenHash: string,
): Promise<Array<{ orgId: string; account: PortalAccount }>> {
  const db = getAdminFirestore();
  try {
    const snap = await db
      .collectionGroup('portalAccounts')
      .where('accessTokenHash', '==', tokenHash)
      .limit(5)
      .get();
    const out: Array<{ orgId: string; account: PortalAccount }> = [];
    for (const doc of snap.docs) {
      const mapped = accountFromDoc(doc);
      if (mapped) out.push(mapped);
    }
    return out;
  } catch {
    return [];
  }
}

async function findAccountsByLegacyPlaintext(
  rawToken: string,
): Promise<
  Array<{ orgId: string; account: PortalAccount; source: 'accessToken' | 'portalToken' }>
> {
  const db = getAdminFirestore();
  const out: Array<{
    orgId: string;
    account: PortalAccount;
    source: 'accessToken' | 'portalToken';
  }> = [];

  try {
    const snap = await db
      .collectionGroup('portalAccounts')
      .where('accessToken', '==', rawToken)
      .limit(5)
      .get();
    for (const doc of snap.docs) {
      const mapped = accountFromDoc(doc);
      if (mapped && timingSafeEqualUtf8(String(mapped.account.accessToken ?? ''), rawToken)) {
        out.push({ ...mapped, source: 'accessToken' });
      }
    }
  } catch {
    // index / emulator
  }

  if (out.length > 0) return out;

  try {
    const snap = await db
      .collectionGroup('customers')
      .where('portalToken', '==', rawToken)
      .limit(5)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data() as { organizationId?: string; portalEnabled?: boolean; id?: string };
      const orgId = String(data.organizationId ?? doc.ref.parent.parent?.id ?? '');
      const customerId = doc.id;
      if (!orgId || data.portalEnabled === false) continue;
      if (
        !timingSafeEqualUtf8(String((data as { portalToken?: string }).portalToken ?? ''), rawToken)
      ) {
        continue;
      }
      const accountSnap = await db
        .collection(`organizations/${orgId}/portalAccounts`)
        .where('customerId', '==', customerId)
        .limit(1)
        .get();
      if (accountSnap.empty) continue;
      const mapped = accountFromDoc(accountSnap.docs[0]!);
      if (mapped) out.push({ ...mapped, source: 'portalToken' });
    }
  } catch {
    // ignore
  }

  return out;
}

function isAccountCredentialUsable(account: PortalAccount): boolean {
  if (!account.portalEnabled) return false;
  if (
    account.status === 'locked' ||
    account.status === 'suspended' ||
    account.status === 'archived'
  ) {
    return false;
  }
  if (account.revokedAt) return false;
  return true;
}

/**
 * Canonical magic-access resolver.
 * Order: hash lookup → (compat) legacy plaintext → lifecycle checks.
 * Duplicate hash matches → DENY (manual review).
 * Revoked/suspended accounts deny both hash and legacy paths.
 */
export async function resolvePortalMagicAccess(
  rawTokenInput: string,
  opts?: { mode?: PortalMagicTokenMode; requestId?: string | null },
): Promise<PortalMagicResolveResult | null> {
  const rawToken = normalizeRawMagicToken(rawTokenInput);
  if (!rawToken) {
    emitPortalMagicTelemetry('portal.magic_token.lookup_failed', { requestId: opts?.requestId });
    return null;
  }

  const mode = opts?.mode ?? getPortalMagicTokenMode();
  let tokenHash: string;
  try {
    tokenHash = hashPortalAccessToken(rawToken);
  } catch {
    emitPortalMagicTelemetry('portal.magic_token.lookup_failed', { requestId: opts?.requestId });
    return null;
  }

  const byHash = await findAccountsByAccessTokenHash(tokenHash);
  if (byHash.length > 1) {
    emitPortalMagicTelemetry('portal.magic_token.duplicate_hash_blocked', {
      requestId: opts?.requestId,
    });
    return null;
  }
  if (byHash.length === 1) {
    const hit = byHash[0]!;
    if (!isAccountCredentialUsable(hit.account)) {
      emitPortalMagicTelemetry('portal.magic_token.lookup_failed', {
        organizationId: hit.orgId,
        customerId: hit.account.customerId,
        portalAccountId: hit.account.id,
        requestId: opts?.requestId,
      });
      return null;
    }
    // Stored hash must parse as known version
    if (!parsePortalAccessTokenHash(hit.account.accessTokenHash)) {
      emitPortalMagicTelemetry('portal.magic_token.lookup_failed', {
        organizationId: hit.orgId,
        customerId: hit.account.customerId,
        portalAccountId: hit.account.id,
        requestId: opts?.requestId,
      });
      return null;
    }
    emitPortalMagicTelemetry('portal.magic_token.hash_lookup_succeeded', {
      organizationId: hit.orgId,
      customerId: hit.account.customerId,
      portalAccountId: hit.account.id,
      requestId: opts?.requestId,
    });
    return {
      orgId: hit.orgId,
      account: hit.account,
      lookupMethod: 'hash',
      rawTokenPresented: rawToken,
    };
  }

  if (!allowLegacyPlaintextMagicTokenLookup(mode)) {
    emitPortalMagicTelemetry('portal.magic_token.lookup_failed', { requestId: opts?.requestId });
    return null;
  }

  const byLegacy = await findAccountsByLegacyPlaintext(rawToken);
  if (byLegacy.length > 1) {
    emitPortalMagicTelemetry('portal.magic_token.duplicate_hash_blocked', {
      requestId: opts?.requestId,
    });
    return null;
  }
  if (byLegacy.length === 1) {
    const hit = byLegacy[0]!;
    // Critical: if account has been revoked/suspended, legacy plaintext MUST NOT restore access
    // even if plaintext field still exists.
    if (!isAccountCredentialUsable(hit.account)) {
      emitPortalMagicTelemetry('portal.magic_token.lookup_failed', {
        organizationId: hit.orgId,
        customerId: hit.account.customerId,
        portalAccountId: hit.account.id,
        requestId: opts?.requestId,
      });
      return null;
    }
    // If a hash exists and does not match, do not honor stale plaintext (rotation/revocation).
    if (hit.account.accessTokenHash) {
      if (!magicAccessHashesEqual(hit.account.accessTokenHash, tokenHash)) {
        emitPortalMagicTelemetry('portal.magic_token.lookup_failed', {
          organizationId: hit.orgId,
          customerId: hit.account.customerId,
          portalAccountId: hit.account.id,
          requestId: opts?.requestId,
        });
        return null;
      }
    }
    emitPortalMagicTelemetry('portal.magic_token.legacy_lookup_used', {
      organizationId: hit.orgId,
      customerId: hit.account.customerId,
      portalAccountId: hit.account.id,
      requestId: opts?.requestId,
    });
    return {
      orgId: hit.orgId,
      account: hit.account,
      lookupMethod: 'legacy_plaintext',
      rawTokenPresented: rawToken,
    };
  }

  emitPortalMagicTelemetry('portal.magic_token.lookup_failed', { requestId: opts?.requestId });
  return null;
}

/** Alias for S7A naming — same as resolvePortalMagicAccess. */
export const resolvePortalAccessCredential = resolvePortalMagicAccess;

/** Fields to persist for a NEW or ROTATED magic credential (hash-only at rest). */
export function portalMagicCredentialWriteFields(rawToken: string): {
  accessToken: null;
  accessTokenHash: string;
  accessTokenHashVersion: number;
} {
  return {
    accessToken: null,
    accessTokenHash: hashPortalAccessToken(rawToken),
    accessTokenHashVersion: PORTAL_MAGIC_ACCESS_HASH_VERSION,
  };
}

/**
 * Upgrade-on-read is DISABLED by default and production-blocked.
 * Emulator-only helper for migration simulation — not used by requirePortalAccess.
 */
export function portalMagicUpgradeOnReadAllowed(): boolean {
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return false;
  }
  return process.env.PORTAL_MAGIC_TOKEN_UPGRADE_ON_READ === '1';
}

export function assertEmulatorPortalTokenMigration(): void {
  const emu =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    process.env.PORTAL_TOKEN_MIGRATION_ALLOW_EMULATOR === '1';
  if (!emu) {
    throw new Error('PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED');
  }
  if (process.env.GCLOUD_PROJECT && /prod|production/i.test(process.env.GCLOUD_PROJECT)) {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED');
    }
  }
}
