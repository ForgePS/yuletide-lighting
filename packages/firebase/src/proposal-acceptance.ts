/**
 * Phase 1 — Idempotent proposal acceptance workflow.
 * Reprocessing the same accepted proposal must not duplicate jobs, deposit invoices,
 * agreements, planned materials, prep rows, or timeline events.
 */

import { getAdminFirestore, Timestamp } from './admin';
import { colGet, colList, colUpdate } from './firestore';
import { createOrgJob } from './record-paths';
import { createInvoice360, sendInvoice360 } from './invoices360';
import { logCustomerActivity, updateCustomerPipelineStage } from './customer360';
import { createMultiYearAgreement360, listMultiYearAgreements360, sendAgreementForSignature360 } from './agreements';
import { getProposal360 } from './proposals';
import { getSeasonSettings } from './settings360';
import { ensureProjectPrepFromJob } from './project-prep';
import type { ProposalRecord } from '@clcrm/types';

const DEPOSIT_NOTE_PREFIX = 'Deposit for proposal:';

export function agreementSourceForProposal(proposalId: string) {
  return `proposal:${proposalId}`;
}

/** YL-S8 — shared deposit invoice match used by acceptance workflow + tests. */
export function isDepositInvoiceForProposal(
  inv: {
    proposalId?: string | null;
    notes?: string | null;
    invoiceKind?: string | null;
  },
  proposalId: string,
): boolean {
  return (
    inv.proposalId === proposalId &&
    (inv.invoiceKind === 'deposit' ||
      (typeof inv.notes === 'string' && inv.notes.startsWith(DEPOSIT_NOTE_PREFIX)))
  );
}

export type ProposalAcceptanceResult = {
  proposalId: string;
  jobId: string;
  depositInvoiceId: string | null;
  depositPaymentLink: string | null;
  agreementId: string | null;
  createdJob: boolean;
  createdDepositInvoice: boolean;
  createdAgreement: boolean;
  plannedMaterials: number;
  prepItemsCreated: number;
  shortages: number;
  inventoryReserved: boolean;
  inventoryMessage: string | null;
  paymentRequestSent: boolean;
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

  const customer = await colGet<{
    firstName?: string;
    lastName?: string;
    businessName?: string | null;
    email?: string | null;
    phone?: string | null;
  }>(orgId, 'customers', proposal.customerId);
  const customerName =
    customer?.businessName ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') ||
    'Customer';

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
    job = { id: created.id, proposalId: proposal.id, title: proposal.title || 'Installation' };
    createdJob = true;
  } else if (
    job.stage !== 'accepted_proposal' &&
    job.stage !== 'deposit_paid' &&
    job.stage !== 'scheduled' &&
    job.stage !== 'inventory_reserved'
  ) {
    await colUpdate(orgId, 'jobs', job.id, { stage: 'accepted_proposal' });
  }

  // Copy approved scope + mockup references onto the job (safe overwrite of operational fields)
  await copyScopeOntoJob(orgId, job.id, proposalId, proposal);

  // --- Deposit invoice (idempotent by proposalId + deposit note) ---
  const invoices = await colList<{
    id: string;
    proposalId?: string | null;
    notes?: string | null;
    invoiceKind?: string | null;
    publicToken?: string | null;
    status?: string | null;
  }>(orgId, 'invoices', 'createdAt', { limit: 500 });
  let depositInvoice =
    invoices.find((i) => isDepositInvoiceForProposal(i, proposalId)) ?? null;
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
    depositInvoice = {
      id: created.id,
      proposalId: proposal.id,
      publicToken: created.publicToken,
      status: created.status,
    };
    createdDepositInvoice = true;
  }

  let paymentRequestSent = false;
  let depositPaymentLink: string | null = null;
  if (depositInvoice?.id) {
    const fresh = await colGet<{ publicToken?: string | null; status?: string | null }>(
      orgId,
      'invoices',
      depositInvoice.id,
    );
    const token = fresh?.publicToken ?? depositInvoice.publicToken ?? null;
    if (token) {
      depositPaymentLink = `/pay/${token}`;
    }
    if (fresh?.status === 'draft' || createdDepositInvoice) {
      try {
        await sendInvoice360(orgId, depositInvoice.id, opts?.userId);
        paymentRequestSent = true;
      } catch {
        // Sending is best-effort; invoice still exists
      }
    }
  }

  // --- Agreement draft (idempotent by source proposal:*) ---
  const agreementSource = agreementSourceForProposal(proposalId);
  const existingAgreements = await listMultiYearAgreements360(orgId, {
    customerId: proposal.customerId,
    pageSize: 100,
  });
  let agreement = existingAgreements.items.find((a) => a.source === agreementSource) ?? null;
  let createdAgreement = false;

  if (!agreement) {
    const season = await getSeasonSettings(orgId, opts?.userId);
    const startSeason = season.seasonYear;
    agreement = await createMultiYearAgreement360(
      orgId,
      {
        customerId: proposal.customerId,
        customerName,
        propertyId: proposal.propertyId ?? '',
        title: proposal.title || `Agreement — ${customerName}`,
        status: 'draft',
        optionCode: 'A',
        optionLabel: 'Season agreement',
        startSeason,
        endSeason: startSeason,
        annualValueCents: subtotal,
        depositPercent: proposal.depositPercent ?? 50,
        autoGenerateProjects: true,
        linkedProjectIds: [],
        notes: `Auto-created from accepted proposal ${proposalId}. Job ${job.id}.`,
        source: agreementSource,
        signedAt: null,
        cancelledAt: null,
        nextRenewalDate: null,
      },
      opts?.userId,
    );
    createdAgreement = true;
    // Stamp proposalId outside the zod create schema
    await getAdminFirestore()
      .doc(`organizations/${orgId}/multiYearAgreements/${agreement.id}`)
      .update({ proposalId });
  }

  // Send for customer signature (idempotent if already awaiting/signed)
  if (agreement && (createdAgreement || agreement.status === 'draft')) {
    try {
      const sent = await sendAgreementForSignature360(orgId, agreement.id, opts?.userId);
      if (sent) agreement = sent;
    } catch {
      // Signature send is best-effort
    }
  }

  // --- Plan materials from proposal line items, then best-effort reserve ---
  const plannedMaterials = await ensurePlannedMaterialsFromProposal(orgId, job.id, proposalId);
  let inventoryReserved = false;
  let inventoryMessage: string | null = null;

  if (plannedMaterials === 0) {
    inventoryMessage = 'No inventory-linked line items to reserve';
  } else {
    try {
      const { reserveJobMaterials } = await import('./inventory');
      await reserveJobMaterials(orgId, job.id);
      inventoryReserved = true;
      inventoryMessage = `Reserved materials for ${plannedMaterials} line item(s)`;
    } catch (err) {
      inventoryMessage =
        err instanceof Error ? err.message : 'Could not reserve inventory (insufficient stock or missing items)';
    }
  }

  // --- Project prep + shortages (idempotent by job materials) ---
  const prep = await ensureProjectPrepFromJob(
    orgId,
    {
      jobId: job.id,
      proposalId,
      customerId: proposal.customerId,
      customerName,
      jobTitle: proposal.title || job.title || 'Installation',
      inventoryReserved,
    },
    opts?.userId,
  );

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

  // --- Automations / notifications (best-effort) ---
  try {
    const { triggerAutomation } = await import('./messages360');
    const { fireAutomationTrigger } = await import('./automation360');
    const vars = {
      customerName,
      proposalTitle: proposal.title || 'Proposal',
      proposalId,
      jobId: job.id,
      paymentLink: depositPaymentLink ?? '',
      depositAmount: depositCents ? `$${(depositCents / 100).toFixed(2)}` : '',
    };
    await triggerAutomation(orgId, 'payment_reminder', proposal.customerId, vars, opts?.userId);
    await fireAutomationTrigger(
      orgId,
      'proposal_accepted',
      {
        customerId: proposal.customerId,
        customerName,
        proposalId,
        jobId: job.id,
        vars: {
          paymentLink: depositPaymentLink ?? '',
        },
      },
      opts?.userId,
    );
  } catch {
    // Automations must not block acceptance
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
    depositPaymentLink,
    agreementId: agreement.id,
    createdJob,
    createdDepositInvoice,
    createdAgreement,
    plannedMaterials,
    prepItemsCreated: prep.created,
    shortages: prep.shortages,
    inventoryReserved,
    inventoryMessage,
    paymentRequestSent,
    loggedTimeline,
  };
}

async function copyScopeOntoJob(
  orgId: string,
  jobId: string,
  proposalId: string,
  proposal: ProposalRecord,
) {
  try {
    const full = await getProposal360(orgId, proposalId);
    const packages = full?.packages ?? [];
    const recommended = packages.find((p) => p.isRecommended) ?? packages[0] ?? null;
    const lineSummary = recommended?.lineItems
      ?.map((l) => `${l.quantity}× ${l.description}`)
      .join('\n');

    const mockups = await colList<{
      id: string;
      proposalId?: string | null;
      propertyId?: string | null;
      imageUrl?: string | null;
      renderedImageUrl?: string | null;
      status?: string | null;
    }>(orgId, 'mockups', 'createdAt', { limit: 200 });
    const approvedMockups = mockups.filter(
      (m) =>
        (m.proposalId === proposalId || m.propertyId === proposal.propertyId) &&
        (m.status === 'approved' || m.status === 'customer_approved'),
    );
    const photoUrls = approvedMockups
      .map((m) => m.renderedImageUrl || m.imageUrl)
      .filter(Boolean) as string[];

    await colUpdate(orgId, 'jobs', jobId, {
      proposalId,
      scopeSummary: lineSummary || proposal.title || null,
      approvedPackageId: recommended?.id ?? null,
      approvedPackageName: recommended?.name ?? recommended?.label ?? null,
      mockupPhotoUrls: photoUrls,
      installNotes: proposal.notes ?? null,
      schedulingRequirements: {
        estimatedHours: recommended ? Math.max(2, Math.round((recommended.laborCostCents ?? 0) / 7500)) : 2,
        needsLift: /lift|bucket/i.test(lineSummary ?? ''),
        needsLadder: true,
      },
    });
  } catch {
    // Scope copy is best-effort
  }
}

async function ensurePlannedMaterialsFromProposal(
  orgId: string,
  jobId: string,
  proposalId: string,
): Promise<number> {
  const db = getAdminFirestore();
  const materialsRef = db.collection(`organizations/${orgId}/jobMaterials`);
  const existingSnap = await materialsRef.where('jobId', '==', jobId).get();
  const existingKeys = new Set(
    existingSnap.docs.map((d) => {
      const data = d.data();
      return `${data.inventoryItemId}:${data.quantity}`;
    }),
  );

  const full = await getProposal360(orgId, proposalId);
  if (!full) {
    return existingSnap.docs.filter((d) => d.data().status === 'planned' || d.data().status === 'reserved')
      .length;
  }

  const packages = full.packages ?? [];
  const recommended = packages.find((p) => p.isRecommended) ?? packages[0] ?? null;

  if (!recommended?.lineItems?.length) {
    return existingSnap.docs.filter((d) => d.data().status === 'planned' || d.data().status === 'reserved')
      .length;
  }

  let added = 0;
  const now = Timestamp.now();
  for (const line of recommended.lineItems) {
    if (!line.inventoryItemId || !line.quantity || line.quantity <= 0) continue;
    const key = `${line.inventoryItemId}:${line.quantity}`;
    if (existingKeys.has(key)) continue;
    const alreadyForItem = existingSnap.docs.some((d) => d.data().inventoryItemId === line.inventoryItemId);
    if (alreadyForItem) continue;

    await materialsRef.add({
      jobId,
      proposalId,
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity,
      description: line.description ?? null,
      status: 'planned',
      organizationId: orgId,
      createdAt: now,
      updatedAt: now,
    });
    existingKeys.add(key);
    added += 1;
  }

  const after = await materialsRef.where('jobId', '==', jobId).get();
  return (
    after.docs.filter((d) => {
      const status = d.data().status;
      return status === 'planned' || status === 'reserved';
    }).length || added
  );
}
