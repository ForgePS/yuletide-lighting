import {
  DEMO_HERO_CUSTOMER_REF,
  DEMO_HERO_INVOICE_REF,
  DEMO_HERO_JOB_REF,
  DEMO_HERO_PORTAL_ACCESS_TOKEN,
  DEMO_HERO_PROPERTY_REF,
  DEMO_HERO_PROPOSAL_REF,
  DEMO_HERO_SERVICE_ISSUE_REF,
  DEMO_SEED_MARKER,
  type CustomerStage,
} from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { createCustomer } from './firestore';
import { assertAuthorizedDemoTenant } from './demo-tenant';
import { createCustomerProperty360, updateCustomerPipelineStage } from './customer360';
import { createProposal360, sendProposal360 } from './proposals';
import { createOrgJob } from './record-paths';
import { createInvoice360 } from './invoices360';
import { createServiceIssue360 } from './service-issues';
import { invalidateDemoTenantCache } from './demo-fixtures';

const DEMO_RESET_COLLECTIONS = [
  'customers',
  'properties',
  'proposals',
  'invoices',
  'jobs',
  'multiYearAgreements',
  'signLocations',
  'portalAccounts',
  'portalUsers',
  'portalNotifications',
  'conversations',
  'reviewRequests',
  'serviceIssues',
] as const;

const PIPELINE_FIXTURES: Array<{ ref: string; firstName: string; lastName: string; stage: CustomerStage }> =
  [
    { ref: 'demo-lead-01', firstName: 'Avery', lastName: 'Nguyen', stage: 'new_lead' },
    { ref: 'demo-lead-02', firstName: 'Blake', lastName: 'Carter', stage: 'contacted' },
    { ref: 'demo-lead-03', firstName: 'Casey', lastName: 'Morgan', stage: 'qualified' },
    { ref: 'demo-lead-04', firstName: 'Dana', lastName: 'Brooks', stage: 'proposal_sent' },
    { ref: 'demo-lead-05', firstName: 'Elliot', lastName: 'Reed', stage: 'approved' },
    { ref: 'demo-lead-06', firstName: 'Finley', lastName: 'Hayes', stage: 'deposit_paid' },
    { ref: 'demo-lead-07', firstName: 'Gray', lastName: 'Porter', stage: 'scheduled' },
    { ref: 'demo-lead-08', firstName: 'Harper', lastName: 'Lane', stage: 'installed' },
    { ref: 'demo-lead-09', firstName: 'Jordan', lastName: 'Pike', stage: 'follow_up_required' },
    { ref: 'demo-lead-10', firstName: 'Kendall', lastName: 'Shaw', stage: 'removal_scheduled' },
    { ref: 'demo-lead-11', firstName: 'Logan', lastName: 'Price', stage: 'rebook_next_season' },
    { ref: 'demo-lead-12', firstName: 'Morgan', lastName: 'Vale', stage: 'lost' },
  ];

async function deleteCollectionBatch(db: ReturnType<typeof getAdminFirestore>, collectionPath: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collectionPath).limit(200).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

export async function clearDemoOperationalData(orgId: string): Promise<{ deletedCollections: Record<string, number> }> {
  await assertAuthorizedDemoTenant(orgId);
  const db = getAdminFirestore();
  const deletedCollections: Record<string, number> = {};
  for (const name of DEMO_RESET_COLLECTIONS) {
    deletedCollections[name] = await deleteCollectionBatch(db, `organizations/${orgId}/${name}`);
  }
  return { deletedCollections };
}

async function upsertDemoCustomer(
  orgId: string,
  externalRef: string,
  stage: CustomerStage,
  data: Parameters<typeof createCustomer>[1],
  actorId?: string | null,
) {
  const db = getAdminFirestore();
  const existing = await db
    .collection(`organizations/${orgId}/customers`)
    .where('demoSeedRef', '==', externalRef)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { id: existing.docs[0]!.id, reused: true as const };
  }
  const customer = await createCustomer(orgId, {
    ...data,
    demoSeedRef: externalRef,
    demoSeedMarker: DEMO_SEED_MARKER,
  } as Parameters<typeof createCustomer>[1]);
  await updateCustomerPipelineStage(orgId, customer.id, stage, actorId);
  return { id: customer.id, reused: false as const };
}

async function upsertDemoRecordBySeedRef(
  orgId: string,
  collection: string,
  seedRef: string,
  create: () => Promise<{ id: string }>,
): Promise<{ id: string; created: boolean }> {
  const db = getAdminFirestore();
  const existing = await db
    .collection(`organizations/${orgId}/${collection}`)
    .where('demoSeedRef', '==', seedRef)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { id: existing.docs[0]!.id, created: false };
  }
  const created = await create();
  await db.doc(`organizations/${orgId}/${collection}/${created.id}`).update({
    demoSeedRef: seedRef,
    demoSeedMarker: DEMO_SEED_MARKER,
  });
  return { id: created.id, created: true };
}

export async function seedYuletideDemoTenant(
  orgId: string,
  actorId?: string | null,
): Promise<{
  heroCustomerId: string;
  customersCreated: number;
  customersReused: number;
  proposalsCreated: number;
}> {
  await assertAuthorizedDemoTenant(orgId);

  let customersCreated = 0;
  let customersReused = 0;
  let proposalsCreated = 0;

  const hero = await upsertDemoCustomer(
    orgId,
    DEMO_HERO_CUSTOMER_REF,
    'proposal_sent',
    {
      firstName: 'John',
      lastName: 'Smith',
      businessName: null,
      customerType: 'residential',
      status: 'active',
      referralSource: 'Facebook',
      assignedSalespersonName: 'Demo Rep',
      email: 'john.smith@demo.yuletidelighting.test',
      secondaryEmail: null,
      phone: '(555) 010-0142',
      mobilePhone: '(555) 010-0142',
      preferredContactMethod: 'email',
      tags: ['hero', 'tour'],
      notes: 'Hero tour customer — fictional demo data only.',
      smsOptIn: true,
      emailOptIn: true,
      billingSameAsPhysical: true,
      mailingSameAsBilling: true,
      portalEnabled: true,
    },
    actorId,
  );
  if (hero.reused) customersReused += 1;
  else customersCreated += 1;

  const db = getAdminFirestore();
  const propertySnap = await db
    .collection(`organizations/${orgId}/properties`)
    .where('demoSeedRef', '==', DEMO_HERO_PROPERTY_REF)
    .limit(1)
    .get();

  let heroPropertyId: string | null = propertySnap.empty ? null : propertySnap.docs[0]!.id;

  if (propertySnap.empty) {
    const property = await createCustomerProperty360(
      orgId,
      hero.id,
      {
        propertyName: 'Main Residence',
        propertyType: 'residential',
        label: 'Primary',
        addressLine1: '142 Evergreen Drive',
        addressLine2: null,
        city: 'Maple Grove',
        state: 'MN',
        postalCode: '55311',
        country: 'US',
        latitude: null,
        longitude: null,
        gateCode: null,
        hoaInfo: null,
        accessInstructions: 'Demo property — fictional address.',
        installNotes: 'Roofline, gables, garland, wreaths, tree, and landscape lighting package.',
        powerSourceLocations: 'Front porch GFCI',
        ladderAccessPoints: 'Driveway',
        roofMeasurementNotes: null,
        treeCount: 2,
        shrubCount: 8,
        wreathLocations: 'Front door, garage',
        garlandLocations: 'Entry railing',
        siteHazards: [],
        siteHazardNotes: null,
        photos: {},
        demoSeedRef: DEMO_HERO_PROPERTY_REF,
        demoSeedMarker: DEMO_SEED_MARKER,
      } as Parameters<typeof createCustomerProperty360>[2],
      actorId,
    );
    heroPropertyId = property.id;
  }

  const proposalSnap = await db
    .collection(`organizations/${orgId}/proposals`)
    .where('demoSeedRef', '==', DEMO_HERO_PROPOSAL_REF)
    .limit(1)
    .get();

  let heroProposalId: string | null = proposalSnap.empty ? null : proposalSnap.docs[0]!.id;

  if (proposalSnap.empty && heroPropertyId) {
    const proposal = await createProposal360(
      orgId,
      {
        customerId: hero.id,
        propertyId: heroPropertyId,
        title: 'Holiday Lighting — John Smith',
        subtotalCents: 327_500,
        notes: 'Demo proposal for guided tour.',
        demoSeedRef: DEMO_HERO_PROPOSAL_REF,
        demoSeedMarker: DEMO_SEED_MARKER,
      } as unknown as Parameters<typeof createProposal360>[1],
      actorId,
    );
    if (proposal) {
      heroProposalId = proposal.id;
      proposalsCreated += 1;
    }
  }

  if (heroProposalId) {
    try {
      await sendProposal360(orgId, heroProposalId, actorId);
    } catch {
      /* already sent on re-seed */
    }
  }

  const { ensurePortalAccount } = await import('./portal360');
  await ensurePortalAccount(orgId, hero.id, {
    token: DEMO_HERO_PORTAL_ACCESS_TOKEN,
    portalEnabled: true,
    status: 'active',
  });

  const heroJob = await upsertDemoRecordBySeedRef(orgId, 'jobs', DEMO_HERO_JOB_REF, async () => {
    const job = await createOrgJob(orgId, {
      customerId: hero.id,
      propertyId: heroPropertyId,
      proposalId: heroProposalId,
      title: 'Holiday Lighting — John Smith',
      stage: 'scheduled',
      subtotalCents: 327_500,
      installNotes: 'Demo install — roofline, gables, and landscape accents.',
    });
    return { id: job.id };
  });

  await upsertDemoRecordBySeedRef(orgId, 'invoices', DEMO_HERO_INVOICE_REF, async () => {
    const invoice = await createInvoice360(
      orgId,
      {
        customerId: hero.id,
        proposalId: heroProposalId ?? undefined,
        subtotalCents: 327_500,
        depositPercent: 50,
        notes: 'Demo deposit invoice for guided tour.',
      },
      actorId,
    );
    return { id: String(invoice.id) };
  });

  await upsertDemoRecordBySeedRef(orgId, 'serviceIssues', DEMO_HERO_SERVICE_ISSUE_REF, async () => {
    const issue = await createServiceIssue360(
      orgId,
      {
        customerId: hero.id,
        customerName: 'John Smith',
        propertyId: heroPropertyId ?? undefined,
        propertyLabel: '142 Evergreen Drive',
        jobId: heroJob.id,
        jobTitle: 'Holiday Lighting — John Smith',
        title: 'Section out after wind storm',
        description: 'Demo service callback — north roofline strand needs replacement.',
        category: 'weather_related',
        priority: 'normal',
        status: 'reported',
        warranty: true,
        photoUrls: [],
        source: 'manual',
      },
      actorId,
    );
    return { id: issue.id };
  });

  for (const fixture of PIPELINE_FIXTURES) {
    const result = await upsertDemoCustomer(
      orgId,
      fixture.ref,
      fixture.stage,
      {
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        businessName: null,
        customerType: 'residential',
        status: 'active',
        referralSource: 'Website',
        email: `${fixture.ref}@demo.yuletidelighting.test`,
        secondaryEmail: null,
        phone: '(555) 010-1000',
        mobilePhone: null,
        preferredContactMethod: 'email',
        tags: ['demo'],
        notes: 'Synthetic demo pipeline customer.',
        smsOptIn: false,
        emailOptIn: true,
        billingSameAsPhysical: true,
        mailingSameAsBilling: true,
        portalEnabled: false,
      },
      actorId,
    );
    if (result.reused) customersReused += 1;
    else customersCreated += 1;
  }

  return {
    heroCustomerId: hero.id,
    customersCreated,
    customersReused,
    proposalsCreated,
  };
}

/**
 * Restores the canonical demo snapshot.
 * Shared demo org: reset affects all concurrent demo viewers (documented YT-TOUR-S2 choice).
 */
export async function resetYuletideDemoTenant(orgId: string, actorId?: string | null) {
  await assertAuthorizedDemoTenant(orgId);
  invalidateDemoTenantCache(orgId);
  const cleared = await clearDemoOperationalData(orgId);
  const seeded = await seedYuletideDemoTenant(orgId, actorId);
  return { cleared, seeded };
}
