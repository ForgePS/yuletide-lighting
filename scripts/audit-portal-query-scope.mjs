#!/usr/bin/env node
/**
 * PORTAL-P2-S4 static query-scope gate.
 * P0: a portal customer-owned read broadens to an organization collection scan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portalFile = path.join(root, 'packages/firebase/src/portal360.ts');
const source = fs.readFileSync(portalFile, 'utf8');
const findings = [];

function bodyOf(name) {
  const match = new RegExp(`(?:export\\s+)?async\\s+function\\s+${name}\\b`).exec(source);
  if (!match) return '';
  const remainder = source.slice(match.index + match[0].length);
  const next = /\n(?:export\s+)?(?:async\s+)?function\s+\w+\b/.exec(remainder);
  return source.slice(match.index, next ? match.index + match[0].length + next.index : undefined);
}

const customerOwnedReaders = [
  'listPortalCalendarEventsForCustomer',
  'listPortalTimeline',
  'listPortalNotifications',
  'getPortalDashboard',
  'markAllPortalNotificationsRead',
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
  'listPortalInvoices',
  'listPortalProposals',
  'listPortalMockups',
  'listPortalJobs',
];

for (const name of customerOwnedReaders) {
  const body = bodyOf(name);
  if (!body) {
    findings.push(`${name}: function missing from portal360.ts`);
    continue;
  }
  if (/\bcolList\s*</.test(body)) {
    findings.push(`${name}: organization-wide colList<T> is forbidden`);
  }
  if (
    /catch\s*(?:\([^)]*\))?\s*\{[\s\S]*?\bcolList\s*</.test(body) ||
    /(?:fallback|fall\s*back|broad(?:en|er)|organization-wide|org-wide)[\s\S]{0,180}\bcolList\s*</i.test(
      body,
    )
  ) {
    findings.push(`${name}: organization scan fallback pattern detected`);
  }
}

const scopedHelper = bodyOf('colListByCustomerId');
if (!scopedHelper) {
  findings.push('colListByCustomerId: helper missing');
} else {
  if (!/\.where\(\s*['"]customerId['"]\s*,\s*['"]==['"]\s*,\s*customerId\s*\)/.test(scopedHelper)) {
    findings.push('colListByCustomerId: canonical customerId equality query missing');
  }
  if (/\bcolList\s*</.test(scopedHelper) || /catch[\s\S]*collection\(/.test(scopedHelper)) {
    findings.push('colListByCustomerId: organization fallback detected');
  }
}

const markAll = bodyOf('markAllPortalNotificationsRead');
if (
  markAll &&
  !/\.where\(\s*['"]portalUserId['"]\s*,\s*['"]==['"]\s*,\s*ctx\.actingUser\.id\s*\)/.test(markAll)
) {
  findings.push('markAllPortalNotificationsRead: portalUserId scope missing');
}

const calendar = bodyOf('listPortalCalendarEventsForCustomer');
if (
  calendar &&
  !/\.where\(\s*['"]customerId['"]\s*,\s*['"]==['"]\s*,\s*customerId\s*\)/.test(calendar)
) {
  findings.push('listPortalCalendarEventsForCustomer: customerId scope missing');
}

if (findings.length) {
  console.error('PORTAL QUERY SCOPE AUDIT: FAIL (P0)');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `PORTAL QUERY SCOPE AUDIT: PASS (${customerOwnedReaders.length} readers; canonical helper fails closed)`,
);
