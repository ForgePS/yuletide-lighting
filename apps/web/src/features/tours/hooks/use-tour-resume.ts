'use client';

import type { YuletideTourDefinition } from '../types';
import type { TourProgressRecord } from '@clcrm/types';
import { TourRegistry } from '../registry';
import { useTour } from '../context/tour-context';
import { useTourProgress } from '../context/tour-progress-context';
import { canResumeTourProgress } from '../services/tour-persistence';

export type TourResumeOffer = {
  tour: YuletideTourDefinition;
  progress: TourProgressRecord;
};

export function getResumableTour(
  progressByTourId: Record<string, TourProgressRecord>,
): TourResumeOffer | null {
  for (const tour of TourRegistry.list()) {
    const progress = progressByTourId[tour.id];
    if (canResumeTourProgress(progress, tour.version, tour.steps.length)) {
      return { tour, progress: progress! };
    }
  }
  return null;
}

export function useTourResumeOffer(tourId: string): TourResumeOffer | null {
  const { progressByTourId } = useTourProgress();
  const tour = TourRegistry.get(tourId);
  const progress = progressByTourId[tourId];
  if (!tour || !progress) return null;
  if (!canResumeTourProgress(progress, tour.version, tour.steps.length)) return null;
  return { tour, progress };
}

export function useActiveResumableTour(): TourResumeOffer | null {
  const { status } = useTour();
  const { progressByTourId, isLoading } = useTourProgress();
  if (isLoading || status !== 'idle') return null;
  return getResumableTour(progressByTourId);
}
