#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'packages/firebase/src/portal-session.ts',
  'apps/web/src/app/api/portal/session/route.ts',
  'packages/api/src/trpc.ts',
];
const failures = [];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file}: missing`);
}

if (!failures.length) {
  const session = fs.readFileSync(path.join(root, required[0]), 'utf8');
  const route = fs.readFileSync(path.join(root, required[1]), 'utf8');
  const trpc = fs.readFileSync(path.join(root, required[2]), 'utf8');

  if (!session.includes('__portal_session') && !session.includes('PORTAL_SESSION_COOKIE')) {
    failures.push(`${required[0]}: dedicated portal cookie marker missing`);
  }
  if (!route.includes('PORTAL_SESSION_COOKIE') || !route.includes('sessionToken')) {
    failures.push(`${required[1]}: portal cookie/session-token wiring missing`);
  }
  const publicProcedure = trpc.match(/export const portalPublicProcedure[\s\S]*?\n\}\);/)?.[0];
  if (!publicProcedure || !/auth:\s*null/.test(publicProcedure)) {
    failures.push(`${required[2]}: portalPublicProcedure does not clear staff auth`);
  }
}

if (failures.length) {
  console.error('Portal sessions audit: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Portal sessions audit: PASS');
