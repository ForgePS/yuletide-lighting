/**
 * In-memory portal rate-limit buckets for emulator/tests (P2-S3).
 * Not a production distributed limiter — evidence only under ENVIRONMENT=EMULATOR.
 */
import { checkPortalRateLimit, type PortalRateLimitBucket } from './portal-security';
import { getPortalSecurityConfig } from './portal-security-config';

const buckets = new Map<string, PortalRateLimitBucket>();

export function portalRateLimitKey(parts: string[]): string {
  return parts.filter(Boolean).join(':');
}

export function consumePortalRateLimit(
  key: string,
  opts?: { max?: number; windowMs?: number; lockMs?: number; now?: number },
): { allowed: boolean; retryAfterMs?: number } {
  const cfg = getPortalSecurityConfig();
  const max = opts?.max ?? cfg.otpRequestMaxPerWindow;
  const windowMs = opts?.windowMs ?? cfg.otpRequestWindowMinutes * 60 * 1000;
  const lockMs = opts?.lockMs ?? cfg.otpLockoutMinutes * 60 * 1000;
  const result = checkPortalRateLimit(buckets.get(key), {
    max,
    windowMs,
    lockMs,
    now: opts?.now,
  });
  buckets.set(key, result.bucket);
  return { allowed: result.allowed, retryAfterMs: result.retryAfterMs };
}

export function clearPortalRateLimitBuckets(): void {
  buckets.clear();
}

export function peekPortalRateLimitBucket(key: string): PortalRateLimitBucket | undefined {
  return buckets.get(key);
}
