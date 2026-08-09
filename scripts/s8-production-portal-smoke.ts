/**
 * Production portal rotate + session smoke (one customer).
 *
 *   npx tsx scripts/s8-production-portal-smoke.ts --apply --allow-production-apply
 *
 * Uses OPERATING_ORGANIZATION_ID from .env. Rotates magic link for first
 * portal-enabled customer (or first customer if none enabled). Never prints raw token.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PRODUCTION_BASE_URL || 'https://yuletide-lighting.web.app';
const PROD = 'yuletide-lighting';

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
  const projectId = values.project || PROD;
  if (projectId !== PROD) throw new Error(`Refusing project ${projectId}`);
  if (!flags.has('apply') || !flags.has('allow-production-apply')) {
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        projectId,
        note: 'Pass --apply --allow-production-apply to rotate + smoke',
      }),
    );
    process.exit(0);
  }

  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.NEXT_PUBLIC_APP_URL = BASE;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = projectId;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const orgId =
    values.organization ||
    process.env.OPERATING_ORGANIZATION_ID ||
    process.env.NEXT_PUBLIC_OPERATING_ORGANIZATION_ID;
  if (!orgId) throw new Error('Set OPERATING_ORGANIZATION_ID in .env or --organization=');

  const { getAdminFirestore } = await import('../packages/firebase/src/admin.ts');
  const { rotatePortalAccessToken } = await import('../packages/firebase/src/portal360.ts');
  const db = getAdminFirestore();

  let customerId = values.customer || '';
  if (!customerId) {
    const enabled = await db
      .collection(`organizations/${orgId}/customers`)
      .where('portalEnabled', '==', true)
      .limit(1)
      .get();
    if (!enabled.empty) {
      customerId = enabled.docs[0]!.id;
    } else {
      const any = await db.collection(`organizations/${orgId}/customers`).limit(1).get();
      if (any.empty) throw new Error(`No customers in org ${orgId}`);
      customerId = any.docs[0]!.id;
    }
  }

  console.log(
    JSON.stringify({
      mode: 'apply',
      projectId,
      organizationId: orgId,
      customerId,
      base: BASE,
    }),
  );

  const rotated = await rotatePortalAccessToken(orgId, customerId, 'prod-portal-smoke');
  const token = rotated.token;
  if (!token || token.length < 20) throw new Error('rotate did not return usable token');

  const entryRes = await fetch(`${BASE}/portal/${token}`, { redirect: 'manual' });
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
    entryRes.status === 200 &&
    sessionRes.ok &&
    hasSessionCookie &&
    appStatus === 200 &&
    Boolean(appPath?.startsWith('/portal/app'));

  console.log(
    JSON.stringify(
      {
        SMOKE_ENV: projectId,
        organizationId: orgId,
        customerId,
        tokenLength: token.length,
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
      },
      null,
      2,
    ),
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ SMOKE_RESULT: 'PORTAL_FAIL', error: String(err?.message || err) }));
  process.exit(1);
});
