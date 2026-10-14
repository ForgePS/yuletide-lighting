/**
 * Demo tenant script guards — refuse production project mutations unless explicitly allowed.
 */
export const DEMO_TENANT_SLUG = 'yuletide-demo';
export const DEMO_ENVIRONMENT_MARKER = 'demo';
export const DEMO_ORG_DISPLAY_NAME = 'Yuletide Demo Lighting Company';

export const STAGING_PROJECT_ID = 'yuletide-lighting-staging';
export const PRODUCTION_PROJECT_IDS = new Set(['yuletide-lighting']);

export function assertDemoScriptProject(projectId, opts = {}) {
  const allowProductionDemo = Boolean(opts.allowProductionDemo);
  if (PRODUCTION_PROJECT_IDS.has(projectId) && !allowProductionDemo) {
    throw new Error(
      `Refusing demo script against production project "${projectId}" without --allow-production-demo.`,
    );
  }
}

export function requireApplyFlag(flags, label) {
  if (!flags.has('apply')) {
    console.log(`[dry-run] ${label} — pass --apply to execute writes.`);
    return false;
  }
  return true;
}
