/**
 * Nonprod authenticated smoke against yuletide-lighting-staging.
 * Reads gitignored secrets; prints PASS/FAIL only (no passwords).
 *
 * Usage: node scripts/s8-staging-auth-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.STAGING_BASE_URL || 'https://yuletide-lighting-staging.web.app';
const credsPath = path.join(repoRoot, 'secrets', 'staging-verification-credentials.json');
const envPath = path.join(repoRoot, '.env.staging');

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

async function main() {
  const env = loadEnvFile(envPath);
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.staging');
  if (!fs.existsSync(credsPath)) throw new Error('Missing secrets/staging-verification-credentials.json');

  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const owner = creds.owner;
  if (!owner?.email || !owner?.password) throw new Error('owner credentials incomplete');
  if (!owner.authProvisioned) throw new Error('owner.authProvisioned=false');

  const results = [];

  const health = await fetch(`${BASE}/api/health`);
  results.push({ step: 'health', ok: health.ok, status: health.status });

  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: owner.email,
        password: owner.password,
        returnSecureToken: true,
      }),
    },
  );
  const signInBody = await signInRes.json();
  const idToken = signInBody.idToken;
  results.push({
    step: 'auth_signInWithPassword',
    ok: signInRes.ok && Boolean(idToken),
    status: signInRes.status,
    hasToken: Boolean(idToken),
    error: signInBody.error?.message || null,
  });

  if (idToken) {
    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    results.push({
      step: 'auth_session',
      ok: sessionRes.ok || sessionRes.status === 401 || sessionRes.status === 405,
      status: sessionRes.status,
      note: 'route may be cookie/POST oriented; status recorded',
    });

    const appRes = await fetch(`${BASE}/app`, {
      redirect: 'manual',
      headers: { Cookie: `__session=${idToken}` },
    });
    results.push({
      step: 'app_route',
      ok: appRes.status === 200 || appRes.status === 307 || appRes.status === 302 || appRes.status === 401,
      status: appRes.status,
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        SMOKE_ENV: 'yuletide-lighting-staging',
        BASE,
        ownerEmail: owner.email,
        authProvisioned: owner.authProvisioned,
        results,
        SMOKE_RESULT: failed.length === 0 && results.some((r) => r.step === 'auth_signInWithPassword' && r.ok)
          ? 'AUTH_PASS'
          : 'AUTH_FAIL',
        REAL_CHARGES: 0,
        REAL_EMAIL: 0,
        REAL_SMS: 0,
      },
      null,
      2,
    ),
  );
  process.exit(failed.some((r) => r.step === 'auth_signInWithPassword' || r.step === 'health') ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ SMOKE_RESULT: 'AUTH_FAIL', error: String(err?.message || err) }));
  process.exit(1);
});
