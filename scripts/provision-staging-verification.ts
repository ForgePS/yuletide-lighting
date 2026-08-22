/**
 * Provision the P0.2C staging verification tenant through the supported
 * creator provisioning path (provisionCreatorOrganization).
 *
 * Default: dry-run. Requires:
 *   --apply --project=yuletide-lighting-staging
 *
 * Rejects production project IDs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  STAGING_PROJECT_ID,
  STAGING_VERIFICATION_SLUG,
  STAGING_ENVIRONMENT_MARKER,
  STAGING_ORG_DISPLAY_NAME,
  assertStagingProject,
  requireApplyFlag,
} = require('./lib/staging-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'staging-verification-state.json');
const CREDS_PATH = path.join(repoRoot, 'secrets', 'staging-verification-credentials.json');

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

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let out = '';
  for (let i = 0; i < 24; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || STAGING_PROJECT_ID;
  assertStagingProject(projectId);

  // Force Admin SDK onto staging before importing package code.
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const plan = {
    companyName: STAGING_ORG_DISPLAY_NAME,
    slug: STAGING_VERIFICATION_SLUG,
    environmentMarker: STAGING_ENVIRONMENT_MARKER,
    subscriptionTier: 'professional' as const,
    subscriptionStatus: 'active' as const,
    subscriptionPlan: 'monthly' as const,
    trialDays: 0,
    note: 'P0.2C staging verification tenant — disposable',
    ownerEmail: 'owner+staging-verification@yuletide-staging.test',
  };

  console.log(
    JSON.stringify({ mode: flags.has('apply') ? 'apply' : 'dry-run', projectId, plan }, null, 2),
  );

  if (!requireApplyFlag(flags, 'provision staging verification tenant')) {
    process.exit(0);
  }

  const { provisionCreatorOrganization } = await import('../packages/firebase/src/creator360.ts');
  const { getOrganization } = await import('../packages/firebase/src/firestore.ts');
  const { getAdminAuth, getAdminFirestore } = await import('../packages/firebase/src/admin.ts');
  const { ensureSettingsDefaults } = await import('../packages/firebase/src/settings360.ts');
  const { organizationNeedsModuleMigration } =
    await import('../packages/types/src/module-presets.ts');

  const db = getAdminFirestore();
  const existing = await db
    .collection('organizations')
    .where('slug', '==', STAGING_VERIFICATION_SLUG)
    .limit(1)
    .get();

  let organizationId: string;
  if (!existing.empty) {
    organizationId = existing.docs[0]!.id;
    console.log(`Idempotent reuse of existing org ${organizationId}`);
  } else {
    const actor = {
      userId: 'p0.2c-provision-script',
      email: 'creator+staging-verification@yuletide-staging.test',
    };
    const result = await provisionCreatorOrganization(plan, actor);
    organizationId = result.organizationId;
    console.log(`Provisioned organization ${organizationId} via provisionCreatorOrganization`);
  }

  const org = await getOrganization(organizationId);
  if (!org) throw new Error('Provisioned organization not readable');
  if (org.provisioningStatus && org.provisioningStatus !== 'active') {
    throw new Error(`Provisioning status is ${org.provisioningStatus}, expected active`);
  }
  if (organizationNeedsModuleMigration(org)) {
    throw new Error(
      'Newly provisioned tenant requires module migration — provisioning is incomplete',
    );
  }

  await ensureSettingsDefaults(organizationId, 'p0.2c-provision-script');

  const auth = getAdminAuth();
  const usersSpec = [
    {
      key: 'creator',
      email: 'creator+staging-verification@yuletide-staging.test',
      role: 'owner',
      settingsRole: 'owner',
      status: 'active',
      platformCreator: true,
    },
    {
      key: 'owner',
      email: 'owner+staging-verification@yuletide-staging.test',
      role: 'owner',
      settingsRole: 'owner',
      status: 'active',
    },
    {
      key: 'administrator',
      email: 'admin+staging-verification@yuletide-staging.test',
      role: 'admin',
      settingsRole: 'administrator',
      status: 'active',
    },
    {
      key: 'sales',
      email: 'sales+staging-verification@yuletide-staging.test',
      role: 'office',
      settingsRole: 'sales_rep',
      status: 'active',
    },
    {
      key: 'operations',
      email: 'ops+staging-verification@yuletide-staging.test',
      role: 'crew',
      settingsRole: 'operations_manager',
      status: 'active',
    },
    {
      key: 'sign_manager',
      email: 'sign-manager+staging-verification@yuletide-staging.test',
      role: 'office',
      settingsRole: 'sales_manager',
      status: 'active',
    },
    {
      key: 'sign_viewer',
      email: 'sign-viewer+staging-verification@yuletide-staging.test',
      role: 'crew',
      settingsRole: 'installer',
      status: 'active',
    },
    {
      key: 'no_export',
      email: 'no-export+staging-verification@yuletide-staging.test',
      role: 'crew',
      settingsRole: 'installer',
      status: 'active',
    },
    {
      key: 'read_only',
      email: 'readonly+staging-verification@yuletide-staging.test',
      role: 'office',
      settingsRole: 'read_only',
      status: 'active',
    },
    {
      key: 'suspended',
      email: 'suspended+staging-verification@yuletide-staging.test',
      role: 'office',
      settingsRole: 'office_staff',
      status: 'suspended',
    },
    {
      key: 'no_sign_module',
      email: 'no-sign-module+staging-verification@yuletide-staging.test',
      role: 'office',
      settingsRole: 'warehouse_staff',
      status: 'active',
    },
  ] as const;

  fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
  const priorCreds = fs.existsSync(CREDS_PATH)
    ? (JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')) as Record<string, { password?: string }>)
    : {};
  const credentialOut: Record<
    string,
    {
      email: string;
      password: string;
      uid: string;
      settingsRole: string;
      status: string;
      authProvisioned: boolean;
    }
  > = {};

  const now = new Date();
  let authAvailable = true;
  try {
    await auth.listUsers(1);
  } catch (err) {
    authAvailable = false;
    console.warn(
      'Firebase Auth unavailable for this project (Identity Toolkit may be disabled).',
      err instanceof Error ? err.message : err,
    );
    console.warn(
      'Continuing with Firestore user documents only. Enable Email/Password Auth on yuletide-lighting-staging, then re-run with --apply.',
    );
  }

  for (const spec of usersSpec) {
    const password = priorCreds[spec.key]?.password || randomPassword();
    let uid = `staging_p02c_${spec.key}`;
    let authProvisioned = false;

    if (authAvailable) {
      try {
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(spec.email);
          await auth.updateUser(userRecord.uid, {
            password,
            disabled: spec.status === 'suspended',
          });
        } catch {
          userRecord = await auth.createUser({
            email: spec.email,
            password,
            emailVerified: true,
            disabled: spec.status === 'suspended',
            displayName: `Staging ${spec.key}`,
          });
        }
        uid = userRecord.uid;
        authProvisioned = true;
      } catch (err) {
        authAvailable = false;
        console.warn(
          `Auth create/update failed for ${spec.key}; using Firestore-only uid.`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          firebaseUid: uid,
          organizationId,
          email: spec.email,
          firstName: 'Staging',
          lastName: spec.key,
          role: spec.role,
          settingsRole: spec.settingsRole,
          status: spec.status,
          environmentMarker: STAGING_ENVIRONMENT_MARKER,
          stagingTest: true,
          externalRef: `p02c-user-${spec.key}`,
          authProvisioned,
          createdAt: now,
          updatedAt: now,
          createdBy: 'p0.2c-provision-script',
          updatedBy: 'p0.2c-provision-script',
        },
        { merge: true },
      );

    credentialOut[spec.key] = {
      email: spec.email,
      password,
      uid,
      settingsRole: spec.settingsRole,
      status: spec.status,
      authProvisioned,
    };
  }

  // Mark owner on org for audit metadata.
  await db
    .collection('organizations')
    .doc(organizationId)
    .set(
      {
        ownerUserId: credentialOut.owner?.uid ?? null,
        ownerEmail: plan.ownerEmail,
        provisioningStatus: 'active',
        environmentMarker: STAGING_ENVIRONMENT_MARKER,
        stagingTest: true,
        updatedAt: now,
        updatedBy: 'p0.2c-provision-script',
      },
      { merge: true },
    );

  const state = {
    projectId,
    organizationId,
    slug: STAGING_VERIFICATION_SLUG,
    companyName: STAGING_ORG_DISPLAY_NAME,
    plan: 'professional',
    provisioningStatus: 'active',
    provisionedAt: new Date().toISOString(),
    provisioningPath: 'provisionCreatorOrganization',
    users: Object.fromEntries(
      Object.entries(credentialOut).map(([k, v]) => [k, { email: v.email, uid: v.uid }]),
    ),
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  fs.writeFileSync(CREDS_PATH, JSON.stringify(credentialOut, null, 2));
  console.log(`Wrote gitignored state → ${STATE_PATH}`);
  console.log(`Wrote gitignored credentials → ${CREDS_PATH}`);
  console.log(
    JSON.stringify(
      {
        organizationId,
        subscriptionTier: org.subscriptionTier,
        subscriptionStatus: org.subscriptionStatus,
        enabledModulesCount: org.enabledModules?.length ?? 0,
        configurationSchemaVersion: org.configurationSchemaVersion,
        provisioningStatus: org.provisioningStatus ?? 'active',
        migrationRequired: false,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
