/** In-memory auth token cache so TRPC requests avoid repeated Firebase getIdToken() calls. */
let cachedToken: string | null = null;

/** Firebase Hosting only forwards this cookie name to Cloud Run / SSR. */
export const AUTH_COOKIE_NAME = '__session';

export function decodeAuthTokenPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token: string | null, skewMs = 60_000): boolean {
  if (!token) return true;
  const payload = decodeAuthTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now() + skewMs;
}

export function setCachedAuthToken(token: string | null) {
  cachedToken = token;
}

export function getCachedAuthToken() {
  return cachedToken;
}

export function writeAuthCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (!token) {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  // Raw JWT — base64url is cookie-safe; avoid encodeURIComponent double-decode issues.
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
}

export function writeClientSession(token: string): void {
  setCachedAuthToken(token);
  writeAuthCookie(token);
}

export function assertClientSessionCookie(): void {
  if (typeof document === 'undefined') return;
  if (!readAuthCookie()) {
    throw new Error(
      'Could not save your session cookie. Allow cookies for localhost and try again.',
    );
  }
}

export function readAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!match) return null;
  return match.slice(`${AUTH_COOKIE_NAME}=`.length) || null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Establish the middleware cookie via Set-Cookie, with a fast client-cookie fallback. */
export async function establishServerSession(idToken: string): Promise<void> {
  writeClientSession(idToken);

  const res = await fetchWithTimeout(
    '/api/auth/session',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ idToken }),
    },
    6_000,
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    const message = body?.error || `Session API failed (${res.status})`;
    throw new Error(message);
  }
}

export async function clearServerSession(): Promise<void> {
  writeAuthCookie(null);
  setCachedAuthToken(null);
  try {
    await fetchWithTimeout(
      '/api/auth/session',
      { method: 'DELETE', credentials: 'same-origin' },
      3000,
    );
  } catch {
    /* ignore */
  }
}
