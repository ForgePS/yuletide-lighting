/**
 * Phase 1 — Idempotent proposal acceptance workflow.
 * Reprocessing the same accepted proposal must not duplicate jobs, deposit invoices, or timeline events.
 */

import { colGet, colList, colUpdate } from './firestore';
import { createOrgJob } from './record-paths';
import { createInvoice360 } from './invoices360';
import { logCustomerActivity, updateCustomerPipelineStage } from './customer360';
import type { ProposalRecord } from '@clcrm/types';

const DEPOSIT_NOTE_PREFIX = 'Deposit for proposal:';

export type ProposalAcceptanceResult = {
  proposalId: string;
  jobId: string;
  depositInvoiceId: string | null;
  createdJob: boolean;
  createdDepositInvoice: boolean;
  loggedTimeline: boolean;
};

export async function runProposalAcceptedWorkflow(
  orgId: string,
  proposalId: string,
  opts?: { userId?: string | null; userName?: string | null },
): Promise<ProposalAcceptanceResult> {
  const proposal = await colGet<ProposalRecord>(orgId, 'proposals', proposalId);
  if (!proposal) throw new Error('Proposal not found');

  const subtotal = proposal.subtotalCents ?? 0;
  const depositCents =
    proposal.depositAmountCents ??
    Math.round(subtotal * ((proposal.depositPercent ?? 0) / 100));

  // --- Job (idempotent by proposalId) ---
  const jobs = await colList<{
    id: string;
    proposalId?: string | null;
    stage?: string;
    customerId?: string;
    title?: string;
  }>(orgId, 'jobs', 'createdAt', { limit: 500 });
  let job = jobs.find((j) => j.proposalId === proposalId) ?? null;
  let createdJob = false;

  if (!job) {
    const created = await createOrgJob(orgId, {
      customerId: proposal.customerId,
      propertyId: proposal.propertyId ?? null,
      proposalId: proposal.id,
      title: proposal.title || 'Installation',
      stage: 'accepted_proposal',
      subtotalCents: subtotal,
      jobType: 'installation',
    });
    job = { id: created.id, proposalId: proposal.id };
    createdJob = true;
  } else if (job.stage !== 'accepted_proposal' && job.stage !== 'deposit_paid' && job.stage !== 'scheduled') {
    await colUpdate(orgId, 'jobs', job.id, { stage: 'accepted_proposal' });
  }

  // --- Deposit invoice (idempotent by proposalId + deposit note) ---
  const invoices = await colList<{
    id: string;
    proposalId?: string | null;
    notes?: string | null;
    invoiceKind?: string | null;
  }>(orgId, 'invoices', 'createdAt', { limit: 500 });
  let depositInvoice =
    invoices.find(
      (i) =>
        i.proposalId === proposalId &&
        (i.invoiceKind === 'deposit' ||
          (typeof i.notes === 'string' && i.notes.startsWith(DEPOSIT_NOTE_PREFIX))),
    ) ?? null;
  let createdDepositInvoice = false;

  if (!depositInvoice && depositCents > 0) {
    const created = await createInvoice360(
      orgId,
      {
        customerId: proposal.customerId,
        proposalId: proposal.id,
        subtotalCents: depositCents,
        depositPercent: 100,
        notes: `${DEPOSIT_NOTE_PREFIX}${proposal.title || proposal.id}`,
      },
      opts?.userId,
    );
    await colUpdate(orgId, 'invoices', created.id, { invoiceKind: 'deposit' });
    depositInvoice = { id: created.id, proposalId: proposal.id };
    createdDepositInvoice = true;
  }

  // --- Customer lifecycle → won/approved ---
  await updateCustomerPipelineStage(
    orgId,
    proposal.customerId,
    'approved',
    opts?.userId,
    opts?.userName ?? 'System',
  );

  // --- Timeline (idempotent by related proposal + estimate_approved) ---
  const { listActivities } = await import('./customer360');
  const activities = await listActivities(orgId, proposal.customerId);
  const alreadyLogged = activities.some(
    (a) => a.relatedRecordId === proposalId && a.activityType === 'estimate_approved',
  );
  let loggedTimeline = false;
  if (!alreadyLogged) {
    await logCustomerActivity(
      orgId,
      proposal.customerId,
      'estimate_approved',
      `Proposal accepted: ${proposal.title}`,
      opts?.userId,
      opts?.userName ?? 'Customer',
      {
        relatedRecordType: 'proposal',
        relatedRecordId: proposalId,
        relatedRecordLabel: proposal.title,
      },
    );
    loggedTimeline = true;
  }

  // Mark workflow stamp once (safe to overwrite)
  await colUpdate(orgId, 'proposals', proposalId, {
    acceptanceWorkflowAt: new Date(),
    status: proposal.status === 'deposit_paid' ? 'deposit_paid' : 'approved',
  });

  return {
    proposalId,
    jobId: job.id,
    depositInvoiceId: depositInvoice?.id ?? null,
    createdJob,
    createdDepositInvoice,
    loggedTimeline,
  };
}
