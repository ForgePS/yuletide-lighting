'use client';

import { useTour } from '../context/tour-context';
import { useTourProgress } from '../context/tour-progress-context';
import { useActiveResumableTour } from '../hooks/use-tour-resume';

export function TourResumeBanner() {
  const { status, startTour } = useTour();
  const { dismissProgress } = useTourProgress();
  const offer = useActiveResumableTour();

  if (!offer || status !== 'idle') return null;

  const { tour, progress } = offer;

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold">Resume {tour.name}</span>
          {' — '}
          Step {progress.currentStep + 1} of {tour.steps.length}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={() => void startTour(tour.id, progress.mode, progress.currentStep)}
          >
            Resume
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => void startTour(tour.id, progress.mode, 0)}
          >
            Start over
          </button>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => dismissProgress(tour.id)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
