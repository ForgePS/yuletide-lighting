import { describe, expect, it } from 'vitest';

/** Pure helpers mirroring deposit invoice idempotency matching. */
const DEPOSIT_NOTE_PREFIX = 'Deposit for proposal:';

function isDepositInvoice(inv: {
  proposalId?: string | null;
  notes?: string | null;
  invoiceKind?: string | null;
}, proposalId: string) {
  return (
    inv.proposalId === proposalId &&
    (inv.invoiceKind === 'deposit' ||
      (typeof inv.notes === 'string' && inv.notes.startsWith(DEPOSIT_NOTE_PREFIX)))
  );
}

describe('proposal acceptance idempotency matching', () => {
  it('matches deposit invoices by kind or note prefix', () => {
    expect(
      isDepositInvoice({ proposalId: 'p1', invoiceKind: 'deposit' }, 'p1'),
    ).toBe(true);
    expect(
      isDepositInvoice({ proposalId: 'p1', notes: 'Deposit for proposal: Holiday lights' }, 'p1'),
    ).toBe(true);
  });

  it('ignores other invoices for the same proposal', () => {
    expect(isDepositInvoice({ proposalId: 'p1', notes: 'Final balance' }, 'p1')).toBe(false);
    expect(isDepositInvoice({ proposalId: 'p2', invoiceKind: 'deposit' }, 'p1')).toBe(false);
  });
});
