#!/usr/bin/env node
/**
 * PORTAL-P2-S6 static idempotency gate (high-impact actions only).
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

const mutation = read('packages/firebase/src/portal-mutation.ts');
if (!mutation || !/withPortalIdempotency/.test(mutation)) {
  findings.push('canonical withPortalIdempotency missing');
}

const proposals = read('packages/firebase/src/proposals.ts');
if (proposals) {
  const body =
    /export async function recordPublicApproval[\s\S]*?\nexport async function/.exec(
      proposals,
    )?.[0] || '';
  if (body && !/already finalized|approved.*deposit_paid|Replay-safe/.test(body)) {
    findings.push('proposal approval lacks deterministic duplicate/replay handling');
  }
}

const agreements = read('packages/firebase/src/agreements.ts');
if (agreements) {
  const body =
    /export async function recordAgreementSignature[\s\S]*?\nexport async function/.exec(
      agreements,
    )?.[0] || '';
  if (body && !/isAgreementSignedStatus/.test(body)) {
    findings.push('agreement signing lacks already-signed replay protection');
  }
  if (body && !/runTransaction/.test(body)) {
    findings.push('agreement signing lacks transactional concurrency guard');
  }
}

const mockups = read('packages/firebase/src/mockups360.ts');
if (mockups) {
  const body =
    /export async function recordCustomerMockupApproval[\s\S]*?\nexport async function/.exec(
      mockups,
    )?.[0] || '';
  if (body && !/current === 'approved'|Replay-safe/.test(body)) {
    findings.push('mockup approval lacks deterministic duplicate handling');
  }
}

const checkout = read('apps/web/src/app/api/stripe/checkout/route.ts');
if (checkout) {
  if (!/portalPaymentSafeMode|idempotencyKey/.test(checkout)) {
    findings.push('payment initiation lacks safe-mode and/or provider idempotency key');
  }
}

const portal360 = read('packages/firebase/src/portal360.ts');
for (const name of [
  'submitPortalServiceRequest',
  'submitPortalScheduleRequest',
  'submitPortalRebookRequest',
  'sendPortalMessage',
]) {
  const re = new RegExp(`export async function ${name}[\\s\\S]*?\\nexport async function`);
  const body = re.exec(portal360 || '')?.[0] || '';
  if (!body) {
    findings.push(`${name}: missing`);
    continue;
  }
  if (!/withPortalIdempotency/.test(body) && name !== 'sendPortalMessage') {
    // sendPortalMessage also requires it
    findings.push(`${name}: missing withPortalIdempotency`);
  }
  if (name === 'sendPortalMessage' && !/withPortalIdempotency/.test(body)) {
    findings.push('sendPortalMessage: missing withPortalIdempotency');
  }
}

const rebook = read('packages/firebase/src/rebooking360.ts');
if (rebook && !/Terminal states|replayed: true/.test(rebook)) {
  findings.push('rebooking terminal-state replay protection missing');
}

if (findings.length) {
  console.error('audit:portal-idempotency FAILED');
  for (const f of findings) console.error(` - ${f}`);
  process.exit(1);
}
console.log('audit:portal-idempotency PASS');
