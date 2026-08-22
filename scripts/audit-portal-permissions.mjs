#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  {
    file: 'packages/types/src/portal-permissions.ts',
    needles: ['resolvePortalPermission', 'PORTAL_USER_ROLES', 'PORTAL_ACTIONS'],
  },
  {
    file: 'packages/firebase/src/portal360.ts',
    needles: ['requirePortalAuthorized', 'resolvePortalPermission'],
  },
  {
    file: 'packages/api/src/routers/portal360.ts',
    needles: ['portalPublicProcedure', 'portalAuth(ctx, input)'],
  },
];

const failures = [];
for (const check of checks) {
  const full = path.join(root, check.file);
  if (!fs.existsSync(full)) {
    failures.push(`${check.file}: missing`);
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const needle of check.needles) {
    if (!text.includes(needle)) failures.push(`${check.file}: missing ${needle}`);
  }
}

if (failures.length) {
  console.error('Portal permissions audit: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Portal permissions audit: PASS');
