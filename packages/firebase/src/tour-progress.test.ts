import { describe, expect, it } from 'vitest';
import { canResumeTourProgress, resumeStepIndex } from '@clcrm/types';
import type { TourProgressRecord } from '@clcrm/types';

describe('tour progress resume helpers', () => {
  const base: TourProgressRecord = {
    tourId: 'example-overview',
    tourVersion: 1,
    status: 'in-progress',
    currentStep: 3,
    mode: 'guided',
  };

  it('allows resume when in progress on matching version', () => {
    expect(canResumeTourProgress(base, 1, 5)).toBe(true);
    expect(resumeStepIndex(base, 1, 5)).toBe(3);
  });

  it('blocks resume when version changed or tour completed', () => {
    expect(canResumeTourProgress(base, 2, 5)).toBe(false);
    expect(canResumeTourProgress({ ...base, status: 'completed' }, 1, 5)).toBe(false);
    expect(canResumeTourProgress({ ...base, status: 'dismissed' }, 1, 5)).toBe(false);
  });

  it('blocks resume on first or final step', () => {
    expect(canResumeTourProgress({ ...base, currentStep: 0 }, 1, 5)).toBe(false);
    expect(canResumeTourProgress({ ...base, currentStep: 5 }, 1, 5)).toBe(false);
  });
});
