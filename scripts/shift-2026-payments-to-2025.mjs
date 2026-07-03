/**
 * One-off migration: shift invoice payment dates from 2026 to 2025.
 * Usage:
 *   node scripts/shift-2026-payments-to-2025.mjs          # dry run
 *   node scripts/shift-2026-payments-to-2025.mjs --apply   # write changes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const TARGET_YEAR = 2026;
const SHIFT_TO_YEAR = 2025;

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
    console.log('Using Application Default Credentials (Firebase CLI / gcloud login).');
    initializeApp({ credential: applicationDefault(), projectId });
  }
  return getFirestore();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isInYear(value, year) {
  const d = toDate(value);
  return d ? d.getFullYear() === year : false;
}

function shiftYear(value, deltaYears) {
  const d = toDate(value);
  if (!d) return null;
  const shifted = new Date(d);
  shifted.setFullYear(shifted.getFullYear() + deltaYears);
  return Timestamp.fromDate(shifted);
}

async function migrateOrg(db, orgId, stats) {
  const invoicesSnap = await db.collection(`organizations/${orgId}/invoices`).get();

  for (const invoiceDoc of invoicesSnap.docs) {
    const invoiceId = invoiceDoc.id;
    const invoiceData = invoiceDoc.data();
    const invoiceUpdates = {};

    if (isInYear(invoiceData.paidAt, TARGET_YEAR)) {
      invoiceUpdates.paidAt = shiftYear(invoiceData.paidAt, SHIFT_TO_YEAR - TARGET_YEAR);
      stats.invoices += 1;
    }

    const paymentsSnap = await db
      .collection(`organizations/${orgId}/invoices/${invoiceId}/payments`)
      .get();

    for (const paymentDoc of paymentsSnap.docs) {
      const payment = paymentDoc.data();
      const paymentUpdates = {};
      if (isInYear(payment.paidAt, TARGET_YEAR)) {
        paymentUpdates.paidAt = shiftYear(payment.paidAt, SHIFT_TO_YEAR - TARGET_YEAR);
      }
      if (isInYear(payment.createdAt, TARGET_YEAR)) {
        paymentUpdates.createdAt = shiftYear(payment.createdAt, SHIFT_TO_YEAR - TARGET_YEAR);
      }
      if (Object.keys(paymentUpdates).length) {
        stats.payments += 1;
        if (apply) {
          paymentUpdates.updatedAt = Timestamp.now();
          await paymentDoc.ref.update(paymentUpdates);
        }
      }
    }

    const activitySnap = await db
      .collection(`organizations/${orgId}/invoices/${invoiceId}/activity`)
      .get();

    for (const activityDoc of activitySnap.docs) {
      const activity = activityDoc.data();
      if (activity.type !== 'payment_received') continue;
      if (!isInYear(activity.occurredAt, TARGET_YEAR)) continue;
      stats.activity += 1;
      if (apply) {
        await activityDoc.ref.update({
          occurredAt: shiftYear(activity.occurredAt, SHIFT_TO_YEAR - TARGET_YEAR),
          updatedAt: Timestamp.now(),
        });
      }
    }

    if (Object.keys(invoiceUpdates).length) {
      if (apply) {
        invoiceUpdates.updatedAt = Timestamp.now();
        await invoiceDoc.ref.update(invoiceUpdates);
      }
    }
  }
}

async function main() {
  loadEnv();
  const db = initFirebase();
  const stats = { orgs: 0, payments: 0, invoices: 0, activity: 0 };

  const orgsSnap = await db.collection('organizations').select().get();
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: shifting ${TARGET_YEAR} payment dates to ${SHIFT_TO_YEAR}…`);
  console.log(`Organizations: ${orgsSnap.size}`);

  for (const orgDoc of orgsSnap.docs) {
    stats.orgs += 1;
    await migrateOrg(db, orgDoc.id, stats);
  }

  console.log('\nResults:');
  console.log(`  Payment records updated: ${stats.payments}`);
  console.log(`  Invoice paidAt updated:  ${stats.invoices}`);
  console.log(`  Activity records updated: ${stats.activity}`);
  if (!apply) {
    console.log('\nNo changes written. Re-run with --apply to persist.');
  } else {
    console.log('\nMigration complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
