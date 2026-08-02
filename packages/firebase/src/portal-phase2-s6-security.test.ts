/**
 * Portal Phase 2 S6 — mutation/state/idempotency unit tests.
 * ENVIRONMENT=EMULATOR (pure unit where possible).
 */
import { describe, expect, it } from 'vitest';
import {
  canPortalTransition,
  portalInvoicePayableCents,
  portalPaymentSafeMode,
  PortalMutationDeniedError,
} from './portal-mutation';

describe('P2-S6 state transitions', () => {
  it('allows valid proposal customer transitions', () => {
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'sent',
        targetState: 'approved',
      }),
    ).toBe(true);
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'sent',
        targetState: 'customer_questions',
      }),
    ).toBe(true);
  });

  it('denies invalid / unknown proposal transitions', () => {
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'approved',
        targetState: 'sent',
      }),
    ).toBe(false);
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'unknown_status',
        targetState: 'approved',
      }),
    ).toBe(false);
  });

  it('allows agreement sign from awaiting_signature only once conceptually', () => {
    expect(
      canPortalTransition({
        resourceType: 'agreement',
        currentState: 'awaiting_signature',
        targetState: 'active',
      }),
    ).toBe(true);
    expect(
      canPortalTransition({
        resourceType: 'agreement',
        currentState: 'active',
        targetState: 'active',
      }),
    ).toBe(false);
  });

  it('denies mockup draft approvals', () => {
    expect(
      canPortalTransition({
        resourceType: 'mockup',
        currentState: 'draft',
        targetState: 'approved',
      }),
    ).toBe(false);
    expect(
      canPortalTransition({
        resourceType: 'mockup',
        currentState: 'in_review',
        targetState: 'approved',
      }),
    ).toBe(true);
  });

  it('denies rebook from terminal states', () => {
    expect(
      canPortalTransition({
        resourceType: 'rebooking',
        currentState: 'rebooked',
        targetState: 'rebooked',
      }),
    ).toBe(false);
    expect(
      canPortalTransition({
        resourceType: 'rebooking',
        currentState: 'sent',
        targetState: 'rebooked',
      }),
    ).toBe(true);
  });
});

describe('P2-S6 payment amount authority', () => {
  it('computes server payable balance and rejects paid/void', () => {
    expect(
      portalInvoicePayableCents({
        status: 'sent',
        subtotalCents: 10000,
        amountPaidCents: 2500,
      }).amountCents,
    ).toBe(7500);
    expect(
      portalInvoicePayableCents({
        status: 'paid',
        subtotalCents: 10000,
        amountPaidCents: 10000,
      }).payable,
    ).toBe(false);
    expect(
      portalInvoicePayableCents({
        status: 'refunded',
        subtotalCents: 10000,
        amountPaidCents: 0,
      }).payable,
    ).toBe(false);
    expect(
      portalInvoicePayableCents({
        status: 'sent',
        subtotalCents: 10000,
        amountPaidCents: 0,
        depositCents: 3000,
      }).amountCents,
    ).toBe(3000);
  });

  it('enables safe mode under emulator env', () => {
    const prev = process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(portalPaymentSafeMode()).toBe(true);
    if (prev === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = prev;
  });
});

describe('P2-S6 mutation errors', () => {
  it('typed denial reasons stay generic', () => {
    const err = new PortalMutationDeniedError('INVALID_STATE');
    expect(err.reason).toBe('INVALID_STATE');
    expect(err.message).not.toMatch(/customer|tenant|stripe/i);
  });
});
