import { describe, expect, it } from 'vitest';
import {
  agreementSourceForProposal,
  isDepositInvoiceForProposal,
} from './proposal-acceptance';
import {
  canPublicSignAgreement,
  formatAgreementStatusLabel,
  isAgreementSignedStatus,
} from '@clcrm/types';

describe('proposal acceptance idempotency matching', () => {
  it('matches deposit invoices by kind or note prefix', () => {
    expect(isDepositInvoiceForProposal({ proposalId: 'p1', invoiceKind: 'deposit' }, 'p1')).toBe(
      true,
    );
    expect(
      isDepositInvoiceForProposal(
        { proposalId: 'p1', notes: 'Deposit for proposal: Holiday lights' },
        'p1',
      ),
    ).toBe(true);
  });

  it('ignores other invoices for the same proposal', () => {
    expect(isDepositInvoiceForProposal({ proposalId: 'p1', notes: 'Final balance' }, 'p1')).toBe(
      false,
    );
    expect(isDepositInvoiceForProposal({ proposalId: 'p2', invoiceKind: 'deposit' }, 'p1')).toBe(
      false,
    );
  });

  it('builds stable agreement source keys per proposal', () => {
    expect(agreementSourceForProposal('abc')).toBe('proposal:abc');
    expect(agreementSourceForProposal('abc')).toBe(agreementSourceForProposal('abc'));
  });
});

describe('YL-S8 agreement public sign gates', () => {
  it('allows sign only when awaiting_signature', () => {
    expect(canPublicSignAgreement('awaiting_signature')).toBe(true);
    expect(canPublicSignAgreement('draft')).toBe(false);
    expect(canPublicSignAgreement('active')).toBe(false);
    expect(canPublicSignAgreement(null)).toBe(false);
  });

  it('formats status labels null-safely', () => {
    expect(formatAgreementStatusLabel('awaiting_signature')).toBe('Awaiting Signature');
    expect(formatAgreementStatusLabel(null)).toBe('Unknown');
    expect(formatAgreementStatusLabel(undefined)).toBe('Unknown');
  });

  it('treats active and signed as signed-ish', () => {
    expect(isAgreementSignedStatus('active')).toBe(true);
    expect(isAgreementSignedStatus('signed')).toBe(true);
    expect(isAgreementSignedStatus('draft')).toBe(false);
  });
});
