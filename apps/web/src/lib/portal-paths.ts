/** Canonical session-first portal URL namespace (P2-S7). */
export const PORTAL_APP_BASE = '/portal/app';

/** Build a tokenless portal app path. */
export function portalAppPath(...segments: string[]): string {
  const clean = segments.filter(Boolean);
  if (clean.length === 0) return PORTAL_APP_BASE;
  return `${PORTAL_APP_BASE}/${clean.join('/')}`;
}

/** Session-mode tRPC input — authorization via `__portal_session` cookie. */
export const portalSessionInput = {} as { token?: string };
