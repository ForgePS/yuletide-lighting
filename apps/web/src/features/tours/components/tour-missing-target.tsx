'use client';

import { useTour } from '../context/tour-context';

export function TourMissingTarget() {
  const { status, missingTarget, retryStep, skipStep, stopTour } = useTour();

  if (status !== 'missing-target' || !missingTarget) {
    return null;
  }

  return (
    <div className="tour-missing-target fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-w-md p-6 shadow-xl" role="alertdialog" aria-labelledby="tour-missing-title">
        <h2 id="tour-missing-title" className="text-lg font-semibold text-foreground">
          Tour step unavailable
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This tour step is unavailable in the current view.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm" onClick={() => void retryStep()}>
            Retry
          </button>
          <button type="button" className="btn-secondary text-sm" onClick={() => void skipStep()}>
            Skip Step
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={stopTour}>
            Exit Tour
          </button>
        </div>
      </div>
    </div>
  );
}
