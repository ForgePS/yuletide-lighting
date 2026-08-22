/**
 * YL-S24 — Firebase / Hosting frameworksBackend Node runtime policy.
 * Node.js 20 (nodejs20) decommissions 2026-10-30; target Node 22 (nodejs22).
 * Pure helpers — no deploy side effects.
 */

/** Firebase / package.json engines major to pin for SSR Cloud Function. */
export const FIREBASE_NODE_ENGINE_MAJOR = 22;

/** engines.node value Firebase CLI expects for Hosting frameworksBackend. */
export const FIREBASE_NODE_ENGINES_VALUE = '22';

/** Cloud Functions / Cloud Run functions runtime id. */
export const FIREBASE_FUNCTIONS_RUNTIME_ID = 'nodejs22';

/** GCP schedule: nodejs20 deprecation start (UTC date string). */
export const NODEJS20_DEPRECATION_DATE = '2026-04-30';

/** GCP schedule: nodejs20 decommission (deploy block) date. */
export const NODEJS20_DECOMMISSION_DATE = '2026-10-30';

/** GCP schedule: nodejs22 decommission (for awareness). */
export const NODEJS22_DECOMMISSION_DATE = '2027-10-31';

export function parseNodeMajorVersion(
  version: string | null | undefined,
): number | null {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim().replace(/^v/i, '');
  const major = Number(trimmed.split('.')[0]);
  return Number.isFinite(major) && major > 0 ? major : null;
}

/** True when local/CI Node major matches the Firebase pin. */
export function isFirebaseNodeEngineSatisfied(
  version: string | null | undefined,
  targetMajor = FIREBASE_NODE_ENGINE_MAJOR,
): boolean {
  return parseNodeMajorVersion(version) === targetMajor;
}

/**
 * Warn when deploy tooling should prefer the policy Node major.
 * Returns null when satisfied; otherwise a short operator message.
 */
export function firebaseNodeEngineMismatchMessage(
  version: string | null | undefined,
  targetMajor = FIREBASE_NODE_ENGINE_MAJOR,
): string | null {
  const major = parseNodeMajorVersion(version);
  if (major === targetMajor) return null;
  const observed = typeof version === 'string' && version.trim() ? version.trim() : 'unknown';
  return (
    `Node ${observed} detected. Yuletide Firebase Hosting SSR expects Node ${targetMajor} ` +
    `(engines "${FIREBASE_NODE_ENGINES_VALUE}", runtime ${FIREBASE_FUNCTIONS_RUNTIME_ID}). ` +
    `nodejs20 decommissions ${NODEJS20_DECOMMISSION_DATE}. ` +
    `Use nvm/winget to install Node ${targetMajor} before deploy.`
  );
}

/** Days until nodejs20 decommission from `now` (negative if past). */
export function daysUntilNodejs20Decommission(now = new Date()): number {
  const target = Date.UTC(2026, 9, 30); // month 0-indexed → Oct 30
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}
