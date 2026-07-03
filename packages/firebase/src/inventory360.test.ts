import { describe, expect, it } from 'vitest';
import { computeAvailable, computeItemValue } from '@clcrm/types';

describe('inventory calculations', () => {
  it('computes available quantity', () => {
    expect(computeAvailable({ quantityOnHand: 100, quantityReserved: 10, quantityAssigned: 5, quantityDamaged: 2, quantityLost: 0 })).toBe(83);
  });
  it('computes item value', () => {
    expect(computeItemValue({ quantityOnHand: 50, unitCostCents: 200 })).toBe(10000);
  });
});
