'use client';

import { Compass } from 'lucide-react';
import { DEMO_ENTRY_TOUR_ID } from '@clcrm/types';
import { useTour } from '../context/tour-context';
import { useDemoMode } from '../context/demo-mode-context';

/** Minimal launcher for non-demo tenants — demo entry is at /demo (S3). */
export function TourLauncher() {
  const { status, startTour } = useTour();
  const { isDemoTenant, isLoading } = useDemoMode();

  if (isLoading || isDemoTenant || status !== 'idle') return null;

  return (
    <button
      type="button"
      onClick={() => void startTour(DEMO_ENTRY_TOUR_ID, 'guided')}
      className="fixed bottom-6 right-6 z-[9990] inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition hover:border-primary/40 hover:bg-primary/5"
      aria-label="Start CRM overview tour"
    >
      <Compass className="h-4 w-4 text-primary" />
      Tour
    </button>
  );
}
