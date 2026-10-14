import {

  DEMO_HERO_CUSTOMER_REF,

  DEMO_HERO_INVOICE_REF,

  DEMO_HERO_JOB_REF,

  DEMO_HERO_PORTAL_ACCESS_TOKEN,

  DEMO_HERO_PROPERTY_REF,

  DEMO_HERO_PROPOSAL_REF,

  DEMO_HERO_SERVICE_ISSUE_REF,

  type DemoTourFixtures,

} from '@clcrm/types';

import { getAdminFirestore } from './admin';

import { assertAuthorizedDemoTenant } from './demo-tenant';



const FIXTURES_CACHE_MS = 60_000;



const seededOrgIds = new Set<string>();

const seedingByOrg = new Map<string, Promise<void>>();

const fixturesCache = new Map<string, { value: DemoTourFixtures; at: number }>();



async function findIdByDemoSeedRef(orgId: string, collection: string, seedRef: string): Promise<string | null> {

  const db = getAdminFirestore();

  const snap = await db

    .collection(`organizations/${orgId}/${collection}`)

    .where('demoSeedRef', '==', seedRef)

    .limit(1)

    .get();

  return snap.empty ? null : snap.docs[0]!.id;

}



export function invalidateDemoTenantCache(orgId: string): void {

  seededOrgIds.delete(orgId);

  seedingByOrg.delete(orgId);

  fixturesCache.delete(orgId);

}



/** Fire-and-forget seed — never blocks demo entry or page load. */

export function kickoffDemoTenantSeed(orgId: string, actorId?: string | null): void {

  if (seededOrgIds.has(orgId) || seedingByOrg.has(orgId)) return;

  void ensureDemoTenantSeeded(orgId, actorId).catch(() => {

    /* retries on next fixtures/context request */

  });

}



/** Idempotent — seeds demo customers/pipeline when the hero record is missing. */

export async function ensureDemoTenantSeeded(orgId: string, actorId?: string | null): Promise<void> {

  if (seededOrgIds.has(orgId)) return;



  const inFlight = seedingByOrg.get(orgId);

  if (inFlight) {

    await inFlight;

    return;

  }



  const run = (async () => {

    await assertAuthorizedDemoTenant(orgId);

    const heroCustomerId = await findIdByDemoSeedRef(orgId, 'customers', DEMO_HERO_CUSTOMER_REF);

    if (heroCustomerId) {

      seededOrgIds.add(orgId);

      return;

    }

    const { seedYuletideDemoTenant } = await import('./demo-seed');

    await seedYuletideDemoTenant(orgId, actorId);

    seededOrgIds.add(orgId);

    fixturesCache.delete(orgId);

  })();



  seedingByOrg.set(orgId, run);

  try {

    await run;

  } finally {

    seedingByOrg.delete(orgId);

  }

}



async function loadDemoTourFixtures(orgId: string): Promise<DemoTourFixtures> {

  const heroCustomerId = await findIdByDemoSeedRef(orgId, 'customers', DEMO_HERO_CUSTOMER_REF);

  if (!heroCustomerId) {

    throw new Error('Demo hero customer is not seeded — run seed:yuletide-demo');

  }



  const [

    heroPropertyId,

    heroProposalId,

    heroJobId,

    heroInvoiceId,

    heroServiceIssueId,

  ] = await Promise.all([

    findIdByDemoSeedRef(orgId, 'properties', DEMO_HERO_PROPERTY_REF),

    findIdByDemoSeedRef(orgId, 'proposals', DEMO_HERO_PROPOSAL_REF),

    findIdByDemoSeedRef(orgId, 'jobs', DEMO_HERO_JOB_REF),

    findIdByDemoSeedRef(orgId, 'invoices', DEMO_HERO_INVOICE_REF),

    findIdByDemoSeedRef(orgId, 'serviceIssues', DEMO_HERO_SERVICE_ISSUE_REF),

  ]);



  return {

    heroCustomerId,

    heroPropertyId,

    heroProposalId,

    heroJobId,

    heroInvoiceId,

    heroServiceIssueId,

    heroPortalAccessToken: DEMO_HERO_PORTAL_ACCESS_TOKEN,

  };

}



export async function getDemoTourFixtures(orgId: string): Promise<DemoTourFixtures> {

  await assertAuthorizedDemoTenant(orgId);



  const cached = fixturesCache.get(orgId);

  if (cached && Date.now() - cached.at < FIXTURES_CACHE_MS) {

    return cached.value;

  }



  if (!seededOrgIds.has(orgId)) {
    const heroCustomerId = await findIdByDemoSeedRef(orgId, 'customers', DEMO_HERO_CUSTOMER_REF);
    if (heroCustomerId) {
      seededOrgIds.add(orgId);
    } else {
      kickoffDemoTenantSeed(orgId, null);
      throw new Error('Demo seed in progress — retry shortly');
    }
  }



  const fixtures = await loadDemoTourFixtures(orgId);

  fixturesCache.set(orgId, { value: fixtures, at: Date.now() });

  return fixtures;

}


