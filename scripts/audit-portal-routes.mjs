#!/usr/bin/env node
/**
 * PORTAL-P2-S5 static route authorization gate.
 * ENVIRONMENT=EMULATOR evidence only — no production contact.
 *
 * Detects protected portal pages missing feature wiring / client-only protection patterns,
 * and verifies canonical route-access module + API authorizeRoute exist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const findings = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === 'page.tsx') acc.push(full);
  }
  return acc;
}

const routeAccess = read('packages/firebase/src/portal-route-access.ts');
if (!routeAccess) {
  findings.push('portal-route-access.ts missing');
} else {
  for (const symbol of [
    'requirePortalRouteAccess',
    'authorizePortalPath',
    'PORTAL_ROUTE_DEFINITIONS',
    'resolvePortalRouteDefinition',
  ]) {
    if (!routeAccess.includes(symbol)) findings.push(`portal-route-access missing ${symbol}`);
  }
  if (!/requirePortalAuthorized/.test(routeAccess)) {
    findings.push('route access must compose requirePortalAuthorized');
  }
  if (!/requirePortalOwnedRecord/.test(routeAccess)) {
    findings.push('route access must compose requirePortalOwnedRecord for resources');
  }
}

const apiRouter = read('packages/api/src/routers/portal360.ts');
const authorizeRest = read('apps/web/src/app/api/portal/authorize-route/route.ts');
const hasRouteAuthApi =
  (/authorizeRoute/.test(apiRouter || '') &&
    /requirePortalRouteAccess|authorizePortalPath/.test(apiRouter || '')) ||
  /requirePortalRouteAccess|authorizePortalPath/.test(authorizeRest || '');
if (!hasRouteAuthApi) {
  findings.push('missing authorizeRoute API (tRPC or /api/portal/authorize-route)');
}

const shell = read('apps/web/src/components/portal/portal-shell.tsx');
if (!shell || !/authorizePortalRouteClient|authorizeRoute/.test(shell)) {
  findings.push('PortalAuthedFrame must call canonical route auth');
}
if (shell && !/routeAuthLoading|routeAuth\.isLoading/.test(shell)) {
  findings.push('PortalAuthedFrame must wait for route auth before rendering children');
}
const authorizeApi = read('apps/web/src/app/api/portal/authorize-route/route.ts');
if (!authorizeApi || !/requirePortalRouteAccess|authorizePortalPath/.test(authorizeApi)) {
  findings.push('GET/POST /api/portal/authorize-route must use canonical route access helpers');
}

const portalApp = path.join(root, 'apps/web/src/app/portal');
const pages = walk(portalApp);
const protectedPages = pages.filter((p) => {
  const rel = path.relative(portalApp, p).replace(/\\/g, '/');
  if (rel === 'page.tsx' || rel === 'login/page.tsx') return false;
  if (rel.startsWith('access/') || rel.startsWith('invite/')) return false;
  // token routes: [token]/...
  return rel.includes('[token]');
});

/** Narrow reviewed allowlist: authenticated routes without a feature prop. */
const allowlistNoFeatureProp = new Set([
  '[token]/notifications/page.tsx',
  '[token]/contacts/page.tsx',
]);

/** Home uses PortalShell + dashboard API (server-authorized); frame optional. */
const allowlistWithoutFrame = new Set(['[token]/page.tsx']);

for (const pagePath of protectedPages) {
  const rel = path.relative(portalApp, pagePath).replace(/\\/g, '/');
  const src = fs.readFileSync(pagePath, 'utf8');
  const usesFrame = /PortalAuthedFrame/.test(src);
  const hasFeature = /feature\s*=\s*['"][a-z_]+['"]/.test(src) || /feature=\{/.test(src);
  if (
    !usesFrame &&
    !allowlistWithoutFrame.has(rel) &&
    !/authorizeRoute|requirePortalRouteAccess/.test(src)
  ) {
    findings.push(`${rel}: protected page lacks PortalAuthedFrame / route auth`);
  }
  if (usesFrame && !hasFeature && !allowlistNoFeatureProp.has(rel)) {
    findings.push(`${rel}: feature-protected page missing feature prop on PortalAuthedFrame`);
  }
  // Client-only redirect as sole protection is banned when no frame/API guard
  if (!usesFrame && /router\.replace|redirect\(/.test(src) && !/trpc\.|fetch\(/.test(src)) {
    findings.push(`${rel}: client redirect appears to be sole protection`);
  }
}

if (!routeAccess || !/segment:\s*'billing'/.test(routeAccess)) {
  findings.push('PORTAL_ROUTE_DEFINITIONS missing billing segment');
}
if (!routeAccess || !/jobs\/\[jobId\]/.test(routeAccess)) {
  findings.push('PORTAL_ROUTE_DEFINITIONS missing jobs/[jobId] resource route');
}

if (findings.length) {
  console.error('audit:portal-routes FAILED');
  for (const f of findings) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`audit:portal-routes PASS (${protectedPages.length} protected pages reviewed)`);
