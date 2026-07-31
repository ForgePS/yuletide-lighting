/**
 * Staging-only project guard shared by provision/seed/cleanup scripts.
 * Production project IDs are always rejected for mutating operations.
 */
export const STAGING_PROJECT_ID = 'yuletide-lighting-staging';
export const PRODUCTION_PROJECT_IDS = new Set(['yuletide-lighting']);

export const STAGING_VERIFICATION_SLUG = 'yuletide-staging-verification';
export const STAGING_ENVIRONMENT_MARKER = 'staging_test';
export const STAGING_ORG_DISPLAY_NAME = 'Yuletide CRM Staging Verification';

export function assertStagingProject(projectId, opts = {}) {
  const allowEmulator = Boolean(opts.allowEmulator);
  if (PRODUCTION_PROJECT_IDS.has(projectId)) {
    throw new Error(
      `Refusing to run against production project "${projectId}". Use --project=${STAGING_PROJECT_ID}.`,
    );
  }
  if (projectId === STAGING_PROJECT_ID) return;
  if (
    allowEmulator &&
    (projectId === 'yuletide-rules-test' || String(projectId).includes('emulator'))
  ) {
    return;
  }
  throw new Error(
    `Refusing project "${projectId}". Authorized staging project is ${STAGING_PROJECT_ID}.`,
  );
}

export function requireApplyFlag(flags, label) {
  if (!flags.has('apply')) {
    console.log(`[dry-run] ${label} — pass --apply to execute writes.`);
    return false;
  }
  return true;
}
