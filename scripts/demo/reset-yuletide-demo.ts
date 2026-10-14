/**
 * Reset demo tenant to canonical snapshot.
 *   npx tsx scripts/demo/reset-yuletide-demo.ts --apply --project=yuletide-lighting-staging
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { STAGING_PROJECT_ID, assertDemoScriptProject, requireApplyFlag } = require('./lib/demo-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'yuletide-demo-state.json');

function loadEnv() {
  for (const name of ['.env.staging', '.env']) {
    const envPath = path.join(repoRoot, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const flags = new Set();
  const values = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      values[arg.slice(2, eq)] = arg.slice(eq + 1);
      flags.add(arg.slice(2, eq));
    } else flags.add(arg.slice(2));
  }
  return { flags, values };
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || STAGING_PROJECT_ID;
  assertDemoScriptProject(projectId, { allowProductionDemo: flags.has('allow-production-demo') });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;

  const orgId = values.organization || JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')).organizationId;
  console.log(JSON.stringify({ mode: flags.has('apply') ? 'apply' : 'dry-run', projectId, orgId }, null, 2));
  if (!requireApplyFlag(flags, 'reset yuletide demo tenant')) process.exit(0);

  const { resetYuletideDemoTenant } = await import('../../packages/firebase/src/demo-seed.ts');
  const result = await resetYuletideDemoTenant(orgId, 'demo-reset-script');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
