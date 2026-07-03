import { describe, expect, it } from 'vitest';
import { calculatePricingFromComponents, calculateUpsells } from '../src/proposals';

describe('calculatePricingFromComponents', () => {
  it('calculates sales price with margin', () => {
    const result = calculatePricingFromComponents({
      linearFootage: 100,
      treeWrapCount: 2,
      garlandLengthFt: 0,
      wreathCount: 0,
      specialtyDecorCount: 0,
      laborHours: 8,
      equipmentChargeCents: 0,
      travelChargeCents: 5000,
      materialCostCents: 0,
      laborCostCents: 0,
    });
    expect(result.salesPriceCents).toBeGreaterThan(result.totalCostCents);
    expect(result.grossMarginPercent).toBeGreaterThan(0);
  });
});

describe('calculateUpsells', () => {
  it('suggests upsells for sparse pricing', () => {
    const { suggestions, totalPotentialCents } = calculateUpsells({ pricing: { linearFootage: 50, treeWrapCount: 0, garlandLengthFt: 0, wreathCount: 0, specialtyDecorCount: 0, laborHours: 4, equipmentChargeCents: 0, travelChargeCents: 0, materialCostCents: 0, laborCostCents: 0 } }, 'roofline');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(totalPotentialCents).toBeGreaterThan(0);
  });
});
