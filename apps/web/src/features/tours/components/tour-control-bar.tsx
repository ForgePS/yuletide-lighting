'use client';

import { Loader2 } from 'lucide-react';
import { useTour } from '../context/tour-context';
import { useDemoMode } from '../context/demo-mode-context';

export function TourControlBar() {
  const {
    status,
    activeTour,
    stepIndex,
    mode,
    isTransitioning,
    stopTour,
    nextStep,
    prevStep,
    pauseTour,
    resumeTour,
    restartTour,
  } = useTour();
  const { isDemoTenant } = useDemoMode();

  if (!activeTour || status === 'idle' || status === 'missing-target') {
    return null;
  }

  const totalSteps = activeTour.steps.length;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= totalSteps - 1;
  const modeLabel =
    status === 'paused'
      ? 'Tour Paused'
      : mode === 'autoplay'
        ? 'Auto Demo · Narrating'
        : mode === 'onboarding'
          ? 'Onboarding'
          : 'Guided Tour';

  return (
    <div
      className="tour-control-bar fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm"
      role="toolbar"
      aria-label="Tour controls"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{modeLabel}</span>
          <span className="text-sm text-muted-foreground">
            Step {stepIndex + 1} of {totalSteps}
            {isDemoTenant ? ' · Demo Environment' : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-sm active:scale-[0.98]"
            disabled={isFirst}
            onClick={() => void prevStep()}
          >
            ← Back
          </button>

          {(status === 'playing' || status === 'paused') && mode !== 'self-guided' ? (
            <button
              type="button"
              className="btn-secondary text-sm active:scale-[0.98]"
              onClick={status === 'paused' ? resumeTour : pauseTour}
            >
              {status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          ) : null}

          <button
            type="button"
            className="btn-secondary text-sm active:scale-[0.98]"
            onClick={() => void restartTour()}
          >
            Restart
          </button>

          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 text-sm active:scale-[0.98]"
            onClick={() => void (isLast ? stopTour() : nextStep())}
          >
            {isTransitioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {isLast ? 'Finish' : 'Next →'}
          </button>

          <button
            type="button"
            className="btn-ghost text-sm text-muted-foreground active:scale-[0.98]"
            onClick={stopTour}
          >
            Exit Tour
          </button>
        </div>
      </div>
    </div>
  );
}
