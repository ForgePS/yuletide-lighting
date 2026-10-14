'use client';

import 'driver.js/dist/driver.css';

import { TourContext } from '../context/tour-context';
import { DemoModeProvider, useDemoMode } from '../context/demo-mode-context';
import { HelpToursProvider } from '../context/help-tours-context';
import { TourProgressProvider, useTourProgress } from '../context/tour-progress-context';
import { useTourController } from '../hooks/use-tour-controller';
import { TourControlBar } from './tour-control-bar';
import { TourMissingTarget } from './tour-missing-target';
import { DemoEnvironmentBanner } from './demo-environment-banner';
import { DemoEntryHandler } from './demo-entry-handler';
import { DemoFixtureAnchors } from './demo-fixture-anchors';
import { HelpToursCenter } from './help-tours-center';
import { CompanySetupBanner } from './company-setup-banner';
import { TourResumeBanner } from './tour-resume-banner';
import { TourActiveSessionStore } from '../services/tour-active-session';
import { trpc } from '@/lib/trpc';

function useDemoFixturesEnabled(): boolean {
  const { isDemoTenant, isLoading } = useDemoMode();
  if (typeof window !== 'undefined') {
    const launch = new URLSearchParams(window.location.search).get('demo');
    if (launch === 'watch' || launch === 'guided') return true;
    if (TourActiveSessionStore.load()) return true;
  }
  return !isLoading && isDemoTenant;
}

function TourControllerHost({
  children,
  variant = 'crm',
}: {
  children: React.ReactNode;
  variant?: 'crm' | 'portal';
}) {
  const fixturesEnabled = useDemoFixturesEnabled();
  const { data: fixtures } = trpc.demo360.fixtures.useQuery(undefined, {
    enabled: fixturesEnabled,
    staleTime: 60_000,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data ? false : 2500),
  });
  const { saveProgress } = useTourProgress();
  const tour = useTourController(fixtures ?? null, { saveProgress });

  return (
    <TourContext.Provider value={tour}>
      {variant === 'crm' ? (
        <>
          <DemoFixtureAnchors />
          <DemoEnvironmentBanner />
          <CompanySetupBanner />
          <TourResumeBanner />
          <DemoEntryHandler />
        </>
      ) : null}
      {children}
      {variant === 'crm' ? <HelpToursCenter /> : null}
      <TourControlBar />
      <TourMissingTarget />
    </TourContext.Provider>
  );
}

export function TourProvider({
  children,
  variant = 'crm',
}: {
  children: React.ReactNode;
  variant?: 'crm' | 'portal';
}) {
  return (
    <DemoModeProvider>
      <TourProgressProvider>
        <HelpToursProvider>
          <TourControllerHost variant={variant}>{children}</TourControllerHost>
        </HelpToursProvider>
      </TourProgressProvider>
    </DemoModeProvider>
  );
}
