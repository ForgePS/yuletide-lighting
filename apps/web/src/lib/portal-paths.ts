/** Canonical session-first portal URL namespace (P2-S7). */
export { PORTAL_APP_BASE, portalAppPath } from '@clcrm/types';

/** Session-mode tRPC input — authorization via `__portal_session` cookie. */
export const portalSessionInput = {} as { token?: string };
