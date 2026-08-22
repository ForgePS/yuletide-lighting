/**
 * Idempotent organization module migration.
 * Dry-run by default. Pass --apply to write.
 *
 * Usage:
 *   npx tsx scripts/migrate-organization-modules.ts --emulator
 *   npx tsx scripts/migrate-organization-modules.ts --apply --emulator
 *   npx tsx scripts/migrate-organization-modules.ts --organization=<id>
 *   npx tsx scripts/migrate-organization-modules.ts --resume-after=<id> --batch-size=50
 *
 * DO NOT run --apply against production without explicit authorization.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentSnapshot,
  type Query,
} from 'firebase-admin/firestore';
import {
  MODULE_MIGRATION_VERSION,
  ORGANIZATION_CONFIG_SCHEMA_VERSION,
  modulesEqual,
  organizationNeedsModuleMigration,
  resolveModulesForOrganization,
  type OrgModuleSnapshot,
} from '../packages/types/src/module-presets.ts';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION_IDENTITY = 'migrate-organization-modules@p0.2';

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

function initDb(projectId: string, emulator: boolean) {
  if (emulator) process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  if (!getApps().length) {
    const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (key) initializeApp({ credential: cert(JSON.parse(key)), projectId });
    else if (emulator || process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId });
    else initializeApp({ credential: applicationDefault(), projectId });
  }
  return getFirestore();
}

type MigrateResult = 'required' | 'applied' | 'skipped' | 'failed';

async function migrateOne(
  doc: DocumentSnapshot,
  apply: boolean,
  rollback: unknown[],
): Promise<MigrateResult> {
  const data = doc.data() ?? {};
  const before: OrgModuleSnapshot = {
    enabledModules: data.enabledModules ?? null,
    disabledModules: data.disabledModules ?? null,
    subscriptionStatus: data.subscriptionStatus ?? null,
    subscriptionPlan: data.subscriptionPlan ?? null,
    subscriptionTier: data.subscriptionTier ?? null,
    configurationSchemaVersion: data.configurationSchemaVersion ?? null,
  };

  if (!organizationNeedsModuleMigration(before)) {
    console.log(`[skip] ${doc.id} already migrated`);
    return 'skipped';
  }

  const forcePreset = !Array.isArray(before.enabledModules) || before.enabledModules.length === 0;
  const resolved = resolveModulesForOrganization(before, { forcePreset });

  if (!resolved.ok) {
    console.error(`[fail] ${doc.id}: ${resolved.error}`);
    return 'failed';
  }

  const after = {
    enabledModules: resolved.modules,
    disabledModules: Array.isArray(before.disabledModules) ? before.disabledModules : [],
    subscriptionTier: resolved.tier,
    configurationSchemaVersion: ORGANIZATION_CONFIG_SCHEMA_VERSION,
    moduleMigration: {
      version: MODULE_MIGRATION_VERSION,
      migratedAt: Timestamp.now(),
      migratedBy: MIGRATION_IDENTITY,
      reason: resolved.reason,
    },
  };

  rollback.push({
    organizationId: doc.id,
    before,
    after: {
      enabledModules: after.enabledModules,
      disabledModules: after.disabledModules,
      subscriptionTier: after.subscriptionTier,
      configurationSchemaVersion: after.configurationSchemaVersion,
      reason: resolved.reason,
    },
  });

  const unchanged =
    Array.isArray(before.enabledModules) &&
    modulesEqual(before.enabledModules as string[], after.enabledModules) &&
    before.subscriptionTier === after.subscriptionTier &&
    before.configurationSchemaVersion === after.configurationSchemaVersion;

  console.log(
    `[${apply ? 'apply' : 'dry-run'}] ${doc.id} tier=${resolved.tier} modules=${after.enabledModules.length} reason=${resolved.reason}${unchanged ? ' (metadata only)' : ''}`,
  );

  if (!apply) return 'required';

  try {
    await doc.ref.set(
      {
        enabledModules: after.enabledModules,
        disabledModules: after.disabledModules,
        subscriptionTier: after.subscriptionTier,
        configurationSchemaVersion: after.configurationSchemaVersion,
        moduleMigration: after.moduleMigration,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return 'applied';
  } catch (err) {
    console.error(`[fail] ${doc.id}`, err);
    return 'failed';
  }
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const apply = flags.has('apply');
  const emulator = flags.has('emulator');
  const staging = flags.has('staging');
  const organizationId = values.organization;
  const resumeAfter = values['resume-after'];
  const batchSize = Math.max(1, Number(values['batch-size'] ?? 100));
  const projectId =
    values.project ||
    (staging ? 'yuletide-lighting-staging' : undefined) ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'yuletide-lighting';

  if (
    apply &&
    !emulator &&
    projectId === 'yuletide-lighting' &&
    !flags.has('allow-production-apply')
  ) {
    console.error(
      'Refusing --apply against production project without --allow-production-apply. Use --emulator or staging.',
    );
    process.exit(1);
  }

  const db = initDb(projectId, emulator);
  const rollbackPath = path.join(
    repoRoot,
    'docs/production-cleanup',
    `organization-module-migration-rollback-${Date.now()}.json`,
  );
  const rollback: unknown[] = [];
  let scanned = 0;
  let migrationRequired = 0;
  let applied = 0;
  let skipped = 0;
  let failures = 0;
  let lastId: string | null = null;

  async function handle(doc: DocumentSnapshot) {
    scanned += 1;
    lastId = doc.id;
    const result = await migrateOne(doc, apply, rollback);
    if (result === 'required' || result === 'applied') migrationRequired += 1;
    if (result === 'applied') applied += 1;
    if (result === 'skipped') skipped += 1;
    if (result === 'failed') failures += 1;
  }

  if (organizationId) {
    const doc = await db.collection('organizations').doc(organizationId).get();
    if (!doc.exists) {
      console.error(`Organization not found: ${organizationId}`);
      process.exit(1);
    }
    await handle(doc);
  } else {
    let query: Query = db.collection('organizations').orderBy('__name__');
    if (resumeAfter) query = query.startAfter(resumeAfter);

    for (;;) {
      const page = await query.limit(batchSize).get();
      if (page.empty) break;
      for (const doc of page.docs) await handle(doc);
      if (page.size < batchSize) break;
      query = db
        .collection('organizations')
        .orderBy('__name__')
        .startAfter(page.docs[page.docs.length - 1]!);
    }
  }

  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.writeFileSync(
    rollbackPath,
    JSON.stringify(
      {
        migrationVersion: MODULE_MIGRATION_VERSION,
        projectId,
        apply,
        generatedAt: new Date().toISOString(),
        identity: MIGRATION_IDENTITY,
        snapshots: rollback,
      },
      null,
      2,
    ),
  );

  const summary = {
    migrationVersion: MODULE_MIGRATION_VERSION,
    projectId,
    mode: apply ? 'apply' : 'dry-run',
    scanned,
    migrationRequired,
    applied,
    skipped,
    failures,
    lastId,
    rollbackPath,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!apply) {
    console.log('Dry run only — no writes performed. Pass --apply to write.');
    // Dry-run succeeds as a report even when some orgs fail resolution (e.g. unknown tier).
    // Apply mode still fails the process when writes cannot be completed safely.
    return;
  }
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
