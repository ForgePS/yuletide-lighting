/**
 * PORTAL-P2-S7B — legacy magic-token URL → session-first `/portal/app/...` mapping.
 * ENVIRONMENT=EMULATOR for automated evidence. Pure helper — no Firestore/Auth.
 */

export const PORTAL_APP_BASE = '/portal/app';

/** YL-S12 — post-invite claim destination (session cookie already minted). */
export function portalInviteSuccessPath(): string {
  return PORTAL_APP_BASE;
}

/** YL-S12 — null-safe portal status / stage / type labels. */
export function formatPortalStatusLabel(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'Unknown';
  return text
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const KNOWN_SEGMENTS = new Set([
  '',
  'schedule',
  'schedule-request',
  'service-request',
  'messages',
  'notifications',
  'contacts',
  'sign',
  'billing',
  'proposals',
  'agreements',
  'properties',
  'mockups',
  'documents',
  'jobs',
  'takedowns',
  'storage',
  'consultations',
  'reviews',
  'rebook',
]);

/** Build a tokenless portal app path. */
export function portalAppPath(...segments: string[]): string {
  const clean = segments.filter(Boolean);
  if (clean.length === 0) return PORTAL_APP_BASE;
  return `${PORTAL_APP_BASE}/${clean.join('/')}`;
}

/**
 * Map legacy magic-token portal URL to session-first `/portal/app/...` destination.
 * Returns null when the path is not a recognized portal feature route.
 *
 * Conceptual alias: translateLegacyPortalPathToSessionPath
 */
export function mapLegacyPortalPathToAppPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  // ['portal', token, ...rest]
  if (parts[0] !== 'portal' || parts.length < 2) return null;
  const namespace = parts[1];
  if (
    !namespace ||
    namespace === 'app' ||
    namespace === 'login' ||
    namespace === 'access' ||
    namespace === 'invite'
  ) {
    return null;
  }

  const rest = parts.slice(2);
  if (rest.length === 0) return portalAppPath();

  if (rest[0] === 'jobs' && rest.length >= 2) {
    return portalAppPath('jobs', rest[1]!);
  }

  const segment = rest[0]!;
  if (!KNOWN_SEGMENTS.has(segment)) return null;
  return portalAppPath(...rest);
}

/** Alias required by S7B naming. */
export const translateLegacyPortalPathToSessionPath = mapLegacyPortalPathToAppPath;

/**
 * Normalize request/analytics pathnames so raw magic tokens never appear in logs.
 * `/portal/REAL_SECRET/billing` → `/portal/[token]/billing`
 */
export function redactPortalMagicTokenPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'portal' || parts.length < 2) return pathname;
  const ns = parts[1]!;
  if (ns === 'app' || ns === 'login' || ns === 'access' || ns === 'invite') {
    return `/${parts.join('/')}`;
  }
  const rest = parts.slice(2);
  if (rest.length === 0) return '/portal/[token]';
  if (rest[0] === 'jobs' && rest.length >= 2) {
    return '/portal/[token]/jobs/[jobId]';
  }
  return `/portal/[token]/${rest.join('/')}`;
}

/** True when an existing session customer conflicts with a newly exchanged magic credential. */
export function portalSessionTokenScopeConflict(
  existingCustomerId: string | null | undefined,
  incomingCustomerId: string,
): boolean {
  if (!existingCustomerId) return false;
  return existingCustomerId !== incomingCustomerId;
}
