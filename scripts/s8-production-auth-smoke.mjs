/**
 * Production authenticated smoke (staff + optional creator check).
 * Credentials via env only — never print passwords.
 *
 *   SMOKE_EMAIL=info@yuletidelightingco.com SMOKE_PASSWORD=*** node scripts/s8-production-auth-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PRODUCTION_BASE_URL || 'https://yuletide-lighting.web.app';

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
  const fileEnv = loadEnvFile(path.join(repoRoot, '.env'));
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fileEnv.NEXT_PUBLIC_FIREBASE_API_KEY;
  const email = process.env.SMOKE_EMAIL || '';
  const password = process.env.SMOKE_PASSWORD || '';
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!email || !password) {
    throw new Error('Set SMOKE_EMAIL and SMOKE_PASSWORD for production auth smoke');
  }

  const results = [];
  const health = await fetch(`${BASE}/api/health`);
  results.push({ step: 'health', ok: health.ok, status: health.status });

  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signInBody = await signInRes.json();
  const idToken = signInBody.idToken;
  results.push({
    step: 'auth_signInWithPassword',
    ok: signInRes.ok && Boolean(idToken),
    status: signInRes.status,
    error: signInBody.error?.message || null,
  });

  if (idToken) {
    for (const route of ['/app', '/app/customers', '/app/proposals', '/app/schedule', '/creator', '/creator/modules']) {
      const res = await fetch(`${BASE}${route}`, {
        redirect: 'manual',
        headers: { Authorization: `Bearer ${idToken}`, Cookie: `__session=${idToken}` },
      });
      results.push({
        step: `route:${route}`,
        ok: res.status === 200 || res.status === 307 || res.status === 302,
        status: res.status,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        SMOKE_ENV: 'yuletide-lighting',
        BASE,
        email,
        results,
        SMOKE_RESULT: failed.length === 0 ? 'AUTH_PASS' : 'AUTH_FAIL',
      },
      null,
      2,
    ),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ SMOKE_RESULT: 'AUTH_FAIL', error: String(err?.message || err) }));
  process.exit(1);
});
