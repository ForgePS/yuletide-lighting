#!/usr/bin/env node
/**
 * PORTAL-P2-S6 static mutation gate.
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
if (!mutation) findings.push('portal-mutation.ts missing');
else {
  for (const s of [
    'requirePortalMutation',
    'canPortalTransition',
    'withPortalIdempotency',
    'portalInvoicePayableCents',
    'portalPaymentSafeMode',
  ]) {
    if (!mutation.includes(s)) findings.push(`portal-mutation missing ${s}`);
  }
  if (!/requirePortalAuthorized/.test(mutation)) {
    findings.push('requirePortalMutation must compose requirePortalAuthorized');
  }
  if (!/requirePortalOwnedRecord/.test(mutation)) {
    findings.push('requirePortalMutation must compose requirePortalOwnedRecord');
  }
}

const checkout = read('apps/web/src/app/api/stripe/checkout/route.ts');
if (!checkout) findings.push('stripe checkout route missing');
else {
  if (!/portalInvoicePayableCents/.test(checkout)) {
    findings.push('checkout must derive amount via portalInvoicePayableCents');
  }
  if (/unit_amount:\s*amountCents/.test(checkout) && !/portalInvoicePayableCents/.test(checkout)) {
    findings.push('checkout appears to trust client amount');
  }
  if (!/portalPaymentSafeMode/.test(checkout)) {
    findings.push('checkout must honor portalPaymentSafeMode (no live charges in emulator)');
  }
  // Client body amount must not be used as unit_amount source of truth
  if (/const\s*\{\s*invoiceToken,\s*amountCents\s*\}/.test(checkout)) {
    findings.push('checkout must not destructure client amountCents as authoritative');
  }
}

const proposals = read('packages/firebase/src/proposals.ts');
if (proposals) {
  const fn = /export async function recordPublicApproval[\s\S]*?\nexport async function/.exec(
    proposals,
  );
  const body = fn ? fn[0] : '';
  if (body && !/canPortalTransition/.test(body)) {
    findings.push('recordPublicApproval must enforce canPortalTransition / state guard');
  }
}

const mockups = read('packages/firebase/src/mockups360.ts');
if (mockups) {
  const fn =
    /export async function recordCustomerMockupApproval[\s\S]*?\nexport async function/.exec(
      mockups,
    );
  const body = fn ? fn[0] : '';
  if (body && !/canPortalTransition/.test(body)) {
    findings.push('recordCustomerMockupApproval must enforce state transitions');
  }
  if (body && !/staff_only|draft/.test(body)) {
    findings.push('recordCustomerMockupApproval must deny staff-only/draft mockups');
  }
}

const agreements = read('packages/firebase/src/agreements.ts');
if (agreements && !/runTransaction/.test(agreements)) {
  findings.push('recordAgreementSignature should use runTransaction for one-time signing');
}

const rebook = read('packages/firebase/src/rebooking360.ts');
if (rebook && !/rebooked.*upgrade_requested.*declined|Terminal states/.test(rebook)) {
  findings.push('processRebookRecord must short-circuit terminal statuses');
}

const qr = read('packages/firebase/src/portal-qr360.ts');
if (
  qr &&
  !/used_for_activation/.test(qr.split('function isInactiveStatus')[1]?.slice(0, 400) || '')
) {
  findings.push('isInactiveStatus must include used_for_activation');
}

const portal360 = read('packages/firebase/src/portal360.ts');
if (portal360) {
  if (!/withPortalIdempotency/.test(portal360)) {
    findings.push('portal360 mutations should use withPortalIdempotency for high-impact creates');
  }
}

if (findings.length) {
  console.error('audit:portal-mutations FAILED');
  for (const f of findings) console.error(` - ${f}`);
  process.exit(1);
}
console.log('audit:portal-mutations PASS');
