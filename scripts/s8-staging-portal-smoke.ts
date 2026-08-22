/**
 * Issue (rotate) staging portal magic credential and smoke legacy entry → session.
 * Prints PASS/FAIL and lengths only — never prints the raw token.
 *
 * Usage: npx tsx scripts/s8-staging-portal-smoke.ts --apply --project=yuletide-lighting-staging
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  STAGING_PROJECT_ID,
  assertStagingProject,
  requireApplyFlag,
} = require('./lib/staging-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'staging-verification-state.json');
const PORTAL_SECRET_PATH = path.join(repoRoot, 'secrets', 'staging-portal-smoke.json');
const BASE = process.env.STAGING_BASE_URL || 'https://yuletide-lighting-staging.web.app';

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

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || STAGING_PROJECT_ID;
  assertStagingProject(projectId);

  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.NEXT_PUBLIC_APP_URL = BASE;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = projectId;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (!fs.existsSync(STATE_PATH)) {
    throw new Error(`Missing ${STATE_PATH}. Run provision:staging-verification --apply first.`);
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as {
    organizationId: string;
  };
  const orgId = state.organizationId;

  console.log(
    JSON.stringify({
      mode: flags.has('apply') ? 'apply' : 'dry-run',
      projectId,
      organizationId: orgId,
      base: BASE,
    }),
  );

  if (!requireApplyFlag(flags, 'issue staging portal credential + smoke')) {
    process.exit(0);
  }

  const { getAdminFirestore } = await import('../packages/firebase/src/admin.ts');
  const { rotatePortalAccessToken } = await import('../packages/firebase/src/portal360.ts');

  const db = getAdminFirestore();
  const customers = await db
    .collection(`organizations/${orgId}/customers`)
    .where('externalRef', '==', 'p02c-customer-residential')
    .limit(1)
    .get();
  if (customers.empty) {
    throw new Error(
      'Residential staging customer not found (externalRef=p02c-customer-residential)',
    );
  }
  const customerId = customers.docs[0]!.id;

  const rotated = await rotatePortalAccessToken(orgId, customerId, state.organizationId);
  const token = rotated.token;
  if (!token || token.length < 20) {
    throw new Error('rotatePortalAccessToken did not return a usable raw token');
  }

  fs.mkdirSync(path.dirname(PORTAL_SECRET_PATH), { recursive: true });
  fs.writeFileSync(
    PORTAL_SECRET_PATH,
    JSON.stringify(
      {
        projectId,
        organizationId: orgId,
        customerId,
        accessUrl: rotated.accessUrl,
        tokenLength: token.length,
        issuedAt: new Date().toISOString(),
        // raw token stored gitignored for local smoke only
        token,
      },
      null,
      2,
    ),
  );

  const entryUrl = `${BASE}/portal/${token}`;
  const entryRes = await fetch(entryUrl, { redirect: 'manual' });

  const sessionRes = await fetch(`${BASE}/api/portal/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessToken: token }),
  });
  const sessionCookies = sessionRes.headers.getSetCookie?.() || [];
  const hasSessionCookie = sessionCookies.some((c) => /__portal_session=/i.test(c));
  const sessionBody = await sessionRes.json().catch(() => null);

  let appStatus: number | null = null;
  let appPath: string | null = null;
  if (hasSessionCookie) {
    const cookieHeader = sessionCookies.map((c) => c.split(';')[0]).join('; ');
    const appRes = await fetch(`${BASE}/portal/app`, {
      redirect: 'follow',
      headers: { Cookie: cookieHeader },
    });
    appStatus = appRes.status;
    appPath = new URL(appRes.url).pathname;
  }

  const pass =
    Boolean(token) &&
    entryRes.status === 200 &&
    sessionRes.ok &&
    hasSessionCookie &&
    appStatus === 200 &&
    Boolean(appPath?.startsWith('/portal/app'));

  console.log(
    JSON.stringify(
      {
        SMOKE_ENV: projectId,
        customerId,
        tokenLength: token.length,
        accessUrlPath: '/portal/<redacted>',
        entryStatus: entryRes.status,
        sessionStatus: sessionRes.status,
        sessionError: (sessionBody as { error?: string } | null)?.error ?? null,
        hasSessionCookie,
        portalAppStatus: appStatus,
        portalAppPath: appPath,
        SMOKE_RESULT: pass ? 'PORTAL_PASS' : 'PORTAL_FAIL',
        REAL_CHARGES: 0,
        REAL_EMAIL: 0,
        REAL_SMS: 0,
        secretFile: 'secrets/staging-portal-smoke.json',
      },
      null,
      2,
    ),
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(
    JSON.stringify({ SMOKE_RESULT: 'PORTAL_FAIL', error: String(err?.message || err) }),
  );
  process.exit(1);
});
