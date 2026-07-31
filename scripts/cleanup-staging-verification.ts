/**
 * Cleanup staging verification tenant data (and optionally Auth users).
 * Default: dry-run. Requires:
 *   --apply --project=yuletide-lighting-staging
 * Rejects production. Does not touch yuletide-lighting.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  STAGING_PROJECT_ID,
  STAGING_ENVIRONMENT_MARKER,
  STAGING_VERIFICATION_SLUG,
  assertStagingProject,
  requireApplyFlag,
} = require('./lib/staging-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'staging-verification-state.json');

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

async function deleteQuery(
  db: { batch: () => { delete: (ref: unknown) => void; commit: () => Promise<void> } },
  query: {
    limit: (n: number) => {
      get: () => Promise<{ empty: boolean; size: number; docs: Array<{ ref: unknown }> }>;
    };
  },
  label: string,
) {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(200).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
  }
  console.log(`Deleted ${deleted} from ${label}`);
  return deleted;
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || STAGING_PROJECT_ID;
  assertStagingProject(projectId);
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  delete process.env.FIRESTORE_EMULATOR_HOST;

  if (!fs.existsSync(STATE_PATH) && !values.organization) {
    throw new Error('Missing secrets/staging-verification-state.json and no --organization=');
  }
  const state = fs.existsSync(STATE_PATH)
    ? (JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as {
        organizationId: string;
        users?: Record<string, { uid: string; email?: string }>;
      })
    : { organizationId: values.organization!, users: {} };

  console.log(
    JSON.stringify(
      {
        mode: flags.has('apply') ? 'apply' : 'dry-run',
        projectId,
        organizationId: state.organizationId,
        deleteAuthUsers: flags.has('delete-auth'),
        deleteOrganization: flags.has('delete-org'),
      },
      null,
      2,
    ),
  );

  if (!requireApplyFlag(flags, 'cleanup staging verification data')) {
    process.exit(0);
  }

  const { getAdminFirestore, getAdminAuth } = await import('../packages/firebase/src/admin.ts');
  const db = getAdminFirestore();
  const orgId = state.organizationId;

  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) {
    console.log('Organization already absent');
  } else {
    const data = orgSnap.data()!;
    if (
      data.environmentMarker !== STAGING_ENVIRONMENT_MARKER &&
      data.slug !== STAGING_VERIFICATION_SLUG &&
      !data.stagingTest
    ) {
      throw new Error(
        'Refusing cleanup: organization is not marked as staging verification tenant',
      );
    }
  }

  const subcollections = [
    'customers',
    'properties',
    'proposals',
    'invoices',
    'jobs',
    'multiYearAgreements',
    'signLocations',
    'portalAccounts',
    'portalUsers',
    'portalNotifications',
    'roles',
    'featureFlags',
    'settings',
    'userInvites',
    'auditLogs',
  ];
  for (const name of subcollections) {
    await deleteQuery(
      db as Parameters<typeof deleteQuery>[0],
      db.collection(`organizations/${orgId}/${name}`) as Parameters<typeof deleteQuery>[1],
      name,
    );
  }

  // Users for this org
  await deleteQuery(
    db as Parameters<typeof deleteQuery>[0],
    db.collection('users').where('organizationId', '==', orgId) as Parameters<
      typeof deleteQuery
    >[1],
    'users(by organizationId)',
  );

  if (flags.has('delete-auth') && state.users) {
    const auth = getAdminAuth();
    for (const [key, user] of Object.entries(state.users)) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`Deleted auth user ${key} ${user.uid}`);
      } catch (err) {
        console.warn(`Auth delete skipped for ${key}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  if (flags.has('delete-org')) {
    await db.collection('organizations').doc(orgId).delete();
    console.log(`Deleted organization ${orgId}`);
  } else {
    await db.collection('organizations').doc(orgId).set(
      {
        cleanupAt: new Date(),
        cleanupNote: 'P0.2C staging verification data removed; org retained',
        updatedAt: new Date(),
      },
      { merge: true },
    );
  }

  console.log('Cleanup complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
