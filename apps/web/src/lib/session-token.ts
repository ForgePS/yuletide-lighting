/**
 * Edge-safe Firebase ID token checks for middleware.
 * Full cryptographic verification happens in the server layout via createAuthContext.
 * This rejects missing, malformed, or expired tokens before the app shell loads.
 */

export function decodeFirebaseIdTokenPayload(token: string): { exp?: number; sub?: string; user_id?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as { exp?: number; sub?: string; user_id?: string };
  } catch {
    return null;
  }
}

export function isFirebaseIdTokenStructurallyValid(token: string | undefined | null): boolean {
  if (!token || token.length < 20) return false;
  const payload = decodeFirebaseIdTokenPayload(token);
  if (!payload) return false;
  if (!payload.sub && !payload.user_id) return false;
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 30_000) {
    return false;
  }
  return true;
}
