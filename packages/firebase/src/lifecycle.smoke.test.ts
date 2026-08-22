import { describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';
import {
  advanceLifecycleSmoke,
  buildPublicAccessPath,
  canMarkJobInstalled,
  canPublicSignAgreement,
  canScheduleJob,
  computeProposalDepositCents,
  inferInvoicePaymentType,
  invoicePayableCents,
  isLifecycleJobStageAtOrAfter,
  isRebookingEligiblePipelineStage,
  isValidPublicAccessToken,
  jobStageFromAppointmentComplete,
  jobStageFromAppointmentSchedule,
  LIFECYCLE_JOB_STAGES,
  PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH,
} from '@clcrm/types';
import { agreementSourceForProposal, isDepositInvoiceForProposal } from './proposal-acceptance';
import { haversineMiles, nearestNeighborOrder } from './geo';

/**
 * YL-S23 — Full lifecycle smoke (BACKLOG-006) via pure helpers.
 * No Admin SDK / emulator / production writes.
 */
describe('YL-S23 full lifecycle smoke', () => {
  const proposalToken = nanoid(PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH);
  const invoiceToken = nanoid(PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH);
  const proposalId = 'prop_lifecycle_1';

  it('keeps agreement source keys stable for idempotent acceptance', () => {
    expect(agreementSourceForProposal(proposalId)).toBe(`proposal:${proposalId}`);
  });

  it('orders route stops nearest-neighbor from a depot', () => {
    const ordered = nearestNeighborOrder(
      [
        { id: 'far', lat: 34.0, lng: -84.0 },
        { id: 'near', lat: 33.76, lng: -84.39 },
        { id: 'mid', lat: 33.85, lng: -84.3 },
      ],
      { lat: 33.75, lng: -84.39 },
    );
    expect(ordered[0]?.id).toBe('near');
    expect(haversineMiles(33.75, -84.39, 33.76, -84.39)).toBeLessThan(2);
  });

  it('walks lead → proposal → pay → job → removal → renewal', () => {
    expect(isValidPublicAccessToken(proposalToken)).toBe(true);
    expect(isValidPublicAccessToken(invoiceToken)).toBe(true);

    let state = {
      pipelineStage: 'new_lead' as string | null,
      jobStage: null as string | null,
      proposalToken,
      invoiceToken,
      depositPaid: false,
      rebookEligible: false,
    };

    // 1) Lead
    let hop = advanceLifecycleSmoke('lead', state);
    expect(hop.pipelineStage).toBe('new_lead');
    state = { ...state, ...hop };

    // 2) Proposal (public path + signable agreement gate for awaiting_signature)
    hop = advanceLifecycleSmoke('proposal', state);
    expect(hop.pipelineStage).toBe('proposal_sent');
    expect(hop.jobStage).toBe('accepted_proposal');
    expect(hop.proposalPath).toBe(`/p/${proposalToken}`);
    expect(buildPublicAccessPath('proposal', 'short')).toBeNull();
    expect(canPublicSignAgreement('awaiting_signature')).toBe(true);
    expect(canPublicSignAgreement('signed')).toBe(false);
    state = { ...state, ...hop };

    // 3) Pay (deposit invoice match + payable + payment type)
    const depositCents = computeProposalDepositCents({
      depositPercent: 50,
      subtotalCents: 200_00,
    });
    expect(depositCents).toBe(100_00);
    expect(
      isDepositInvoiceForProposal(
        { proposalId, invoiceKind: 'deposit', notes: null },
        proposalId,
      ),
    ).toBe(true);
    expect(
      invoicePayableCents({
        status: 'sent',
        subtotalCents: 200_00,
        amountPaidCents: 0,
        depositCents,
      }).amountCents,
    ).toBe(depositCents);
    expect(
      inferInvoicePaymentType(
        {
          amountPaidCents: 0,
          depositCents,
          subtotalCents: 200_00,
        },
        depositCents,
      ),
    ).toBe('deposit');

    hop = advanceLifecycleSmoke('pay', state);
    expect(hop.depositPaid).toBe(true);
    expect(hop.jobStage).toBe('deposit_paid');
    expect(hop.payPath).toBe(`/pay/${invoiceToken}`);
    state = { ...state, ...hop };

    // 4) Job schedule / install gates
    expect(canScheduleJob('deposit_paid')).toBe(true);
    expect(jobStageFromAppointmentSchedule('installation')).toBe('scheduled');
    hop = advanceLifecycleSmoke('job', state);
    expect(hop.jobStage).toBe('scheduled');
    expect(canMarkJobInstalled('scheduled')).toBe(true);
    expect(jobStageFromAppointmentComplete('installation')).toBe('installed');
    expect(isLifecycleJobStageAtOrAfter('accepted_proposal', 'scheduled')).toBe(true);
    state = { ...state, jobStage: 'installed', pipelineStage: 'installed' };

    // 5) Removal (takedown)
    expect(jobStageFromAppointmentSchedule('takedown')).toBe('removal_scheduled');
    expect(jobStageFromAppointmentComplete('takedown')).toBe('removed');
    hop = advanceLifecycleSmoke('removal', { ...state, jobStage: 'removal_scheduled' });
    expect(hop.jobStage).toBe('removed');
    expect(LIFECYCLE_JOB_STAGES).toContain('removed');
    state = { ...state, ...hop };

    // 6) Renewal eligibility
    expect(isRebookingEligiblePipelineStage('removed')).toBe(true);
    expect(isRebookingEligiblePipelineStage('stored')).toBe(true);
    expect(isRebookingEligiblePipelineStage('scheduled')).toBe(false);
    hop = advanceLifecycleSmoke('renewal', state);
    expect(hop.rebookEligible).toBe(true);
    expect(hop.pipelineStage).toBe('rebook_next_season');
  });
});
