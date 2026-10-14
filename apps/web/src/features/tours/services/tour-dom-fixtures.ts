import type { DemoTourFixtures } from '@clcrm/types';

import { DEMO_HERO_PORTAL_ACCESS_TOKEN } from '@clcrm/types';



const RESERVED_PROPOSAL_SEGMENTS = new Set([

  'new',

  'templates',

  'packages',

  'analytics',

  'edit',

]);



function readIdFromHref(href: string, segment: string): string | null {

  try {

    const path = href.startsWith('http') ? new URL(href).pathname : href;

    const match = path.match(new RegExp(`/${segment}/([^/?#]+)`));

    return match?.[1] ?? null;

  } catch {

    return null;

  }

}



function readProposalIdFromLink(link: HTMLAnchorElement): string | null {

  const href = link.getAttribute('href') ?? link.pathname;

  const proposalId = readIdFromHref(href, 'proposals');

  if (!proposalId || RESERVED_PROPOSAL_SEGMENTS.has(proposalId)) return null;

  return proposalId;

}



function readHiddenFixtureId(attr: string): string | null {

  const value = document.querySelector(`[data-demo-${attr}]`)?.getAttribute(`data-demo-${attr}`);

  return value?.trim() || null;

}



/** Best-effort fixture IDs from rendered demo UI when the API fixtures query is still loading. */

export function readDemoFixturesFromDom(): Partial<DemoTourFixtures> | null {

  if (typeof document === 'undefined') return null;



  const partial: Partial<DemoTourFixtures> = {};



  const hiddenCustomerId = readHiddenFixtureId('hero-customer-id');

  if (hiddenCustomerId) partial.heroCustomerId = hiddenCustomerId;



  const hiddenProposalId = readHiddenFixtureId('hero-proposal-id');

  if (hiddenProposalId) partial.heroProposalId = hiddenProposalId;



  const hiddenPropertyId = readHiddenFixtureId('hero-property-id');

  if (hiddenPropertyId) partial.heroPropertyId = hiddenPropertyId;



  const hiddenJobId = readHiddenFixtureId('hero-job-id');

  if (hiddenJobId) partial.heroJobId = hiddenJobId;



  const heroLink = document.querySelector(

    '[data-tour="pipeline-hero-customer"] a[href*="/app/customers/"]',

  );

  if (heroLink instanceof HTMLAnchorElement) {

    const heroCustomerId = readIdFromHref(heroLink.getAttribute('href') ?? heroLink.pathname, 'customers');

    if (heroCustomerId) partial.heroCustomerId = heroCustomerId;

  }



  const propertyLink = document.querySelector('a[href*="/property/"]');

  if (propertyLink instanceof HTMLAnchorElement) {

    const heroPropertyId = readIdFromHref(propertyLink.getAttribute('href') ?? propertyLink.pathname, 'property');

    if (heroPropertyId) partial.heroPropertyId = heroPropertyId;

  }



  const markedProposal = document.querySelector('a[data-demo-hero-proposal="true"]');

  if (markedProposal instanceof HTMLAnchorElement) {

    const heroProposalId = readProposalIdFromLink(markedProposal);

    if (heroProposalId) partial.heroProposalId = heroProposalId;

  }



  if (!partial.heroProposalId) {

    const proposalLinks = [...document.querySelectorAll('a[href*="/app/proposals/"]')];

    for (const link of proposalLinks) {

      if (!(link instanceof HTMLAnchorElement)) continue;

      const heroProposalId = readProposalIdFromLink(link);

      if (!heroProposalId) continue;

      partial.heroProposalId = heroProposalId;

      const label = `${link.textContent ?? ''} ${link.closest('tr')?.textContent ?? ''}`;

      if (/john\s*smith/i.test(label)) break;

    }

  }



  const heroJobCard = document.querySelector('[data-tour="jobs-hero-card"] a[href*="/app/jobs/"]');

  if (heroJobCard instanceof HTMLAnchorElement) {

    const heroJobId = readIdFromHref(heroJobCard.getAttribute('href') ?? heroJobCard.pathname, 'jobs');

    if (heroJobId) partial.heroJobId = heroJobId;

  }



  if (Object.keys(partial).length === 0) return null;



  return {

    heroPortalAccessToken: DEMO_HERO_PORTAL_ACCESS_TOKEN,

    ...partial,

  };

}



export async function waitForDomFixtureValue(

  key: keyof DemoTourFixtures,

  options: { timeoutMs?: number; signal?: AbortSignal } = {},

): Promise<string | null> {

  const timeoutMs = options.timeoutMs ?? 4_000;

  const started = Date.now();



  while (Date.now() - started < timeoutMs) {

    if (options.signal?.aborted) return null;

    const fixtures = readDemoFixturesFromDom();

    const value = fixtures?.[key];

    if (typeof value === 'string' && value.trim()) return value;

    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));

  }



  const fixtures = readDemoFixturesFromDom();

  const value = fixtures?.[key];

  return typeof value === 'string' && value.trim() ? value : null;

}



export async function waitForDemoFixturesFromDom(

  options: { timeoutMs?: number; signal?: AbortSignal; keys?: Array<keyof DemoTourFixtures> } = {},

): Promise<Partial<DemoTourFixtures> | null> {

  const timeoutMs = options.timeoutMs ?? 4_000;

  const keys = options.keys;

  const started = Date.now();



  while (Date.now() - started < timeoutMs) {

    if (options.signal?.aborted) return null;

    const fixtures = readDemoFixturesFromDom();

    if (fixtures) {

      if (!keys?.length || keys.every((key) => Boolean(fixtures[key]))) {

        return fixtures;

      }

    }

    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));

  }



  return readDemoFixturesFromDom();

}



export function mergeDemoFixtures(

  api: DemoTourFixtures | null | undefined,

  dom: Partial<DemoTourFixtures> | null,

): DemoTourFixtures | null {

  if (!api && !dom) return null;

  return {

    heroCustomerId: api?.heroCustomerId ?? dom?.heroCustomerId ?? '',

    heroPropertyId: api?.heroPropertyId ?? dom?.heroPropertyId ?? null,

    heroProposalId: api?.heroProposalId ?? dom?.heroProposalId ?? null,

    heroJobId: api?.heroJobId ?? dom?.heroJobId ?? null,

    heroInvoiceId: api?.heroInvoiceId ?? dom?.heroInvoiceId ?? null,

    heroServiceIssueId: api?.heroServiceIssueId ?? dom?.heroServiceIssueId ?? null,

    heroPortalAccessToken:

      api?.heroPortalAccessToken ?? dom?.heroPortalAccessToken ?? DEMO_HERO_PORTAL_ACCESS_TOKEN,

  };

}


