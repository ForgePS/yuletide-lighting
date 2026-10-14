'use client';

import type { TourMode } from '../types';
import { useTour } from '../context/tour-context';
import { useTourProgress } from '../context/tour-progress-context';
import { resumeStepIndex } from '../services/tour-persistence';
import type { TourResumeOffer } from '../hooks/use-tour-resume';

type TourResumeDialogProps = {
  offer: TourResumeOffer;
  mode: TourMode;
  onClose: () => void;
};

export function TourResumeDialog({ offer, mode, onClose }: TourResumeDialogProps) {
  const { startTour } = useTour();
  const { dismissProgress } = useTourProgress();
  const { tour, progress } = offer;
  const stepNumber = progress.currentStep + 1;

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#233446]/45 backdrop-blur-[1px]"
        aria-label="Close resume dialog"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-resume-title"
      >
        <h2 id="tour-resume-title" className="text-lg font-semibold">
          Resume {tour.name}?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {stepNumber} of {tour.steps.length}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const step = resumeStepIndex(progress, tour.version, tour.steps.length);
              onClose();
              void startTour(tour.id, mode, step);
            }}
          >
            Resume
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              void startTour(tour.id, mode, 0);
            }}
          >
            Start over
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              dismissProgress(tour.id);
              onClose();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
