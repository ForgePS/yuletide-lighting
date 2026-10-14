'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Play, Search, Sparkles, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { TourMode } from '../types';
import { TourRegistry } from '../registry';
import { useTour } from '../context/tour-context';
import { useHelpTours } from '../context/help-tours-context';
import { useDemoMode } from '../context/demo-mode-context';
import { useTourProgress } from '../context/tour-progress-context';
import type { TourResumeOffer } from '../hooks/use-tour-resume';
import { TourResumeDialog } from './tour-resume-dialog';
import { canResumeTourProgress } from '../services/tour-persistence';
import {
  TOUR_CATEGORY_LABELS,
  TOUR_CATEGORY_ORDER,
  filterTours,
  groupToursByCategory,
  isTourAvailableForTenant,
} from '../config/tour-catalog';

function TourProgressBadge({
  tourId,
  tourVersion,
  totalSteps,
}: {
  tourId: string;
  tourVersion: number;
  totalSteps: number;
}) {
  const { progressByTourId } = useTourProgress();
  const progress = progressByTourId[tourId];
  if (!progress) return null;
  if (progress.status === 'completed') {
    return <span className="text-xs text-emerald-700">Completed</span>;
  }
  if (canResumeTourProgress(progress, tourVersion, totalSteps)) {
    return (
      <span className="text-xs text-primary">
        In progress · Step {progress.currentStep + 1}
      </span>
    );
  }
  return null;
}

function TourLaunchButtons({
  tourId,
  modes,
  onLaunch,
}: {
  tourId: string;
  modes: TourMode[];
  onLaunch: (tourId: string, mode: TourMode) => void;
}) {
  const hasGuided = modes.includes('guided') || modes.includes('self-guided');
  const hasAutoplay = modes.includes('autoplay');
  const guidedMode: TourMode = modes.includes('guided') ? 'guided' : 'self-guided';

  return (
    <div className="flex flex-wrap gap-2">
      {hasGuided ? (
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          onClick={() => onLaunch(tourId, guidedMode)}
        >
          <Play className="h-3.5 w-3.5" />
          Start tour
        </button>
      ) : null}
      {hasAutoplay ? (
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          onClick={() => onLaunch(tourId, 'autoplay')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-play
        </button>
      ) : null}
    </div>
  );
}

export function HelpToursCenter() {
  const { isOpen, close } = useHelpTours();
  const { status, startTour } = useTour();
  const { isDemoTenant } = useDemoMode();
  const { progressByTourId } = useTourProgress();
  const [query, setQuery] = useState('');
  const [resumeOffer, setResumeOffer] = useState<TourResumeOffer | null>(null);
  const [resumeMode, setResumeMode] = useState<TourMode>('guided');
  const { data: companySetup } = trpc.onboarding360.state.useQuery(undefined, {
    enabled: isOpen && !isDemoTenant,
    staleTime: 30_000,
  });
  const reopenSetup = trpc.onboarding360.reopen.useMutation();

  const tours = useMemo(() => {
    const all = TourRegistry.list()
      .filter((tour) => isTourAvailableForTenant(tour, isDemoTenant))
      .sort((a, b) => a.name.localeCompare(b.name));
    return filterTours(all, query);
  }, [isDemoTenant, query]);

  const grouped = useMemo(() => groupToursByCategory(tours), [tours]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  function requestLaunch(tourId: string, mode: TourMode) {
    if (status !== 'idle' && status !== 'paused') return;
    const tour = TourRegistry.get(tourId);
    if (!tour) return;
    const progress = progressByTourId[tourId];
    if (canResumeTourProgress(progress, tour.version, tour.steps.length)) {
      setResumeMode(mode);
      setResumeOffer({ tour, progress: progress! });
      return;
    }
    close();
    setQuery('');
    void startTour(tourId, mode, 0);
  }

  return (
    <>
      {resumeOffer ? (
        <TourResumeDialog
          offer={resumeOffer}
          mode={resumeMode}
          onClose={() => {
            setResumeOffer(null);
            close();
            setQuery('');
          }}
        />
      ) : null}
      <div className="fixed inset-0 z-[10002]">
        <button
          type="button"
          className="absolute inset-0 bg-[#233446]/40 backdrop-blur-[1px]"
          aria-label="Close Help & Tours"
          onClick={close}
        />
        <aside
          className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-tours-title"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="help-tours-title" className="text-lg font-semibold">
                Help & Tours
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Guided walkthroughs for every part of Yuletide.
              </p>
            </div>
            <button type="button" className="btn-ghost rounded-full p-2" onClick={close} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-border px-5 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Help & Tours"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!isDemoTenant && companySetup && !companySetup.completed ? (
              <section className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h3 className="font-semibold">Company Setup</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {companySetup.completedCount} of {companySetup.totalCount} configuration steps complete.
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${companySetup.progressPercent}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/onboarding" className="btn-primary text-xs" onClick={close}>
                    Open Company Setup
                  </Link>
                  {companySetup.dismissed ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={reopenSetup.isPending}
                      onClick={() => reopenSetup.mutate()}
                    >
                      Show banner again
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tours match your search.</p>
            ) : (
              <div className="space-y-6">
                {TOUR_CATEGORY_ORDER.map((category) => {
                  const items = grouped.get(category) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <section key={category}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {TOUR_CATEGORY_LABELS[category]}
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {items.map((tour) => (
                          <li
                            key={tour.id}
                            className="rounded-xl border border-border bg-background/60 p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium">{tour.name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{tour.description}</p>
                                <div className="mt-1">
                                  <TourProgressBadge
                                    tourId={tour.id}
                                    tourVersion={tour.version}
                                    totalSteps={tour.steps.length}
                                  />
                                </div>
                              </div>
                              {tour.demoOnly ? (
                                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                  Demo
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {tour.estimatedMinutes ?? Math.max(1, Math.ceil(tour.steps.length / 2))} min
                                <span className="text-border">·</span>
                                {tour.steps.length} steps
                              </span>
                              <TourLaunchButtons
                                tourId={tour.id}
                                modes={tour.availableModes}
                                onLaunch={requestLaunch}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {isDemoTenant ? (
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Demo environment — fixture-based tours use sample John Smith data.
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
