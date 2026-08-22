import { describe, expect, it } from 'vitest';
import {
  computeAgingBucket,
  computeBalanceDue,
  computeCollectionRisk,
  computeDaysOverdue,
  formatInvoiceStatusLabel,
  inferInvoicePaymentType,
  invoicePayableCents,
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
    expect(computeAgingBucket(due, 5000, new Date('2026-01-15'))).toBe('1_30');
    expect(computeAgingBucket(due, 5000, new Date('2026-02-15'))).toBe('31_60');
  });

  it('normalizes legacy status', () => {
    expect(normalizeInvoiceStatus('partial')).toBe('partially_paid');
    expect(normalizeInvoiceStatus('void')).toBe('cancelled');
    expect(normalizeInvoiceStatus('canceled')).toBe('cancelled');
  });

  it('scores collection risk', () => {
    const { level, score } = computeCollectionRisk(45, 200000, 0.3);
    expect(level).toBe('high');
    expect(score).toBeGreaterThan(40);
  });

  it('formats null-safe invoice labels', () => {
    expect(formatInvoiceStatusLabel(null)).toBe('Unknown');
    expect(formatInvoiceStatusLabel('')).toBe('Unknown');
    expect(formatInvoiceStatusLabel('partially_paid')).toBe('Partially Paid');
    expect(formatInvoiceStatusLabel('void')).toBe('Cancelled');
    expect(formatInvoiceStatusLabel('credit_card')).toBe('Credit Card');
  });

  it('computes deposit-first payable cents', () => {
    expect(
      invoicePayableCents({
        status: 'sent',
        subtotalCents: 10000,
        amountPaidCents: 0,
        depositCents: 3000,
      }),
    ).toEqual({ payable: true, amountCents: 3000 });

    expect(
      invoicePayableCents({
        status: 'partially_paid',
        subtotalCents: 10000,
        amountPaidCents: 3000,
        depositCents: 3000,
      }),
    ).toEqual({ payable: true, amountCents: 7000 });

    expect(
      invoicePayableCents({
        status: 'paid',
        subtotalCents: 10000,
        amountPaidCents: 10000,
        depositCents: 3000,
      }),
    ).toEqual({ payable: false, amountCents: 0, reason: 'INVALID_STATE' });

    expect(
      invoicePayableCents({
        status: 'draft',
        subtotalCents: 10000,
        amountPaidCents: 0,
        depositCents: 3000,
      }),
    ).toEqual({ payable: false, amountCents: 0, reason: 'INVALID_STATE' });
  });

  it('infers payment type from remaining balance and deposit', () => {
    expect(
      inferInvoicePaymentType(
        { subtotalCents: 10000, amountPaidCents: 0, depositCents: 3000 },
        3000,
      ),
    ).toBe('deposit');
    expect(
      inferInvoicePaymentType(
        { subtotalCents: 10000, amountPaidCents: 3000, depositCents: 3000 },
        4000,
      ),
    ).toBe('partial');
    expect(
      inferInvoicePaymentType(
        { subtotalCents: 10000, amountPaidCents: 3000, depositCents: 3000 },
        7000,
      ),
    ).toBe('final');
  });
});
