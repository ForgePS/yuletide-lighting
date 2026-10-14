import type { DemoTourFixtures } from '@clcrm/types';

export type ResolvedTourStep = {
  route?: string;
  skip: boolean;
};

const FIXTURE_KEYS = [
  'heroCustomerId',
  'heroPropertyId',
  'heroProposalId',
  'heroJobId',
  'heroInvoiceId',
  'heroServiceIssueId',
  'heroPortalAccessToken',
] as const;

export function resolveTourStepRoute(
  route: string | undefined,
  fixtures: DemoTourFixtures | null | undefined,
  optional?: boolean,
): ResolvedTourStep {
  if (!route) return { route: undefined, skip: false };
  if (!route.includes('{')) return { route, skip: false };

  if (!fixtures) {
    return { route: undefined, skip: optional ?? false };
  }

  let resolved = route;
  for (const key of FIXTURE_KEYS) {
    const token = `{${key}}`;
    if (!resolved.includes(token)) continue;
    const value = fixtures[key as keyof DemoTourFixtures];
    if (!value) {
      if (optional) return { route: undefined, skip: true };
      return { route: undefined, skip: false };
    }
    resolved = resolved.replaceAll(token, value);
  }

  if (/\{[^}]+\}/.test(resolved)) {
    return { route: undefined, skip: optional ?? false };
  }

  return { route: resolved, skip: false };
}
