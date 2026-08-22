import { describe, expect, it } from 'vitest';
import {
  applyAssignmentTransferUpdate,
  applyDamageQuantityUpdate,
  computeAvailable,
  computeItemValue,
  formatInventoryLabel,
  hasAvailableQuantity,
} from '@clcrm/types';

describe('inventory calculations', () => {
  it('computes available quantity', () => {
    expect(
      computeAvailable({
        quantityOnHand: 100,
        quantityReserved: 10,
        quantityAssigned: 5,
        quantityDamaged: 2,
        quantityLost: 0,
      }),
    ).toBe(83);
  });

  it('computes item value', () => {
    expect(computeItemValue({ quantityOnHand: 50, unitCostCents: 200 })).toBe(10000);
  });

  it('formats null-safe inventory labels', () => {
    expect(formatInventoryLabel(null)).toBe('Unknown');
    expect(formatInventoryLabel('partially_received')).toBe('Partially Received');
    expect(formatInventoryLabel('install_truck')).toBe('Install Truck');
  });

  it('applies damage as carve-out without reducing onHand', () => {
    const item = {
      quantityOnHand: 100,
      quantityReserved: 0,
      quantityAssigned: 0,
      quantityDamaged: 0,
      quantityLost: 0,
    };
    const patch = applyDamageQuantityUpdate(item, 5);
    expect(patch).toEqual({ quantityDamaged: 5 });
    expect(
      computeAvailable({
        ...item,
        ...patch,
      }),
    ).toBe(95);
  });

  it('applies assignment transfer without reducing onHand', () => {
    const item = {
      quantityOnHand: 40,
      quantityReserved: 0,
      quantityAssigned: 2,
      quantityDamaged: 0,
      quantityLost: 0,
    };
    const patch = applyAssignmentTransferUpdate(item, 3);
    expect(patch).toEqual({ quantityAssigned: 5 });
    expect(
      computeAvailable({
        ...item,
        ...patch,
      }),
    ).toBe(35);
  });

  it('gates available quantity checks', () => {
    const item = {
      quantityOnHand: 10,
      quantityReserved: 4,
      quantityAssigned: 3,
      quantityDamaged: 1,
      quantityLost: 0,
    };
    expect(hasAvailableQuantity(item, 2)).toBe(true);
    expect(hasAvailableQuantity(item, 3)).toBe(false);
  });
});
