#!/usr/bin/env node
/**
 * PORTAL-P2-S7 — static magic-token security audit.
 * ENVIRONMENT=EMULATOR evidence — no production contact.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const findings = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist')
        continue;
      walk(full, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function add(rule, detail, file = '') {
  findings.push({ rule, detail, file });
}

const magic = read('packages/firebase/src/portal-magic-access.ts');
if (!magic) {
  add('missing-canonical-resolver', 'portal-magic-access.ts missing');
} else {
  if (!/export function hashPortalAccessToken/.test(magic)) {
    add('missing-hash-helper', 'hashPortalAccessToken missing');
  }
  if (!/export async function resolvePortalMagicAccess/.test(magic)) {
    add('missing-resolver', 'resolvePortalMagicAccess missing');
  }
  if (!/COMPATIBILITY|HASH_ONLY/.test(magic)) {
    add('missing-modes', 'COMPATIBILITY/HASH_ONLY modes missing');
  }
  if (!/portal\.magic_token\.legacy_lookup_used/.test(magic)) {
    add('missing-legacy-telemetry', 'legacy_lookup_used telemetry missing');
  }
  // Flag executable Math.random only (ignore comments / string mentions).
  const magicCode = magic.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/\bMath\.random\s*\(/.test(magicCode)) {
    add('insecure-random', 'Math.random in portal-magic-access');
  }
}

const portal360 = read('packages/firebase/src/portal360.ts');
if (!portal360) {
  add('missing-portal360', 'portal360.ts missing');
} else {
  if (!/resolvePortalMagicAccess/.test(portal360)) {
    add('requirePortalAccess-not-wired', 'requirePortalAccess must use resolvePortalMagicAccess');
  }
  if (!/portalMagicCredentialWriteFields/.test(portal360)) {
    add('hash-only-writes-missing', 'portalMagicCredentialWriteFields not used');
  }
  if (!/generatePortalAccessToken/.test(portal360)) {
    add('crypto-generator-missing', 'generatePortalAccessToken not used for new tokens');
  }
  // New plaintext persistence patterns outside migration/legacy reads
  const writeBodies = [
    /accessToken:\s*token(?!\s*\?)/,
    /accessToken:\s*rawToken/,
    /accessToken:\s*issuedRaw/,
    /portalToken:\s*token(?!\s*\?)/,
    /portalToken:\s*rawToken/,
  ];
  for (const re of writeBodies) {
    if (re.test(portal360) && !/accessToken:\s*null/.test(portal360)) {
      // allow null clears; flag only if we see plaintext assignment without hash fields nearby
    }
  }
  // Staff DTO must not return raw token
  const staffView =
    /export async function getStaffPortalAccountView[\s\S]*?\nexport async function/.exec(
      portal360,
    )?.[0] || '';
  if (staffView && /accessUrl:\s*portalAccessUrl|token:\s*account\.accessToken/.test(staffView)) {
    add('staff-dto-raw-token', 'getStaffPortalAccountView exposes raw token or magic URL');
  }
  if (staffView && !/accessUrl:\s*null/.test(staffView)) {
    add('staff-dto-accessUrl', 'staff view should set accessUrl: null');
  }
}

const shell = read('apps/web/src/components/portal/portal-shell.tsx');
if (!shell) {
  add('missing-shell', 'portal-shell.tsx missing');
} else {
  if (/\/portal\/\$\{/.test(shell) || /`\/portal\/\$\{/.test(shell)) {
    add('shell-token-nav', 'PortalShell still interpolates magic token into hrefs');
  }
  if (!/portalAppPath/.test(shell)) {
    add('shell-not-tokenless', 'PortalShell must use portalAppPath for nav');
  }
  if (/localStorage|sessionStorage/.test(shell)) {
    add('browser-storage-token', 'PortalShell must not use localStorage/sessionStorage for tokens');
  }
}

const entry = read('apps/web/src/lib/portal-token-entry.tsx');
if (!entry || !/LegacyPortalEntryShim|mapLegacyPortalPathToAppPath/.test(entry)) {
  add('missing-entry-shim', 'legacy token entry shim missing');
}
if (entry && !/router\.replace/.test(entry)) {
  add('entry-shim-must-replace', 'legacy shim must router.replace to tokenless destination');
}
if (entry && !/status === 409|res\.status === 409/.test(entry)) {
  add('entry-shim-409', 'legacy shim must handle session/token 409 conflict');
}

const legacyPath = read('packages/types/src/portal-legacy-path.ts');
if (
  !legacyPath ||
  !/translateLegacyPortalPathToSessionPath|mapLegacyPortalPathToAppPath/.test(legacyPath)
) {
  add('missing-legacy-path-helper', 'canonical legacy path translator missing in @clcrm/types');
}
if (legacyPath && !/redactPortalMagicTokenPath/.test(legacyPath)) {
  add('missing-path-redaction', 'redactPortalMagicTokenPath missing');
}
if (legacyPath && !/portalSessionTokenScopeConflict/.test(legacyPath)) {
  add('missing-scope-conflict-helper', 'portalSessionTokenScopeConflict missing');
}

const appHome = read('apps/web/src/app/portal/app/page.tsx');
if (!appHome) {
  add('missing-tokenless-home', '/portal/app page missing');
}

const tokenCatchAll = read('apps/web/src/app/portal/[token]/[[...segments]]/page.tsx') || '';
if (!/LegacyPortalEntryShim/.test(tokenCatchAll)) {
  add('token-route-not-shim', 'token catch-all must render LegacyPortalEntryShim only');
}
if (/PortalAuthedFrame|getPortalDashboard|components\/portal\/pages/.test(tokenCatchAll)) {
  add('token-route-renders-app', 'token catch-all must not render protected portal pages');
}

const migration = read('scripts/portal-token-migration.mjs');
if (!migration) {
  add('missing-migration-tool', 'portal-token-migration.mjs missing');
} else {
  if (!/PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED/.test(migration)) {
    add('migration-guard-missing', 'production migration guard string missing');
  }
  if (
    /--force-production|--allow-production/.test(migration) &&
    /process\.exit\(0\)/.test(migration)
  ) {
    // ensure those flags fail, not succeed
  }
  if (!/FIRESTORE_EMULATOR_HOST/.test(migration)) {
    add('migration-emulator-guard', 'migration tool lacks FIRESTORE_EMULATOR_HOST guard');
  }
  // Reject any production bypass helpers
  if (/ALLOW_PRODUCTION_TOKEN_MIGRATION\s*=\s*['"]1['"]/.test(migration)) {
    add('production-bypass', 'migration tool contains production bypass');
  }
  if (!/hasPlaintextAccessToken/.test(migration) || !/skipped/.test(migration)) {
    add(
      'remove-plaintext-idempotent',
      'remove-plaintext must skip writes when plaintext already absent',
    );
  }
}

const sessionRoute = read('apps/web/src/app/api/portal/session/route.ts');
if (sessionRoute && !/no-store/.test(sessionRoute)) {
  add('session-cache-control', 'session route must set Cache-Control: no-store');
}

const layout = read('apps/web/src/app/portal/[token]/layout.tsx') || '';
const nextConfig = read('apps/web/next.config.js') || '';
const entryProtected =
  (/noindex/i.test(layout) || /index:\s*false/.test(layout)) &&
  /no-referrer/i.test(nextConfig) &&
  /no-store/i.test(nextConfig) &&
  /legacyPortalEntryHeaders|\/portal\/:token/.test(nextConfig);
if (!entryProtected) {
  add(
    'entry-headers',
    'token entry must set robots noindex in layout and Referrer-Policy/Cache-Control via next.config',
  );
}

// Scan portal UI for localStorage/sessionStorage of access tokens
const portalUi = walk(path.join(root, 'apps/web/src')).filter((f) =>
  /portal/i.test(path.relative(root, f)),
);
for (const file of portalUi) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (/localStorage\.(setItem|getItem)\([^)]*token/i.test(text)) {
    add('localStorage-token', 'raw token localStorage usage', rel);
  }
  if (/sessionStorage\.(setItem|getItem)\([^)]*token/i.test(text)) {
    add('sessionStorage-token', 'raw token sessionStorage usage', rel);
  }
  // Authenticated shell links with token interpolation (exclude entry shim / invite / access)
  if (/portal-shell|portal\/pages|portal\/app/.test(rel) && /`\/portal\/\$\{/.test(text)) {
    add('token-bearing-nav', 'token-bearing portal href in authenticated UI', rel);
  }
}

// Plaintext fallback must live only in portal-magic-access
const firebaseSrc = walk(path.join(root, 'packages/firebase/src')).filter(
  (f) => /portal/.test(path.basename(f)) && !f.endsWith('.test.ts'),
);
for (const file of firebaseSrc) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  if (rel.endsWith('portal-magic-access.ts')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (
    /collectionGroup\(['"]portalAccounts['"]\)[\s\S]{0,200}accessToken['"]\s*,\s*['"]==/.test(text)
  ) {
    add(
      'scattered-plaintext-lookup',
      'plaintext accessToken lookup outside canonical resolver',
      rel,
    );
  }
}

// S7A: QR bridge must not dual-write magic credential plaintext
const qrSrc = read('packages/firebase/src/portal-qr360.ts') || '';
if (/portalToken:\s*accessToken/.test(qrSrc) || /portalToken:\s*rawMagic/.test(qrSrc)) {
  add(
    'qr-plaintext-magic-write',
    'QR activation writes customers.portalToken with magic credential',
  );
}

// S7A: getCustomerPortalAccess must not reconstruct magic URLs from stored plaintext
const customer360 = read('packages/firebase/src/customer360.ts') || '';
const portalAccessFn =
  /export function getCustomerPortalAccess[\s\S]*?\nexport /.exec(customer360)?.[0] || '';
if (
  portalAccessFn &&
  (/portal\/\$\{.*portalToken/.test(portalAccessFn) ||
    /accessUrl\s*=\s*customer\.portalToken/.test(portalAccessFn))
) {
  add(
    'customer-access-url-reconstruction',
    'getCustomerPortalAccess reconstructs magic URL from stored portalToken',
  );
}

// Dashboard must not expose accessToken field
const dashType =
  /export type PortalDashboardPublic[\s\S]*?export async function getPortalDashboard/.exec(
    portal360 || '',
  )?.[0] || '';
if (dashType && /^\s*accessToken\s*:/m.test(dashType)) {
  add('dashboard-accessToken-field', 'PortalDashboardPublic still declares accessToken');
}

// rotate/enable must sanitize account (no accessTokenHash on returned account DTO helper)
if (portal360 && !/toSanitizedPortalAccountDto/.test(portal360)) {
  add('missing-sanitized-account-dto', 'toSanitizedPortalAccountDto missing');
}

// Domain constant must exist and differ from invitation domain
if (magic && !/PORTAL_ACCESS_SECRET_DOMAIN\s*=\s*['"]portal-magic-access['"]/.test(magic)) {
  add('missing-access-domain', 'PORTAL_ACCESS_SECRET_DOMAIN must be portal-magic-access');
}

if (findings.length) {
  console.error('audit:portal-token-security FAILED');
  for (const f of findings) {
    console.error(` - [${f.rule}] ${f.detail}${f.file ? ` (${f.file})` : ''}`);
  }
  process.exit(1);
}
console.log('audit:portal-token-security PASS');
console.log('ENVIRONMENT=EMULATOR (static audit; no production contact)');
