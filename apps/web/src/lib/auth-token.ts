/** In-memory auth token cache so TRPC requests avoid repeated Firebase getIdToken() calls. */
let cachedToken: string | null = null;

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
    document.cookie = 'firebase-token=; path=/; max-age=0';
    return;
  }
  document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
}
