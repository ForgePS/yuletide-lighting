/**
 * Diagnose CMS public read path.
 * Usage: npx tsx scripts/check-cms-pages.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function main() {
  loadEnv();
  if (!getApps().length) {
    const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'yuletide-lighting';
    if (key) initializeApp({ credential: cert(JSON.parse(key)), projectId });
    else initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();
  const website = db.collection('platform').doc('website');
  const globals = (await website.collection('globals').doc('site').get()).data();
  const homeSnap = await website.collection('pages').where('slug', '==', 'home').limit(1).get();
  const home = homeSnap.empty ? null : homeSnap.docs[0]!.data();
  console.log(
    JSON.stringify(
      {
        globalsLogo: globals?.header?.logoUrl,
        brandingLogo: globals?.branding?.primaryLogoUrl,
        primaryColor: globals?.branding?.primaryColor,
        homeId: homeSnap.empty ? null : homeSnap.docs[0]!.id,
        homeStatus: home?.status,
        homeSlug: home?.slug,
        homeBlockCount: Array.isArray(home?.blocks) ? home.blocks.length : 0,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
