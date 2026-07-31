/**
 * Seed emulator organizations for module migration dry-run validation.
 * Intended for FIRESTORE_EMULATOR_HOST only.
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
const projectId = process.env.GCLOUD_PROJECT || 'yuletide-rules-test';
if (!getApps().length) initializeApp({ projectId });
const db = getFirestore();
const now = Timestamp.now();

const fixtures = [
  {
    id: 'org_missing_modules',
    companyName: 'Fixture Missing Modules',
    subscriptionStatus: 'trialing',
    // no enabledModules
  },
  {
    id: 'org_empty_modules',
    companyName: 'Fixture Empty Modules',
    subscriptionStatus: 'active',
    subscriptionPlan: 'monthly',
    enabledModules: [],
  },
  {
    id: 'org_with_modules',
    companyName: 'Fixture Already Configured',
    subscriptionStatus: 'active',
    subscriptionTier: 'standard',
    configurationSchemaVersion: 1,
    enabledModules: [
      'customers',
      'jobs',
      'proposals',
      'invoices',
      'schedule',
      'messages',
      'pipeline',
      'customer_portal',
    ],
  },
  {
    id: 'org_disabled_preserved',
    companyName: 'Fixture Disabled Sign Tracker',
    subscriptionStatus: 'active',
    subscriptionTier: 'standard',
    enabledModules: [],
    disabledModules: ['sign_tracker', 'commercial'],
  },
  {
    id: 'org_unknown_plan',
    companyName: 'Fixture Unknown Tier',
    subscriptionStatus: 'active',
    subscriptionTier: 'gold',
    enabledModules: [],
  },
];

async function main() {
  for (const fixture of fixtures) {
    const { id, ...data } = fixture;
    await db
      .collection('organizations')
      .doc(id)
      .set({ ...data, createdAt: now, updatedAt: now });
    console.log(`Seeded ${id}`);
  }
  console.log(`Seeded ${fixtures.length} fixture organizations into ${projectId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
