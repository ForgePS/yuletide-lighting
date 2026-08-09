/**
 * One-shot: stamp professional module pack on production orgs.
 *
 *   npx tsx scripts/stamp-professional-modules.ts --project=yuletide-lighting --apply --allow-production-apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { MODULE_PRESETS } from '../packages/types/src/module-presets.ts';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFESSIONAL = [...MODULE_PRESETS.professional];

function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;
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

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      values[arg.slice(2, eq)] = arg.slice(eq + 1);
      flags.add(arg.slice(2, eq));
    } else {
      flags.add(arg.slice(2));
    }
  }
  return { flags, values };
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || 'yuletide-lighting';
  const apply = flags.has('apply');

  if (projectId === 'yuletide-lighting' && apply && !flags.has('allow-production-apply')) {
    throw new Error('Refusing production apply without --allow-production-apply');
  }
  if (projectId !== 'yuletide-lighting' && projectId !== 'yuletide-lighting-staging') {
    throw new Error(`Unexpected project ${projectId}`);
  }

  if (!getApps().length) {
    const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (key) initializeApp({ credential: cert(JSON.parse(key)), projectId });
    else initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();
  const snap = await db.collection('organizations').get();

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        projectId,
        modules: PROFESSIONAL.length,
        orgCount: snap.size,
      },
      null,
      2,
    ),
  );

  for (const doc of snap.docs) {
    const before = Array.isArray(doc.data()?.enabledModules) ? doc.data()!.enabledModules.length : 0;
    console.log(`[${apply ? 'apply' : 'dry-run'}] ${doc.id} modules ${before} → ${PROFESSIONAL.length} tier=professional`);
    if (!apply) continue;
    await doc.ref.set(
      {
        enabledModules: PROFESSIONAL,
        subscriptionTier: 'professional',
        configurationSchemaVersion: 1,
        moduleMigration: {
          version: 'stamp-professional-v1',
          migratedAt: FieldValue.serverTimestamp(),
          migratedBy: 'stamp-professional-modules',
          reason: 'operator-requested full nav restore after go-live',
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
