'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DEMO_ENTRY_TOUR_ID, type DemoEntryMode } from '@clcrm/types';
import { useTour } from '../context/tour-context';
import { TourPersistenceService } from '../services/tour-persistence';
import { mapDemoEntryToTourMode } from '../services/demo-entry';
import { TourActiveSessionStore } from '../services/tour-active-session';

const VALID_DEMO_MODES = new Set<DemoEntryMode>(['watch', 'guided', 'explore']);

function DemoEntryHandlerInner() {
  const searchParams = useSearchParams();
  const { startTour, status } = useTour();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || status !== 'idle') return;

    const raw = searchParams.get('demo');
    if (!raw || !VALID_DEMO_MODES.has(raw as DemoEntryMode)) return;

    const mode = raw as DemoEntryMode;
    startedRef.current = true;

    if (mode === 'explore') {
      window.history.replaceState(null, '', '/app');
      return;
    }

    const tourMode = mapDemoEntryToTourMode(mode);
    if (!tourMode) return;

    TourActiveSessionStore.clear();
    TourPersistenceService.remove(DEMO_ENTRY_TOUR_ID);

    void startTour(DEMO_ENTRY_TOUR_ID, tourMode, 0);
    window.history.replaceState(null, '', '/app');
  }, [searchParams, startTour, status]);

  return null;
}

/** Applies demo entry intent after /demo → /app?demo= navigation (YT-TOUR-S3). */
export function DemoEntryHandler() {
  return (
    <Suspense fallback={null}>
      <DemoEntryHandlerInner />
    </Suspense>
  );
}
