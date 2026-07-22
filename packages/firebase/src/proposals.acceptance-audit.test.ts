import { describe, expect, it } from 'vitest';

const LOCKED = new Set(['approved', 'accepted', 'deposit_paid', 'scheduled', 'superseded']);

function isProposalLocked(status: string) {
  return LOCKED.has(status);
}

function buildAcceptanceSnapshot(input: {
  proposalId: string;
  customerName: string;
  ipAddress?: string | null;
  termsVersion: string;
}) {
  return {
    proposalId: input.proposalId,
    acceptedByName: input.customerName,
    signerIp: input.ipAddress ?? null,
    termsVersion: input.termsVersion,
  };
}

describe('proposal acceptance audit helpers', () => {
  it('locks accepted and post-acceptance statuses', () => {
    expect(isProposalLocked('approved')).toBe(true);
    expect(isProposalLocked('deposit_paid')).toBe(true);
    expect(isProposalLocked('superseded')).toBe(true);
    expect(isProposalLocked('draft')).toBe(false);
    expect(isProposalLocked('sent')).toBe(false);
  });

  it('captures signer identity fields in snapshot', () => {
    const snap = buildAcceptanceSnapshot({
      proposalId: 'p1',
      customerName: 'Jane Doe',
      ipAddress: '1.2.3.4',
      termsVersion: 'terms-2026',
    });
    expect(snap.acceptedByName).toBe('Jane Doe');
    expect(snap.signerIp).toBe('1.2.3.4');
    expect(snap.termsVersion).toBe('terms-2026');
  });
});
