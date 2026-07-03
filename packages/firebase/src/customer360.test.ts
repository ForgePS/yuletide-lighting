import { describe, expect, it } from 'vitest';
import { calculateHealthScore } from '../src/customer360';

describe('calculateHealthScore', () => {
  it('returns excellent rating for strong customers', () => {
    const result = calculateHealthScore({
      paidRatio: 1,
      renewalCount: 3,
      communicationCount: 10,
      completedJobs: 5,
      totalJobs: 5,
      outstandingBalanceCents: 0,
    });
    expect(result.healthScore).toBeGreaterThanOrEqual(85);
    expect(result.healthRating).toBe('excellent');
  });

  it('returns at_risk for poor payment and balance', () => {
    const result = calculateHealthScore({
      paidRatio: 0.2,
      renewalCount: 0,
      communicationCount: 0,
      completedJobs: 0,
      totalJobs: 4,
      outstandingBalanceCents: 500000,
    });
    expect(result.healthRating).toBe('at_risk');
    expect(result.healthScore).toBeLessThan(50);
  });
});
