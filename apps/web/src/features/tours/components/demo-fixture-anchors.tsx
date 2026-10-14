'use client';

import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useDemoMode } from '../context/demo-mode-context';
import { TourActiveSessionStore } from '../services/tour-active-session';

/** Hidden DOM anchors so the tour can resolve demo fixture IDs on any page. */
export function DemoFixtureAnchors() {
  const pathname = usePathname();
  const { isDemoTenant, isLoading } = useDemoMode();
  const tourActive = Boolean(TourActiveSessionStore.load());
  const enabled =
    pathname.startsWith('/app') && (tourActive || (!isLoading && isDemoTenant));

  const { data } = trpc.demo360.fixtures.useQuery(undefined, {
    enabled,
    staleTime: 60_000,
    retry: 8,
    retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 5_000),
    refetchOnWindowFocus: false,
  });

  if (!data) return null;

  return (
    <div hidden aria-hidden data-demo-fixture-anchors>
      {data.heroCustomerId ? <span data-demo-hero-customer-id={data.heroCustomerId} /> : null}
      {data.heroPropertyId ? <span data-demo-hero-property-id={data.heroPropertyId} /> : null}
      {data.heroProposalId ? <span data-demo-hero-proposal-id={data.heroProposalId} /> : null}
      {data.heroJobId ? <span data-demo-hero-job-id={data.heroJobId} /> : null}
    </div>
  );
}
