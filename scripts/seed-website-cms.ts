/**
 * Seed default CMS home/pricing pages + site globals into Firestore.
 * Usage: npx tsx scripts/seed-website-cms.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  buildDefaultHomePage,
  buildDefaultPricingPage,
  buildDefaultSiteGlobals,
} from '../packages/types/src/website-cms-defaults';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function initFirebase() {
  if (getApps().length) return getFirestore();
  const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'yuletide-lighting';
  if (key) {
    initializeApp({ credential: cert(JSON.parse(key)), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  return getFirestore();
}

async function main() {
  loadEnv();
  const db = initFirebase();
  const website = db.collection('platform').doc('website');
  const pages = website.collection('pages');
  const globalsRef = website.collection('globals').doc('site');
  const now = Timestamp.now();
  const force = process.argv.includes('--force');

  const defaults = buildDefaultSiteGlobals();
  const globalsSnap = await globalsRef.get();
  if (!globalsSnap.exists) {
    await globalsRef.set({ ...defaults, updatedAt: now });
    console.log('Seeded site globals');
  } else if (force) {
    await globalsRef.set({ ...defaults, updatedAt: now }, { merge: true });
    console.log('Updated site globals (--force)');
  } else {
    console.log('Site globals already present (pass --force to refresh branding)');
  }

  for (const [id, page] of [
    ['page_home', buildDefaultHomePage()] as const,
    ['page_pricing', buildDefaultPricingPage()] as const,
  ]) {
    const ref = pages.doc(id);
    const snap = await ref.get();
    if (snap.exists && !force) {
      console.log(`Page ${id} already present (slug=${page.slug})`);
      continue;
    }
    await ref.set({
      ...page,
      createdAt: snap.exists ? snap.data()?.createdAt ?? now : now,
      updatedAt: now,
      publishedAt: now,
    });
    console.log(`${snap.exists ? 'Updated' : 'Seeded'} page ${id} (slug=${page.slug}, status=${page.status})`);
  }

  console.log('CMS seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
