#!/usr/bin/env node
/**
 * Fails when unauthorized legacy write patterns remain in production code paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN = [
  {
    file: 'packages/api/src/routers/firestore.ts',
    needle: "colCreate(ctx.auth.organizationId, 'messageThreads'",
    label: 'legacy messageThreads create in messagesRouter',
  },
  {
    file: 'packages/firebase/src/customer360.ts',
    needle: "subCreate(\n    orgId,\n    customerId,\n    'properties'",
    label: 'customer subcollection property create (should be org-only)',
  },
  {
    file: 'packages/firebase/src/customer360.ts',
    needle: "subCreate(orgId, customerId, 'jobs'",
    label: 'customer subcollection job create (should be org-only)',
  },
  {
    file: 'packages/firebase/src/messages360.ts',
    needle: "Legacy compat\n  await colCreate(orgId, 'messages'",
    label: 'flat messages dual-write from sendMessage360',
  },
];

const hits = [];
for (const rule of FORBIDDEN) {
  const full = path.join(root, rule.file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  if (rule.file.includes('messages360')) {
    // sendMessage360 must not dual-write flat messages after conversation msgCreate
    if (/sendMessage360[\s\S]{0,1200}?await colCreate\(orgId, 'messages'/.test(text)) {
      hits.push(`${rule.label} @ ${rule.file}`);
    }
    continue;
  }
  if (text.includes(rule.needle) || text.includes(rule.needle.replace(/\n/g, '\r\n'))) {
    hits.push(`${rule.label} @ ${rule.file}`);
  }
  if (
    rule.file.includes('customer360') &&
    /subCreate\(\s*orgId,\s*customerId,\s*'properties'/.test(text)
  ) {
    if (!hits.some((h) => h.includes('property create'))) hits.push(`${rule.label} @ ${rule.file}`);
  }
  if (
    rule.file.includes('customer360') &&
    /subCreate\(\s*orgId,\s*customerId,\s*'jobs'/.test(text)
  ) {
    if (!hits.some((h) => h.includes('job create'))) hits.push(`${rule.label} @ ${rule.file}`);
  }
}

if (hits.length) {
  console.error('Legacy write-path audit FAILED:');
  for (const h of hits) console.error(` - ${h}`);
  process.exit(1);
}
console.log('Legacy write-path audit passed (known forbidden patterns absent).');
