import { describe, expect, it } from 'vitest';
import {
  computeAgingBucket,
  computeBalanceDue,
  computeCollectionRisk,
  computeDaysOverdue,
  normalizeInvoiceStatus,
} from '@clcrm/types';

describe('invoices360 calculations', () => {
  it('computes balance due', () => {
    expect(computeBalanceDue({ subtotalCents: 10000, amountPaidCents: 3000 })).toBe(7000);
  });

  it('computes days overdue', () => {
    const due = new Date('2026-01-01');
    const now = new Date('2026-01-11');
    expect(computeDaysOverdue(due, now)).toBe(10);
  });

  it('assigns aging bucket', () => {
    const due = new Date('2026-01-01');
    const now = new Date('2026-02-15');
    expect(computeAgingBucket(due, 5000, now)).toBe('1_30');
  });

  it('normalizes legacy status', () => {
    expect(normalizeInvoiceStatus('partial')).toBe('partially_paid');
    expect(normalizeInvoiceStatus('void')).toBe('cancelled');
  });

  it('scores collection risk', () => {
    const { level, score } = computeCollectionRisk(45, 200000, 0.3);
    expect(level).toBe('high');
    expect(score).toBeGreaterThan(40);
  });
});
