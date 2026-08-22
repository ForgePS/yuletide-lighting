/**
 * YL-S22 — Public CRM access tokens (/p /a /pay /review /m).
 * Distinct from portal magic-access hashing (BACKLOG-004).
 */

/** New capability tokens use nanoid(32) ≈ 192 bits URL-safe. */
export const PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH = 32;

/** Accept existing links in a secrecy band; reject empty/trivial shapes. */
export const PUBLIC_ACCESS_TOKEN_MIN_LENGTH = 16;
export const PUBLIC_ACCESS_TOKEN_MAX_LENGTH = 128;

/** nanoid / base64url alphabet */
export const PUBLIC_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function normalizePublicAccessToken(
  token: string | null | undefined,
): string | null {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length ? trimmed : null;
}

export function isValidPublicAccessToken(token: string | null | undefined): boolean {
  const normalized = normalizePublicAccessToken(token);
  if (!normalized) return false;
  if (
    normalized.length < PUBLIC_ACCESS_TOKEN_MIN_LENGTH ||
    normalized.length > PUBLIC_ACCESS_TOKEN_MAX_LENGTH
  ) {
    return false;
  }
  return PUBLIC_ACCESS_TOKEN_PATTERN.test(normalized);
}

/**
 * Fail-closed normalize for lookups. Returns null when the token must not be queried.
 */
export function parsePublicAccessToken(token: string | null | undefined): string | null {
  const normalized = normalizePublicAccessToken(token);
  if (!normalized || !isValidPublicAccessToken(normalized)) return null;
  return normalized;
}

export function assertValidPublicAccessToken(
  token: string | null | undefined,
): asserts token is string {
  if (!isValidPublicAccessToken(token)) {
    throw new Error('Invalid public access token');
  }
}
