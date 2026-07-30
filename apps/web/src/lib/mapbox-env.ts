/** Mapbox public token for client map rendering (pk.ey…). */

let cachedToken: string | null | undefined;

export function getMapboxPublicToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

/**
 * Resolve a Mapbox public token: build-time NEXT_PUBLIC_ first, then runtime /api/maps/token
 * (so MAPBOX_TOKEN set only on the server still works after deploy).
 */
export async function resolveMapboxPublicToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;

  const fromEnv = getMapboxPublicToken();
  if (fromEnv) {
    cachedToken = fromEnv;
    return cachedToken;
  }

  if (typeof window === 'undefined') {
    const server =
      (process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim() || null;
    cachedToken = server;
    return cachedToken;
  }

  try {
    const res = await fetch('/api/maps/token', { cache: 'no-store' });
    if (!res.ok) {
      cachedToken = null;
      return null;
    }
    const data = (await res.json()) as { token?: string | null };
    cachedToken = typeof data.token === 'string' && data.token.trim() ? data.token.trim() : null;
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}
