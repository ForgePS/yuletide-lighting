/**
 * Provision the Yuletide sales demo tenant (YT-TOUR-S2).
 *
 * Default: dry-run.
 *   npx tsx scripts/demo/provision-yuletide-demo.ts --apply --project=yuletide-lighting-staging
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DEMO_ENVIRONMENT_MARKER,
  DEMO_ORG_DISPLAY_NAME,
  DEMO_TENANT_SLUG,
  STAGING_PROJECT_ID,
  assertDemoScriptProject,
  requireApplyFlag,
} = require('./lib/demo-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'yuletide-demo-state.json');
const CREDS_PATH = path.join(repoRoot, 'secrets', 'yuletide-demo-credentials.json');
const DEMO_ENTRY_EMAIL = 'demo+entry@yuletide-demo.test';

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let out = '';
  for (let i = 0; i < 24; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensureDemoEntryUser(db, auth, organizationId) {
  const password = fs.existsSync(CREDS_PATH)
    ? (JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')) as { entry?: { password?: string } }).entry
        ?.password || randomPassword()
    : randomPassword();

  let uid = `demo_entry_${organizationId.slice(0, 8)}`;
  let authProvisioned = false;

  try {
    await auth.listUsers(1);
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(DEMO_ENTRY_EMAIL);
      await auth.updateUser(userRecord.uid, { password, disabled: false, emailVerified: true });
    } catch {
      userRecord = await auth.createUser({
        email: DEMO_ENTRY_EMAIL,
        password,
        emailVerified: true,
        displayName: 'Yuletide Demo Explorer',
      });
    }
    uid = userRecord.uid;
    authProvisioned = true;
  } catch (err) {
    console.warn(
      'Firebase Auth unavailable — demo entry user will be Firestore-only until Auth is enabled.',
      err instanceof Error ? err.message : err,
    );
  }

  const now = new Date();
  await db.collection('users').doc(uid).set(
    {
      firebaseUid: uid,
      organizationId,
      email: DEMO_ENTRY_EMAIL,
      firstName: 'Demo',
      lastName: 'Explorer',
      role: 'owner',
      settingsRole: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
  fs.writeFileSync(
    CREDS_PATH,
    JSON.stringify(
      {
        entry: {
          email: DEMO_ENTRY_EMAIL,
          password,
          uid,
          authProvisioned,
        },
      },
      null,
      2,
    ),
  );

  return { email: DEMO_ENTRY_EMAIL, uid, authProvisioned };
}

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
    } else {
      flags.add(arg.slice(2));
    }
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
  delete process.env.FIRESTORE_EMULATOR_HOST;

  const plan = {
    companyName: DEMO_ORG_DISPLAY_NAME,
    slug: DEMO_TENANT_SLUG,
    environmentMarker: DEMO_ENVIRONMENT_MARKER,
    isDemoTenant: true,
    subscriptionTier: 'professional',
    subscriptionStatus: 'active',
    subscriptionPlan: 'monthly',
    trialDays: 0,
    ownerEmail: 'owner+demo@yuletide-demo.test',
  };

  console.log(JSON.stringify({ mode: flags.has('apply') ? 'apply' : 'dry-run', projectId, plan }, null, 2));
  if (!requireApplyFlag(flags, 'provision yuletide demo tenant')) process.exit(0);

  const { provisionCreatorOrganization } = await import('../../packages/firebase/src/creator360.ts');
  const { getAdminFirestore, getAdminAuth } = await import('../../packages/firebase/src/admin.ts');
  const { ensureSettingsDefaults } = await import('../../packages/firebase/src/settings360.ts');

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const existing = await db
    .collection('organizations')
    .where('slug', '==', DEMO_TENANT_SLUG)
    .limit(1)
    .get();

  let organizationId: string;

  if (!existing.empty) {
    organizationId = existing.docs[0]!.id;
    await existing.docs[0]!.ref.set(
      { isDemoTenant: true, environmentMarker: DEMO_ENVIRONMENT_MARKER, updatedAt: new Date() },
      { merge: true },
    );
    console.log(JSON.stringify({ reused: true, organizationId }, null, 2));
  } else {
    const result = await provisionCreatorOrganization(
      {
        companyName: plan.companyName,
        slug: plan.slug,
        environmentMarker: plan.environmentMarker,
        isDemoTenant: true,
        subscriptionTier: plan.subscriptionTier,
        subscriptionStatus: plan.subscriptionStatus,
        subscriptionPlan: plan.subscriptionPlan,
        trialDays: plan.trialDays,
        note: 'YT-TOUR-S2 sales demo tenant',
      },
      { userId: 'demo-provision-script', email: 'platform@yuletide.internal' },
    );

    organizationId = result.organizationId;
    await db.collection('organizations').doc(organizationId).set(
      { isDemoTenant: true, updatedAt: new Date() },
      { merge: true },
    );
    console.log(JSON.stringify({ created: true, organizationId }, null, 2));
  }

  await ensureSettingsDefaults(organizationId, 'demo-provision-script');
  const entryUser = await ensureDemoEntryUser(db, auth, organizationId);

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { organizationId, slug: DEMO_TENANT_SLUG, projectId, entryUser },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
