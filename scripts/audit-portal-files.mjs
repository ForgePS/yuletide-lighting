#!/usr/bin/env node
/**
 * PORTAL-P2-S5 static file-security gate.
 * ENVIRONMENT=EMULATOR evidence only — no production contact.
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

const fileAccess = read('packages/firebase/src/portal-file-access.ts');
if (!fileAccess) {
  findings.push('portal-file-access.ts missing');
} else {
  for (const symbol of [
    'createPortalFileAccess',
    'verifyPortalFileTicket',
    'readPortalFileFromTicket',
    'sanitizePortalFilename',
    'assertSafePortalStoragePath',
  ]) {
    if (!fileAccess.includes(symbol)) findings.push(`portal-file-access missing ${symbol}`);
  }
  if (
    !/visibility !== 'customer_visible'/.test(fileAccess) &&
    !/visibility !== \"customer_visible\"/.test(fileAccess)
  ) {
    findings.push('file access must deny non-customer_visible classifications');
  }
  if (!/portalFileAccessTtlMs|fileAccessTtlMinutes/.test(fileAccess)) {
    findings.push('file tickets must use centralized TTL');
  }
  if (/getDownloadURL|makePublic/.test(fileAccess)) {
    findings.push('portal-file-access must not create permanent public ACLs');
  }
}

const apiFiles = read('apps/web/src/app/api/portal/files/route.ts');
if (!apiFiles) {
  findings.push('GET /api/portal/files route missing');
} else {
  if (!/readPortalFileFromTicket/.test(apiFiles)) {
    findings.push('portal files route must verify tickets via readPortalFileFromTicket');
  }
  if (!/private,\s*no-store/.test(apiFiles)) {
    findings.push('portal files route must set Cache-Control private, no-store');
  }
  if (/searchParams\.get\(['"]path['"]\)/.test(apiFiles)) {
    findings.push('portal files route must not accept arbitrary Storage path from client');
  }
}

const portal360 = read('packages/firebase/src/portal360.ts');
if (portal360) {
  // Documents / agreements should ticket files
  const docsBody = (() => {
    const m = /export async function listPortalDocuments[\s\S]*?\nexport async function/.exec(
      portal360,
    );
    return m ? m[0] : '';
  })();
  if (docsBody && !/createPortalFileAccess/.test(docsBody)) {
    findings.push('listPortalDocuments must use createPortalFileAccess');
  }
  const uploadBody = (() => {
    const m = /export async function uploadPortalPhoto[\s\S]*?\nexport async function/.exec(
      portal360,
    );
    return m ? m[0] : '';
  })();
  if (uploadBody) {
    if (!/maxUploadBytes/.test(uploadBody)) {
      findings.push('uploadPortalPhoto must enforce portalSecurity.maxUploadBytes');
    }
    if (!/sanitizePortalFilename/.test(uploadBody)) {
      findings.push('uploadPortalPhoto must sanitize filenames');
    }
    // Must not return raw path as public primary URL
    if (/return\s*\{[\s\S]*path:\s*uploaded\.path/.test(uploadBody)) {
      findings.push('uploadPortalPhoto must not expose raw Storage path in public DTO');
    }
  }
}

const staffFiles = read('apps/web/src/app/api/files/route.ts');
if (staffFiles && !/office|staff|organizationId|requireAuth|auth/.test(staffFiles)) {
  findings.push('staff /api/files appears unauthenticated');
}

const securityCfg = read('packages/firebase/src/portal-security-config.ts');
if (
  !securityCfg ||
  !/fileAccessTtlMinutes/.test(securityCfg) ||
  !/maxUploadBytes/.test(securityCfg)
) {
  findings.push('portal-security-config must define fileAccessTtlMinutes and maxUploadBytes');
}

if (findings.length) {
  console.error('audit:portal-files FAILED');
  for (const f of findings) console.error(` - ${f}`);
  process.exit(1);
}
console.log('audit:portal-files PASS');
