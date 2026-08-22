#!/usr/bin/env node
/**
 * PORTAL-P2-S4 public DTO allowlist gate.
 * Scans public portal readers and their explicit mappers for raw-document returns
 * and sensitive field names.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'packages/firebase/src/portal360.ts');
const source = fs.readFileSync(file, 'utf8');
const findings = [];
const sensitive = [
  'internalNotes',
  'margin',
  'profit',
  'tokenHash',
  'otp',
  'otpHash',
  'stripeCustomerId',
  'sessionVersion',
  'laborCost',
  'commission',
];

function bodyOf(name) {
  const match = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\b`).exec(source);
  if (!match) return '';
  const remainder = source.slice(match.index + match[0].length);
  const next = /\n(?:export\s+)?(?:async\s+)?function\s+\w+\b/.exec(remainder);
  return source.slice(match.index, next ? match.index + match[0].length + next.index : undefined);
}

const publicReaders = [
  'toPublicCustomer',
  'getPortalDashboard',
  'listPortalTimeline',
  'listPortalNotifications',
  'listPortalContacts',
  'listPortalServiceRequests',
  'listPortalAgreements',
  'listPortalDocuments',
  'listPortalStorage',
  'listPortalReviews',
  'listPortalReferrals',
  'getPortalMessages',
  'listPortalProperties',
  'listPortalConsultations',
  'listPortalTakedowns',
  'mapPortalInvoice',
  'mapPortalProposal',
  'mapPortalMockup',
  'mapPortalJobSummary',
  'listPortalInvoices',
  'listPortalProposals',
  'listPortalMockups',
  'listPortalJobs',
  'getPortalJobDetail',
  'getPortalSigningHub',
];

for (const name of publicReaders) {
  const body = bodyOf(name);
  if (!body) {
    findings.push(`${name}: public mapper/reader missing`);
    continue;
  }
  for (const field of sensitive) {
    if (new RegExp(`\\b${field}\\b`, 'i').test(body)) {
      findings.push(`${name}: sensitive field "${field}" referenced`);
    }
  }
  if (/return\s*\{\s*\.\.\.[A-Za-z_$][\w$]*/.test(body)) {
    findings.push(`${name}: raw object spread in public return`);
  }
  if (/return\s+(?:await\s+)?[A-Za-z_$][\w$]*\.data\s*\(/.test(body)) {
    findings.push(`${name}: Firestore .data() returned directly`);
  }
  if (
    /return\s+(?:await\s+)?(?:doc|snapshot|snap)\b(?!\s*[?.]\s*(?:id|exists|empty|docs))/.test(body)
  ) {
    findings.push(`${name}: document/snapshot returned directly`);
  }
}

if (findings.length) {
  console.error('PORTAL PUBLIC DTO AUDIT: FAIL');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `PORTAL PUBLIC DTO AUDIT: PASS (${publicReaders.length} allowlisted public readers/mappers)`,
);
