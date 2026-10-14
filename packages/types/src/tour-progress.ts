export type TourProgressMode = 'guided' | 'autoplay' | 'self-guided' | 'onboarding';

export type TourProgressStatus = 'not-started' | 'in-progress' | 'completed' | 'dismissed';

export type TourProgressRecord = {
  tourId: string;
  tourVersion: number;
  status: TourProgressStatus;
  currentStep: number;
  mode: TourProgressMode;
  startedAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  dismissedAt?: string | null;
};

export function canResumeTourProgress(
  record: TourProgressRecord | null | undefined,
  tourVersion: number,
  totalSteps: number,
): boolean {
  if (!record) return false;
  if (record.status !== 'in-progress') return false;
  if (record.tourVersion !== tourVersion) return false;
  return record.currentStep > 0 && record.currentStep < totalSteps;
}

export function resumeStepIndex(
  record: TourProgressRecord | null | undefined,
  tourVersion: number,
  totalSteps: number,
): number {
  if (!canResumeTourProgress(record, tourVersion, totalSteps)) return 0;
  return Math.min(record!.currentStep, totalSteps - 1);
}
