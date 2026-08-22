/**
 * Portal Phase 2 — session tokens, OTP/invitation crypto, email normalization, redaction.
 * ENVIRONMENT=EMULATOR for all automated evidence in this phase.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const PORTAL_SESSION_COOKIE = '__portal_session';
export const PORTAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
export const PORTAL_OTP_TTL_MS = 10 * 60 * 1000;
export const PORTAL_OTP_MAX_ATTEMPTS = 5;
export const PORTAL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const PORTAL_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PORTAL_ENUMERATION_SAFE_MESSAGE =
  'If the access information is valid, verification instructions have been sent.';

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPortalSecret(value: string, salt = ''): string {
  return createHash('sha256').update(`${salt}:${value}`, 'utf8').digest('hex');
}

export function createPortalOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function createPortalOtpCode(digits = 6): string {
  const max = 10 ** digits;
  const n = randomBytes(4).readUInt32BE(0) % max;
  return String(n).padStart(digits, '0');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function timingSafeEqualUtf8(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

const SENSITIVE_KEYS =
  /token|otp|password|secret|cookie|authorization|session|hash|invitationLink/i;

/** Redact sensitive keys from structured log / audit metadata. */
export function redactPortalLogMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (typeof value === 'string' && /portal\/[a-zA-Z0-9_-]{20,}/.test(value)) {
      out[key] = '[REDACTED_URL]';
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = redactPortalLogMetadata(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export type PortalSessionPayload = {
  v: 1;
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
  role: string;
  enabledFeatures: string[];
  sessionVersion: number;
  exp: number;
  iat: number;
  /** HMAC / integrity suffix stored separately when signing. */
  jti: string;
};

export function encodePortalSessionPayload(payload: PortalSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodePortalSessionPayload(raw: string): PortalSessionPayload | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as PortalSessionPayload;
    if (parsed.v !== 1) return null;
    if (!parsed.organizationId || !parsed.customerId || !parsed.portalAccountId) return null;
    if (!parsed.portalUserId || typeof parsed.sessionVersion !== 'number') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signPortalSessionToken(payload: PortalSessionPayload, secret: string): string {
  const body = encodePortalSessionPayload(payload);
  const sig = hashPortalSecret(body, secret);
  return `${body}.${sig}`;
}

export function verifyPortalSessionToken(
  token: string,
  secret: string,
): PortalSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = hashPortalSecret(body, secret);
  if (sig.length !== expected.length || !timingSafeEqualUtf8(sig, expected)) return null;
  return decodePortalSessionPayload(body);
}

export type PortalRateLimitBucket = {
  count: number;
  windowStartedAt: number;
  lockedUntil?: number;
};

export function checkPortalRateLimit(
  bucket: PortalRateLimitBucket | undefined,
  opts: { max: number; windowMs: number; lockMs?: number; now?: number },
): { allowed: boolean; bucket: PortalRateLimitBucket; retryAfterMs?: number } {
  const now = opts.now ?? Date.now();
  const current: PortalRateLimitBucket = bucket ?? { count: 0, windowStartedAt: now };
  if (current.lockedUntil && current.lockedUntil > now) {
    return { allowed: false, bucket: current, retryAfterMs: current.lockedUntil - now };
  }
  if (now - current.windowStartedAt > opts.windowMs) {
    return { allowed: true, bucket: { count: 1, windowStartedAt: now } };
  }
  if (current.count >= opts.max) {
    const lockedUntil = opts.lockMs ? now + opts.lockMs : undefined;
    return {
      allowed: false,
      bucket: { ...current, lockedUntil },
      retryAfterMs: lockedUntil
        ? lockedUntil - now
        : opts.windowMs - (now - current.windowStartedAt),
    };
  }
  return {
    allowed: true,
    bucket: { ...current, count: current.count + 1 },
  };
}
