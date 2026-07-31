/**
 * Idempotent staging verification data seed.
 * Default: dry-run. Requires:
 *   --apply --project=yuletide-lighting-staging
 * Rejects production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  STAGING_PROJECT_ID,
  STAGING_ENVIRONMENT_MARKER,
  STAGING_VERIFICATION_SLUG,
  assertStagingProject,
  requireApplyFlag,
} = require('./lib/staging-guard.mjs');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(repoRoot, 'secrets', 'staging-verification-state.json');

function loadEnv() {
  for (const name of ['.env.staging', '.env']) {
    const envPath = path.join(repoRoot, name);
    if (!fs.existsSync(envPath)) continue;
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
}

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      values[arg.slice(2, eq)] = arg.slice(eq + 1);
      flags.add(arg.slice(2, eq));
    } else {
      flags.add(arg.slice(2));
    }
  }
  return { flags, values };
}

type Marker = {
  organizationId: string;
  stagingTest: true;
  environmentMarker: string;
  externalRef: string;
  createdBy: string;
  updatedBy: string;
};

function marker(orgId: string, ref: string): Marker {
  return {
    organizationId: orgId,
    stagingTest: true,
    environmentMarker: STAGING_ENVIRONMENT_MARKER,
    externalRef: ref,
    createdBy: 'p0.2c-seed-script',
    updatedBy: 'p0.2c-seed-script',
  };
}

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const projectId = values.project || STAGING_PROJECT_ID;
  assertStagingProject(projectId);
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  delete process.env.FIRESTORE_EMULATOR_HOST;

  if (!fs.existsSync(STATE_PATH)) {
    throw new Error(
      `Missing ${STATE_PATH}. Run scripts/provision-staging-verification.ts --apply first.`,
    );
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as {
    organizationId: string;
    users?: Record<string, { uid: string }>;
  };
  const orgId = state.organizationId;
  const actorId = state.users?.owner?.uid ?? 'p0.2c-seed-script';

  const report = {
    projectId,
    organizationId: orgId,
    mode: flags.has('apply') ? 'apply' : 'dry-run',
    created: [] as string[],
    reused: [] as string[],
  };

  console.log(JSON.stringify({ ...report, planned: true }, null, 2));
  if (!requireApplyFlag(flags, 'seed staging verification data')) {
    process.exit(0);
  }

  const { getAdminFirestore } = await import('../packages/firebase/src/admin.ts');
  const { createCustomer } = await import('../packages/firebase/src/firestore.ts');
  const { createOrgProperty, createOrgJob } =
    await import('../packages/firebase/src/record-paths.ts');
  const { createProposal360 } = await import('../packages/firebase/src/proposals.ts');
  const { createInvoice360 } = await import('../packages/firebase/src/invoices360.ts');
  const { createMultiYearAgreement360 } = await import('../packages/firebase/src/agreements.ts');
  const { createSignLocation } = await import('../packages/firebase/src/signTracker360.ts');
  const { ensurePortalAccount, createPortalNotification } =
    await import('../packages/firebase/src/portal360.ts');
  const db = getAdminFirestore();

  async function upsertByExternalRef(
    collectionPath: string,
    externalRef: string,
    write: () => Promise<{ id: string }>,
  ) {
    const snap = await db
      .collection(collectionPath)
      .where('externalRef', '==', externalRef)
      .limit(1)
      .get();
    if (!snap.empty) {
      report.reused.push(externalRef);
      return { id: snap.docs[0]!.id, reused: true as const };
    }
    const created = await write();
    report.created.push(externalRef);
    return { id: created.id, reused: false as const };
  }

  // Customers
  const residential = await upsertByExternalRef(
    `organizations/${orgId}/customers`,
    'p02c-customer-residential',
    async () => {
      const c = await createCustomer(orgId, {
        firstName: 'Riley',
        lastName: 'Residential',
        customerType: 'residential',
        email: 'customer-residential+staging@yuletide-staging.test',
        phone: '+15555550101',
        tags: ['staging_test'],
        smsOptIn: false,
        emailOptIn: false,
        billingSameAsPhysical: true,
        ...marker(orgId, 'p02c-customer-residential'),
      } as Parameters<typeof createCustomer>[1]);
      await db
        .doc(`organizations/${orgId}/customers/${c.id}`)
        .set(marker(orgId, 'p02c-customer-residential'), {
          merge: true,
        });
      return c;
    },
  );

  const commercial = await upsertByExternalRef(
    `organizations/${orgId}/customers`,
    'p02c-customer-commercial',
    async () => {
      const c = await createCustomer(orgId, {
        firstName: 'Casey',
        lastName: 'Commercial',
        businessName: 'Staging Commercial Lights LLC',
        customerType: 'commercial',
        email: 'customer-commercial+staging@yuletide-staging.test',
        phone: '+15555550102',
        tags: ['staging_test'],
        smsOptIn: false,
        emailOptIn: false,
        billingSameAsPhysical: true,
        ...marker(orgId, 'p02c-customer-commercial'),
      } as Parameters<typeof createCustomer>[1]);
      await db
        .doc(`organizations/${orgId}/customers/${c.id}`)
        .set(marker(orgId, 'p02c-customer-commercial'), {
          merge: true,
        });
      return c;
    },
  );

  // Contacts (subcollection)
  for (const [ref, customerId, name] of [
    ['p02c-contact-1', residential.id, 'Primary Contact'],
    ['p02c-contact-2', residential.id, 'Secondary Contact'],
    ['p02c-contact-3', commercial.id, 'Facilities Manager'],
  ] as const) {
    await upsertByExternalRef(
      `organizations/${orgId}/customers/${customerId}/contacts`,
      ref,
      async () => {
        const doc = db.collection(`organizations/${orgId}/customers/${customerId}/contacts`).doc();
        const now = new Date();
        await doc.set({
          name,
          email: `${ref}@yuletide-staging.test`,
          phone: '+15555550999',
          ...marker(orgId, ref),
          createdAt: now,
          updatedAt: now,
        });
        return { id: doc.id };
      },
    );
  }

  // Properties
  const propHome = await upsertByExternalRef(
    `organizations/${orgId}/properties`,
    'p02c-property-home',
    async () => {
      const p = await createOrgProperty(orgId, {
        customerId: residential.id,
        label: 'Home',
        addressLine1: '100 Staging Lane',
        city: 'Stagingville',
        state: 'OH',
        postalCode: '43001',
        country: 'US',
        ...marker(orgId, 'p02c-property-home'),
      } as Parameters<typeof createOrgProperty>[1]);
      await db
        .doc(`organizations/${orgId}/properties/${p.id}`)
        .set(marker(orgId, 'p02c-property-home'), {
          merge: true,
        });
      return p;
    },
  );

  const propBiz = await upsertByExternalRef(
    `organizations/${orgId}/properties`,
    'p02c-property-biz',
    async () => {
      const p = await createOrgProperty(orgId, {
        customerId: commercial.id,
        label: 'Storefront',
        addressLine1: '200 Commerce Ave',
        city: 'Columbus',
        state: 'OH',
        postalCode: '43215',
        country: 'US',
        ...marker(orgId, 'p02c-property-biz'),
      } as Parameters<typeof createOrgProperty>[1]);
      await db
        .doc(`organizations/${orgId}/properties/${p.id}`)
        .set(marker(orgId, 'p02c-property-biz'), {
          merge: true,
        });
      return p;
    },
  );

  // Proposals
  async function ensureProposal(
    ref: string,
    customerId: string,
    propertyId: string,
    title: string,
    status: string,
  ) {
    return upsertByExternalRef(`organizations/${orgId}/proposals`, ref, async () => {
      const p = await createProposal360(
        orgId,
        {
          customerId,
          propertyId,
          title,
          subtotalCents: 250000,
        },
        actorId,
      );
      await db.doc(`organizations/${orgId}/proposals/${p.id}`).set(
        {
          status,
          ...marker(orgId, ref),
        },
        { merge: true },
      );
      return p;
    });
  }

  const draftProposal = await ensureProposal(
    'p02c-proposal-draft',
    residential.id,
    propHome.id,
    'Staging Draft Proposal',
    'draft',
  );
  const sentProposal = await ensureProposal(
    'p02c-proposal-sent',
    residential.id,
    propHome.id,
    'Staging Sent Proposal',
    'sent',
  );
  const approvedProposal = await ensureProposal(
    'p02c-proposal-approved',
    commercial.id,
    propBiz.id,
    'Staging Approved Proposal',
    'approved',
  );

  // Agreement
  await upsertByExternalRef(
    `organizations/${orgId}/multiYearAgreements`,
    'p02c-agreement',
    async () => {
      const a = await createMultiYearAgreement360(
        orgId,
        {
          title: 'Staging Multi-Year Agreement',
          startSeason: 2026,
          endSeason: 2028,
          customerId: commercial.id,
          customerName: 'Casey Commercial',
          propertyId: propBiz.id,
          annualValueCents: 500000,
        } as Parameters<typeof createMultiYearAgreement360>[1],
        actorId,
      );
      await db
        .doc(`organizations/${orgId}/multiYearAgreements/${a.id}`)
        .set(marker(orgId, 'p02c-agreement'), { merge: true });
      return a;
    },
  );

  // Invoice
  await upsertByExternalRef(`organizations/${orgId}/invoices`, 'p02c-invoice', async () => {
    const inv = await createInvoice360(
      orgId,
      {
        customerId: commercial.id,
        proposalId: approvedProposal.id,
        subtotalCents: 250000,
      },
      actorId,
    );
    await db.doc(`organizations/${orgId}/invoices/${inv.id}`).set(marker(orgId, 'p02c-invoice'), {
      merge: true,
    });
    return inv;
  });

  // Jobs
  for (const [ref, stage, title] of [
    ['p02c-job-draft', 'pending', 'Staging Draft Job'],
    ['p02c-job-scheduled', 'scheduled', 'Staging Scheduled Job'],
    ['p02c-job-completed', 'completed', 'Staging Completed Job'],
  ] as const) {
    await upsertByExternalRef(`organizations/${orgId}/jobs`, ref, async () => {
      const job = await createOrgJob(orgId, {
        customerId: residential.id,
        propertyId: propHome.id,
        title,
        stage,
        scheduledStart: stage === 'pending' ? null : new Date(),
        assignedCrewUserId: state.users?.operations?.uid ?? null,
      });
      await db
        .doc(`organizations/${orgId}/jobs/${job.id}`)
        .set(marker(orgId, ref), { merge: true });
      return job;
    });
  }

  // Sign Tracker
  const seasonYear = new Date().getFullYear();
  const signSpecs = [
    {
      ref: 'p02c-sign-active',
      status: 'active',
      campaign: 'Holiday 2026',
      city: 'Stagingville',
      quantityPlaced: 2,
    },
    {
      ref: 'p02c-sign-needs-pickup',
      status: 'needs_pickup',
      campaign: 'Holiday 2026',
      city: 'Columbus',
      quantityPlaced: 1,
    },
    {
      ref: 'p02c-sign-picked-up',
      status: 'picked_up',
      campaign: 'Early Bird',
      city: 'Dublin',
      quantityPlaced: 3,
    },
    {
      ref: 'p02c-sign-partial',
      status: 'partially_recovered',
      campaign: 'Early Bird',
      city: 'Columbus',
      quantityPlaced: 4,
    },
    {
      ref: 'p02c-sign-missing',
      status: 'missing',
      campaign: 'Territory North',
      city: 'Westerville',
      quantityPlaced: 1,
    },
  ] as const;

  for (const spec of signSpecs) {
    await upsertByExternalRef(`organizations/${orgId}/signLocations`, spec.ref, async () => {
      const sign = await createSignLocation(
        orgId,
        {
          seasonYear,
          quantityPlaced: spec.quantityPlaced,
          placementType: 'customer_yard',
          notes: `staging ${spec.ref}`,
          location: {
            latitude: 40.0,
            longitude: -83.0,
            address: `${spec.ref} Rd`,
            city: spec.city,
            state: 'OH',
            zip: '43001',
          },
        },
        actorId,
        'Staging Owner',
      );
      await db.doc(`organizations/${orgId}/signLocations/${sign.id}`).set(
        {
          status: spec.status,
          campaign: spec.campaign,
          territory: spec.city,
          ...marker(orgId, spec.ref),
        },
        { merge: true },
      );
      return sign;
    });
  }

  // Portal
  const portal = await ensurePortalAccount(orgId, residential.id, {
    status: 'active',
    portalEnabled: true,
  });
  await db.doc(`organizations/${orgId}/portalAccounts/${portal.account.id}`).set(
    {
      ...marker(orgId, 'p02c-portal-account'),
      outboundDeliveryDisabled: true,
    },
    { merge: true },
  );
  report.created.push('p02c-portal-account');

  try {
    await createPortalNotification(orgId, {
      portalUserId: portal.user.id,
      customerId: residential.id,
      category: 'system',
      title: 'Staging portal notification',
      body: 'Verification only — no customer delivery',
    });
    report.created.push('p02c-portal-notification');
  } catch (err) {
    console.warn('Portal notification seed skipped:', err instanceof Error ? err.message : err);
  }

  // Configuration overrides
  await db.doc(`organizations/${orgId}/settings/tenantOverride`).set({
    ...marker(orgId, 'p02c-config-tenant'),
    key: 'proposal.defaultDepositPercent',
    value: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.doc(`organizations/${orgId}/settings/locationOverride`).set({
    ...marker(orgId, 'p02c-config-location'),
    locationId: propHome.id,
    key: 'jobs.defaultCrewSize',
    value: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (state.users?.owner?.uid) {
    await db.doc(`users/${state.users.owner.uid}`).set(
      {
        preferences: { theme: 'system', stagingTest: true },
        ...marker(orgId, 'p02c-user-preference'),
      },
      { merge: true },
    );
  }
  await db.doc(`organizations/${orgId}/featureFlags/follow_up_automation`).set(
    {
      key: 'follow_up_automation',
      enabled: false,
      ...marker(orgId, 'p02c-disabled-feature'),
      updatedAt: new Date(),
    },
    { merge: true },
  );

  // Disable outbound delivery integrations for safety
  await db.doc(`organizations/${orgId}/settings/integrations`).set(
    {
      outboundDeliveryDisabled: true,
      smsTestMode: true,
      emailTestMode: true,
      ...marker(orgId, 'p02c-integrations-test-mode'),
      updatedAt: new Date(),
    },
    { merge: true },
  );

  const reconciliation = {
    ...report,
    counts: {
      created: report.created.length,
      reused: report.reused.length,
    },
    proposalIds: {
      draft: draftProposal.id,
      sent: sentProposal.id,
      approved: approvedProposal.id,
    },
    portalTokenPresent: Boolean(portal.token),
    slug: STAGING_VERIFICATION_SLUG,
  };
  const reportPath = path.join(
    repoRoot,
    'docs/production-cleanup/.audit-private/staging-seed-reconciliation.json',
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(reconciliation, null, 2));
  console.log(JSON.stringify(reconciliation, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
