'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DemoTourFixtures } from '@clcrm/types';
import type { Driver } from 'driver.js';
import type {
  TourMode,
  TourStatus,
  TourTargetMissingPayload,
  YuletideTourDefinition,
  YuletideTourStep,
} from '../types';
import { TourRegistry } from '../registry';
import { TourPersistenceService } from '../services/tour-persistence';
import { TourActiveSessionStore } from '../services/tour-active-session';
import { TourAnalyticsService } from '../services/tour-analytics';
import { TourAutoPlayController } from '../services/tour-autoplay-controller';
import { TourNarrationController } from '../services/tour-narration';
import { resolveTourTargetSelector } from '../services/tour-target-resolver';
import {
  navigateToTourRoute,
  scrollTourTargetIntoView,
  settleAfterNavigation,
  TOUR_OPTIONAL_TARGET_TIMEOUT_MS,
  TOUR_PORTAL_ROUTE_TIMEOUT_MS,
  TOUR_TARGET_TIMEOUT_MS,
  waitForRefValue,
  waitForTourTarget,
} from '../services/tour-navigation';
import { createTourDriver, destroyTourDriver, mapTourPlacement, refreshTourDriver } from '../utils/tour-driver';
import { resolveTourStepRoute } from '../services/tour-route-resolver';
import { mergeDemoFixtures, readDemoFixturesFromDom, waitForDemoFixturesFromDom } from '../services/tour-dom-fixtures';
import { DEMO_ENTRY_STORAGE_KEY } from '../services/demo-entry';
import type { TourContextValue } from '../context/tour-context';

const FIXTURE_ROUTE_KEYS = [
  'heroCustomerId',
  'heroPropertyId',
  'heroProposalId',
  'heroJobId',
  'heroInvoiceId',
  'heroServiceIssueId',
  'heroPortalAccessToken',
] as const;

function routeFixtureKeys(route?: string): Array<(typeof FIXTURE_ROUTE_KEYS)[number]> {
  if (!route?.includes('{')) return [];
  return FIXTURE_ROUTE_KEYS.filter((key) => route.includes(`{${key}}`));
}

function hasFixtureValues(
  fixtures: DemoTourFixtures | null | undefined,
  keys: Array<(typeof FIXTURE_ROUTE_KEYS)[number]>,
): boolean {
  if (!fixtures) return false;
  return keys.every((key) => Boolean(fixtures[key]));
}

const PROPOSAL_DEPENDENT_STEP_IDS = new Set(['proposal-detail', 'proposal-present', 'customer-portal']);

function findNextPlayableStepIndex(
  tour: YuletideTourDefinition,
  startIndex: number,
  fixtures: DemoTourFixtures | null | undefined,
): number {
  for (let i = startIndex; i < tour.steps.length; i += 1) {
    const candidate = tour.steps[i];
    if (!candidate) continue;

    if (PROPOSAL_DEPENDENT_STEP_IDS.has(candidate.id) && !fixtures?.heroProposalId) {
      continue;
    }

    const treatAsOptional = Boolean(candidate.optional || tour.resilientMode);
    const { skip } = resolveTourStepRoute(candidate.route, fixtures, treatAsOptional);
    if (!skip) return i;
    if (!treatAsOptional) return i;
  }

  return tour.steps.length;
}

const DEFAULT_AUTOPLAY_PADDING_MS = 500;

export type TourPersistenceAdapter = {
  saveProgress: (input: {
    tourId: string;
    tourVersion: number;
    status: 'in-progress' | 'completed' | 'dismissed';
    currentStep: number;
    mode: TourMode;
  }) => void;
};

export function useTourController(
  fixtures: DemoTourFixtures | null = null,
  persistence: TourPersistenceAdapter | null = null,
): TourContextValue {
  const router = useRouter();
  const fixturesRef = useRef<DemoTourFixtures | null>(fixtures);
  const persistenceRef = useRef<TourPersistenceAdapter | null>(persistence);
  const tourStartedAtRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TourStatus>('idle');
  const [activeTour, setActiveTour] = useState<YuletideTourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<TourMode | null>(null);
  const [missingTarget, setMissingTarget] = useState<TourTargetMissingPayload | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const driverRef = useRef<Driver | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoplayRef = useRef<TourAutoPlayController | null>(null);
  const narrationRef = useRef(new TourNarrationController());
  const advancingRef = useRef(false);
  const stepRequestRef = useRef(0);
  const tourRef = useRef<YuletideTourDefinition | null>(null);
  const modeRef = useRef<TourMode | null>(null);
  const stepIndexRef = useRef(0);
  const statusRef = useRef<TourStatus>('idle');
  const restoredRef = useRef(false);

  useEffect(() => {
    tourRef.current = activeTour;
  }, [activeTour]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    fixturesRef.current = fixtures;
  }, [fixtures]);

  useEffect(() => {
    persistenceRef.current = persistence;
  }, [persistence]);

  const teardownAutoplay = useCallback(() => {
    autoplayRef.current?.destroy();
    autoplayRef.current = null;
  }, []);

  const teardownNarration = useCallback(() => {
    narrationRef.current.cancel();
  }, []);

  const teardownDriver = useCallback(() => {
    destroyTourDriver(driverRef.current);
    driverRef.current = null;
  }, []);

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const prepareStepChange = useCallback(() => {
    if (statusRef.current === 'paused') {
      setStatus('playing');
      statusRef.current = 'playing';
    }
    cancelPending();
    teardownAutoplay();
    teardownNarration();
  }, [cancelPending, teardownAutoplay, teardownNarration]);

  const persistProgress = useCallback(
    (tour: YuletideTourDefinition, index: number, tourMode: TourMode, status: 'in-progress' | 'completed') => {
      const now = new Date().toISOString();
      if (!tourStartedAtRef.current) {
        tourStartedAtRef.current = now;
      }
      TourPersistenceService.save({
        tourId: tour.id,
        tourVersion: tour.version,
        status,
        currentStep: index,
        mode: tourMode,
        startedAt: tourStartedAtRef.current,
        updatedAt: now,
        completedAt: status === 'completed' ? now : null,
        dismissedAt: null,
      });
      persistenceRef.current?.saveProgress({
        tourId: tour.id,
        tourVersion: tour.version,
        status,
        currentStep: index,
        mode: tourMode,
      });
    },
    [],
  );

  const emitMissingTarget = useCallback((tour: YuletideTourDefinition, step: YuletideTourStep) => {
    const payload: TourTargetMissingPayload = {
      tourId: tour.id,
      stepId: step.id,
      route: step.route ?? window.location.pathname,
      target: step.target ?? null,
    };
    setMissingTarget(payload);
    setStatus('missing-target');
    statusRef.current = 'missing-target';
    TourAnalyticsService.track({
      type: 'tour_target_missing',
      tourId: payload.tourId,
      stepId: payload.stepId,
      route: payload.route,
      target: payload.target,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const scheduleAutoplay = useCallback(
    (step: YuletideTourStep) => {
      teardownAutoplay();
      if (modeRef.current !== 'autoplay' || statusRef.current !== 'playing') return;

      const padding = step.autoplayDelayMs ?? DEFAULT_AUTOPLAY_PADDING_MS;

      narrationRef.current.speakStep(step, {
        onEnd: () => {
          if (modeRef.current !== 'autoplay' || statusRef.current !== 'playing') return;
          autoplayRef.current = new TourAutoPlayController(() => {
            void nextStepInternal();
          }, padding);
          if (statusRef.current === 'playing') {
            autoplayRef.current.start();
          }
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nextStepInternal is stable via refs
    [teardownAutoplay],
  );

  const narrateStep = useCallback((step: YuletideTourStep) => {
    if (statusRef.current !== 'playing') return;
    narrationRef.current.speakStep(step);
  }, []);

  const completeTour = useCallback(() => {
    const tour = tourRef.current;
    cancelPending();
    teardownAutoplay();
    teardownNarration();
    teardownDriver();
    if (tour) {
      TourAnalyticsService.track({
        type: 'tour_completed',
        tourId: tour.id,
        timestamp: new Date().toISOString(),
      });
      persistProgress(tour, stepIndexRef.current, modeRef.current ?? 'guided', 'completed');
    }
    tourStartedAtRef.current = null;
    TourActiveSessionStore.clear();
    setActiveTour(null);
    setMode(null);
    setStepIndex(0);
    setMissingTarget(null);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [cancelPending, teardownAutoplay, teardownDriver, teardownNarration, persistProgress]);

  const highlightStep = useCallback(
    async (step: YuletideTourStep, selector: string | null, element: Element | null) => {
      teardownDriver();
      const instance = createTourDriver();
      driverRef.current = instance;

      if (step.centered || (!selector && !element)) {
        instance.highlight({
          popover: {
            title: step.title,
            description: step.description,
            side: 'bottom',
            align: 'center',
            showButtons: [],
          },
        });
        if (modeRef.current === 'autoplay') {
          scheduleAutoplay(step);
        } else {
          narrateStep(step);
        }
        return;
      }

      if (element) {
        await scrollTourTargetIntoView(element);
      }

      instance.highlight({
        element: element ?? selector ?? undefined,
        popover: {
          title: step.title,
          description: step.description,
          side: mapTourPlacement(step.placement),
          align: 'start',
          showButtons: [],
        },
      });

      requestAnimationFrame(() => {
        refreshTourDriver(instance);
      });

      if (modeRef.current === 'autoplay') {
        scheduleAutoplay(step);
      } else {
        narrateStep(step);
      }
    },
    [narrateStep, scheduleAutoplay, teardownDriver],
  );

  const showStep = useCallback(
    async (index: number) => {
      const tour = tourRef.current;
      const tourMode = modeRef.current;
      if (!tour || !tourMode) return;

      const step = tour.steps[index];
      if (!step) {
        completeTour();
        return;
      }

      cancelPending();
      const abort = new AbortController();
      abortRef.current = abort;

      setMissingTarget(null);
      setStepIndex(index);
      stepIndexRef.current = index;
      setStatus('playing');
      statusRef.current = 'playing';
      persistProgress(tour, index, tourMode, 'in-progress');

      TourAnalyticsService.track({
        type: 'tour_step_viewed',
        tourId: tour.id,
        stepId: step.id,
        stepIndex: index,
        timestamp: new Date().toISOString(),
      });

      let fixtures = fixturesRef.current;
      const neededFixtureKeys = routeFixtureKeys(step.route);
      if (neededFixtureKeys.length > 0) {
        if (!hasFixtureValues(fixtures, neededFixtureKeys)) {
          fixtures = await waitForRefValue(() => fixturesRef.current, {
            signal: abort.signal,
            timeoutMs: 12_000,
          });
        }
        if (!hasFixtureValues(fixtures, neededFixtureKeys)) {
          const domFixtures = await waitForDemoFixturesFromDom({
            signal: abort.signal,
            timeoutMs: tour.resilientMode ? 3_000 : 6_000,
            keys: neededFixtureKeys,
          });
          fixtures = mergeDemoFixtures(fixtures, domFixtures);
        } else {
          fixtures = mergeDemoFixtures(fixtures, readDemoFixturesFromDom());
        }
        if (fixtures) {
          fixturesRef.current = fixtures;
        }
      }

      const failOrSkipStep = async (): Promise<void> => {
        if (tour.resilientMode || step.optional) {
          const nextIndex = findNextPlayableStepIndex(tour, index + 1, fixtures);
          if (nextIndex >= tour.steps.length) {
            completeTour();
            return;
          }
          await showStep(nextIndex);
          return;
        }
        emitMissingTarget(tour, step);
        teardownDriver();
      };

      const { route: resolvedRoute, skip } = resolveTourStepRoute(
        step.route,
        fixtures,
        step.optional,
      );
      if (skip) {
        const nextIndex = findNextPlayableStepIndex(tour, index + 1, fixtures);
        if (nextIndex >= tour.steps.length) {
          completeTour();
          return;
        }
        await showStep(nextIndex);
        return;
      }

      if (step.route?.includes('{') && !resolvedRoute && !step.optional) {
        await failOrSkipStep();
        return;
      }

      if (resolvedRoute) {
        const routeTimeout = resolvedRoute.startsWith('/portal/') && !resolvedRoute.startsWith('/portal/app')
          ? TOUR_PORTAL_ROUTE_TIMEOUT_MS
          : undefined;
        const navigated = await navigateToTourRoute(router.push, resolvedRoute, {
          signal: abort.signal,
          timeoutMs: routeTimeout,
        });
        if (abort.signal.aborted) return;
        if (!navigated) {
          if (step.optional || tour.resilientMode) {
            const nextIndex = findNextPlayableStepIndex(tour, index + 1, fixtures);
            if (nextIndex >= tour.steps.length) {
              completeTour();
              return;
            }
            await showStep(nextIndex);
            return;
          }
          await failOrSkipStep();
          return;
        }
        await settleAfterNavigation();
      }

      if (step.centered) {
        await highlightStep(step, null, null);
        return;
      }

      const selector = resolveTourTargetSelector(step.target);
      let element: Element | null = null;
      const targetTimeout = step.optional ? TOUR_OPTIONAL_TARGET_TIMEOUT_MS : TOUR_TARGET_TIMEOUT_MS;

      if (selector && step.waitForTarget !== false) {
        element = await waitForTourTarget(selector, { signal: abort.signal, timeoutMs: targetTimeout });
        if (abort.signal.aborted) return;
        if (!element) {
          if (step.optional || tour.resilientMode) {
            const nextIndex = findNextPlayableStepIndex(tour, index + 1, fixtures);
            if (nextIndex >= tour.steps.length) {
              completeTour();
              return;
            }
            await showStep(nextIndex);
            return;
          }
          await failOrSkipStep();
          return;
        }
      } else if (selector) {
        element = document.querySelector(selector);
        if (!element && step.optional) {
          const nextIndex = index + 1;
          if (nextIndex >= tour.steps.length) {
            completeTour();
            return;
          }
          await showStep(nextIndex);
          return;
        }
      }

      await highlightStep(step, selector, element);

      if (step.id === 'proposals-hub') {
        void waitForDemoFixturesFromDom({
          signal: abort.signal,
          timeoutMs: 6_000,
          keys: ['heroProposalId'],
        }).then((domFixtures) => {
          const refreshed = mergeDemoFixtures(fixturesRef.current, domFixtures);
          if (refreshed) {
            fixturesRef.current = refreshed;
          }
        });
      }
    },
    [cancelPending, completeTour, emitMissingTarget, highlightStep, persistProgress, router, teardownDriver],
  );

  const advanceToStep = useCallback(
    async (index: number) => {
      const requestId = ++stepRequestRef.current;
      prepareStepChange();
      teardownDriver();
      advancingRef.current = true;
      setIsTransitioning(true);
      const safetyTimer = window.setTimeout(() => {
        if (requestId !== stepRequestRef.current) return;
        advancingRef.current = false;
        setIsTransitioning(false);
      }, 60_000);
      try {
        await showStep(index);
      } finally {
        window.clearTimeout(safetyTimer);
        if (requestId === stepRequestRef.current) {
          advancingRef.current = false;
          setIsTransitioning(false);
        }
      }
    },
    [prepareStepChange, showStep, teardownDriver],
  );

  async function nextStepInternal() {
    const tour = tourRef.current;
    if (!tour) return;

    let fixtures = mergeDemoFixtures(fixturesRef.current, readDemoFixturesFromDom());
    const currentStep = tour.steps[stepIndexRef.current];
    if (currentStep?.id === 'proposals-hub' && !fixtures?.heroProposalId) {
      const invoicesIndex = tour.steps.findIndex((step) => step.id === 'invoices-deposit');
      if (invoicesIndex > stepIndexRef.current) {
        await showStep(invoicesIndex);
        return;
      }
    }

    const nextIndex = findNextPlayableStepIndex(tour, stepIndexRef.current + 1, fixtures);
    if (nextIndex >= tour.steps.length) {
      completeTour();
      return;
    }
    await showStep(nextIndex);
  }

  async function prevStepInternal() {
    const prevIndex = Math.max(0, stepIndexRef.current - 1);
    await showStep(prevIndex);
  }

  const resumeTourSession = useCallback(
    async (session: { tourId: string; mode: TourMode; stepIndex: number; status: TourStatus }) => {
      const tour = TourRegistry.get(session.tourId);
      if (!tour) return;

      cancelPending();
      teardownAutoplay();
      teardownNarration();
      teardownDriver();

      setActiveTour(tour);
      tourRef.current = tour;
      setMode(session.mode);
      modeRef.current = session.mode;
      setStepIndex(session.stepIndex);
      stepIndexRef.current = session.stepIndex;
      setMissingTarget(null);
      const resumedStatus = session.status === 'paused' ? 'paused' : 'playing';
      setStatus(resumedStatus);
      statusRef.current = resumedStatus;

      await showStep(session.stepIndex);
    },
    [cancelPending, showStep, teardownAutoplay, teardownDriver, teardownNarration],
  );

  const startTour = useCallback(
    async (tourId: string, requestedMode: TourMode = 'guided', startStepIndex = 0) => {
      const tour = TourRegistry.get(tourId);
      if (!tour) return;

      const tourMode = tour.availableModes.includes(requestedMode)
        ? requestedMode
        : tour.availableModes[0] ?? 'guided';

      const clampedStart = Math.max(0, Math.min(startStepIndex, tour.steps.length - 1));

      cancelPending();
      teardownAutoplay();
      teardownNarration();
      narrationRef.current.warmupSession();
      teardownDriver();

      setActiveTour(tour);
      tourRef.current = tour;
      setMode(tourMode);
      modeRef.current = tourMode;
      setStepIndex(clampedStart);
      stepIndexRef.current = clampedStart;
      setMissingTarget(null);
      setStatus('playing');
      statusRef.current = 'playing';
      tourStartedAtRef.current = null;

      TourAnalyticsService.track({
        type: 'tour_started',
        tourId: tour.id,
        mode: tourMode,
        timestamp: new Date().toISOString(),
      });

      await showStep(clampedStart);
    },
    [cancelPending, showStep, teardownAutoplay, teardownDriver, teardownNarration],
  );

  const stopTour = useCallback(() => {
    const tour = tourRef.current;
    const tourMode = modeRef.current;
    stepRequestRef.current++;
    advancingRef.current = false;
    setIsTransitioning(false);
    cancelPending();
    teardownAutoplay();
    teardownNarration();
    teardownDriver();
    if (tour && tourMode) {
      TourAnalyticsService.track({
        type: 'tour_exited',
        tourId: tour.id,
        stepIndex: stepIndexRef.current,
        timestamp: new Date().toISOString(),
      });
      persistProgress(tour, stepIndexRef.current, tourMode, 'in-progress');
    }
    tourStartedAtRef.current = null;
    TourActiveSessionStore.clear();
    setActiveTour(null);
    tourRef.current = null;
    setMode(null);
    modeRef.current = null;
    setStepIndex(0);
    setMissingTarget(null);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [cancelPending, teardownAutoplay, teardownDriver, teardownNarration, persistProgress]);

  const resolveNextStepIndex = useCallback(async (fromIndex: number): Promise<number> => {
    const tour = tourRef.current;
    if (!tour) return fromIndex + 1;

    let fixtures = mergeDemoFixtures(fixturesRef.current, readDemoFixturesFromDom());
    if (fixtures) {
      fixturesRef.current = fixtures;
    }

    const currentStep = tour.steps[fromIndex];
    if (currentStep?.id === 'proposals-hub' && !fixtures?.heroProposalId) {
      const domFixtures = await waitForDemoFixturesFromDom({
        timeoutMs: 2_000,
        keys: ['heroProposalId'],
      });
      fixtures = mergeDemoFixtures(fixtures, domFixtures);
      if (fixtures) {
        fixturesRef.current = fixtures;
      }
    }

    if (currentStep?.id === 'proposals-hub' && !fixtures?.heroProposalId) {
      const invoicesIndex = tour.steps.findIndex((step) => step.id === 'invoices-deposit');
      if (invoicesIndex > fromIndex) return invoicesIndex;
    }

    return findNextPlayableStepIndex(tour, fromIndex + 1, fixtures);
  }, []);

  const nextStep = useCallback(async () => {
    const tour = tourRef.current;
    if (!tour) return;
    const nextIndex = await resolveNextStepIndex(stepIndexRef.current);
    if (nextIndex >= tour.steps.length) {
      prepareStepChange();
      completeTour();
      return;
    }
    await advanceToStep(nextIndex);
  }, [advanceToStep, completeTour, prepareStepChange, resolveNextStepIndex]);

  const prevStep = useCallback(async () => {
    const prevIndex = Math.max(0, stepIndexRef.current - 1);
    if (prevIndex === stepIndexRef.current) return;
    await advanceToStep(prevIndex);
  }, [advanceToStep]);

  const pauseTour = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    stepRequestRef.current++;
    cancelPending();
    setStatus('paused');
    statusRef.current = 'paused';
    setIsTransitioning(false);
    advancingRef.current = false;
    narrationRef.current.pause();
    autoplayRef.current?.pause();
  }, [cancelPending]);

  const resumeTour = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    setStatus('playing');
    statusRef.current = 'playing';

    if (narrationRef.current.isSpeechPaused()) {
      narrationRef.current.resume();
      return;
    }

    if (autoplayRef.current) {
      autoplayRef.current.resume();
      return;
    }

    const tour = tourRef.current;
    const step = tour?.steps[stepIndexRef.current];
    if (!step) return;
    if (modeRef.current === 'autoplay') {
      scheduleAutoplay(step);
    } else {
      narrateStep(step);
    }
  }, [narrateStep, scheduleAutoplay]);

  const restartTour = useCallback(async () => {
    const tour = tourRef.current;
    const tourMode = modeRef.current;
    if (!tour || !tourMode) return;
    teardownDriver();
    setMissingTarget(null);
    tourStartedAtRef.current = null;
    await advanceToStep(0);
  }, [advanceToStep, teardownDriver]);

  const retryStep = useCallback(async () => {
    setMissingTarget(null);
    setStatus('playing');
    statusRef.current = 'playing';
    await showStep(stepIndexRef.current);
  }, [showStep]);

  const skipStep = useCallback(async () => {
    const tour = tourRef.current;
    if (!tour) return;
    setMissingTarget(null);
    const nextIndex = stepIndexRef.current + 1;
    if (nextIndex >= tour.steps.length) {
      prepareStepChange();
      completeTour();
      return;
    }
    await advanceToStep(nextIndex);
  }, [advanceToStep, completeTour, prepareStepChange]);

  useEffect(() => {
    if (!activeTour || !mode) return;
    TourActiveSessionStore.save({
      tourId: activeTour.id,
      mode,
      stepIndex,
      status,
    });
  }, [activeTour, mode, stepIndex, status]);

  useEffect(() => {
    return () => {
      cancelPending();
      teardownAutoplay();
      teardownNarration();
      teardownDriver();
    };
  }, [cancelPending, teardownAutoplay, teardownDriver, teardownNarration]);

  useEffect(() => {
    if (restoredRef.current || activeTour) return;
    try {
      if (sessionStorage.getItem(DEMO_ENTRY_STORAGE_KEY)) return;
      const demoLaunch = new URLSearchParams(window.location.search).get('demo');
      if (demoLaunch === 'watch' || demoLaunch === 'guided') return;
    } catch {
      /* ignore */
    }
    const session = TourActiveSessionStore.load();
    if (!session || (session.status !== 'playing' && session.status !== 'paused')) return;
    if (!TourRegistry.get(session.tourId)) return;
    restoredRef.current = true;
    void resumeTourSession(session);
  }, [activeTour, resumeTourSession]);

  return {
    status,
    activeTour,
    stepIndex,
    mode,
    missingTarget,
    isTransitioning,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    pauseTour,
    resumeTour,
    restartTour,
    retryStep,
    skipStep,
  };
}
