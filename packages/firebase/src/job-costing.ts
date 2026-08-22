import { colGet, colList, colUpdate } from './firestore';

export type JobCostingResult = {
  jobId: string;
  customerId?: string;
  revenueCents: number;
  laborCostCents: number;
  materialCostCents: number;
  estimatedLaborCostCents?: number;
  grossProfitCents: number;
  marginPercent: number;
  actualLaborHours: number;
};

type JobDoc = {
  id: string;
  customerId?: string;
  proposalId?: string | null;
  subtotalCents?: number | null;
};

type TimeEntryDoc = {
  id: string;
  jobId?: string | null;
  laborCostCents?: number | null;
  hours?: number | null;
  clockIn?: Date | null;
  clockOut?: Date | null;
  breakMinutes?: number | null;
};

type JobMaterialDoc = {
  id: string;
  jobId: string;
  inventoryItemId: string;
  quantity: number;
  status: string;
  unitCostCentsAtConsume?: number | null;
};

type InventoryItemDoc = {
  id: string;
  unitCostCents?: number | null;
  costCents?: number | null;
};

type InvoiceDoc = {
  id: string;
  proposalId?: string | null;
  amountPaidCents?: number | null;
  status?: string;
};

type ProposalDoc = {
  id: string;
  pricing?: { laborCostCents?: number | null } | null;
  laborCostCents?: number | null;
};

function entryHours(entry: TimeEntryDoc): number {
  if (typeof entry.hours === 'number' && Number.isFinite(entry.hours)) {
    return Math.max(0, entry.hours);
  }
  if (entry.clockIn && entry.clockOut) {
    const elapsedMs = Math.max(0, entry.clockOut.getTime() - entry.clockIn.getTime());
    const breakMs = Math.max(0, entry.breakMinutes ?? 0) * 60_000;
    return Math.round((Math.max(0, elapsedMs - breakMs) / 36_000) / 100) / 100;
  }
  return 0;
}

function inventoryUnitCost(item: InventoryItemDoc | null | undefined): number {
  if (!item) return 0;
  return Number(item.unitCostCents ?? item.costCents ?? 0);
}

function marginPercent(revenueCents: number, grossProfitCents: number): number {
  if (revenueCents <= 0) return 0;
  return Math.round((grossProfitCents / revenueCents) * 1000) / 10;
}

export async function computeJobCosting(orgId: string, jobId: string): Promise<JobCostingResult> {
  const job = await colGet<JobDoc>(orgId, 'jobs', jobId);
  if (!job) {
    return {
      jobId,
      revenueCents: 0,
      laborCostCents: 0,
      materialCostCents: 0,
      grossProfitCents: 0,
      marginPercent: 0,
      actualLaborHours: 0,
    };
  }

  const [materials, inventoryItems, invoices, timeEntries, timeEntries360, proposal] = await Promise.all([
    colList<JobMaterialDoc>(orgId, 'jobMaterials'),
    colList<InventoryItemDoc>(orgId, 'inventoryItems'),
    colList<InvoiceDoc>(orgId, 'invoices'),
    colList<TimeEntryDoc>(orgId, 'timeEntries'),
    colList<TimeEntryDoc>(orgId, 'timeEntries360'),
    job.proposalId ? colGet<ProposalDoc>(orgId, 'proposals', job.proposalId) : Promise.resolve(null),
  ]);

  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));

  let revenueCents = Number(job.subtotalCents ?? 0);
  if (!revenueCents && job.proposalId) {
    revenueCents = invoices
      .filter((inv) => inv.proposalId === job.proposalId && Number(inv.amountPaidCents ?? 0) > 0)
      .reduce((sum, inv) => sum + Number(inv.amountPaidCents ?? 0), 0);
  }

  const jobTimeEntries = [...timeEntries, ...timeEntries360].filter((entry) => entry.jobId === jobId);
  const laborCostCents = jobTimeEntries.reduce((sum, entry) => sum + Number(entry.laborCostCents ?? 0), 0);
  const actualLaborHours =
    Math.round(jobTimeEntries.reduce((sum, entry) => sum + entryHours(entry), 0) * 100) / 100;

  const materialCostCents = materials
    .filter((mat) => mat.jobId === jobId && mat.status === 'consumed')
    .reduce((sum, mat) => {
      const unitCost =
        mat.unitCostCentsAtConsume != null
          ? Number(mat.unitCostCentsAtConsume)
          : inventoryUnitCost(inventoryById.get(mat.inventoryItemId));
      return sum + Math.round(Number(mat.quantity ?? 0) * unitCost);
    }, 0);

  const estimatedLaborCostCents =
    proposal?.pricing?.laborCostCents != null
      ? Number(proposal.pricing.laborCostCents)
      : proposal?.laborCostCents != null
        ? Number(proposal.laborCostCents)
        : undefined;

  const grossProfitCents = revenueCents - laborCostCents - materialCostCents;

  return {
    jobId,
    customerId: job.customerId,
    revenueCents,
    laborCostCents,
    materialCostCents,
    estimatedLaborCostCents,
    grossProfitCents,
    marginPercent: marginPercent(revenueCents, grossProfitCents),
    actualLaborHours,
  };
}

export async function recomputeAndStoreJobCosting(orgId: string, jobId: string): Promise<JobCostingResult> {
  const costing = await computeJobCosting(orgId, jobId);
  await colUpdate(orgId, 'jobs', jobId, {
    actualLaborCostCents: costing.laborCostCents,
    actualMaterialCostCents: costing.materialCostCents,
    actualLaborHours: costing.actualLaborHours,
    grossProfitCents: costing.grossProfitCents,
    marginPercent: costing.marginPercent,
    jobCostingUpdatedAt: new Date(),
  });
  return costing;
}

/** Batch helper for reports — loads shared collections once per org. */
export async function aggregateJobCostings(
  orgId: string,
  opts: { jobIds?: string[] } = {},
): Promise<{
  results: JobCostingResult[];
  revenueCents: number;
  laborCostCents: number;
  materialCostCents: number;
  grossProfitCents: number;
  marginPercent: number;
  actualLaborHours: number;
}> {
  const [jobs, materials, inventoryItems, invoices, timeEntries, timeEntries360, proposals] = await Promise.all([
    colList<JobDoc>(orgId, 'jobs'),
    colList<JobMaterialDoc>(orgId, 'jobMaterials'),
    colList<InventoryItemDoc>(orgId, 'inventoryItems'),
    colList<InvoiceDoc>(orgId, 'invoices'),
    colList<TimeEntryDoc>(orgId, 'timeEntries'),
    colList<TimeEntryDoc>(orgId, 'timeEntries360'),
    colList<ProposalDoc>(orgId, 'proposals'),
  ]);

  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const proposalsById = new Map(proposals.map((p) => [p.id, p]));
  const jobIdSet = opts.jobIds ? new Set(opts.jobIds) : null;

  let scopedJobs = jobs;
  if (jobIdSet) scopedJobs = scopedJobs.filter((j) => jobIdSet.has(j.id));

  const allTimeEntries = [...timeEntries, ...timeEntries360];
  const results: JobCostingResult[] = scopedJobs.map((job) => {
    let revenueCents = Number(job.subtotalCents ?? 0);
    if (!revenueCents && job.proposalId) {
      revenueCents = invoices
        .filter((inv) => inv.proposalId === job.proposalId && Number(inv.amountPaidCents ?? 0) > 0)
        .reduce((sum, inv) => sum + Number(inv.amountPaidCents ?? 0), 0);
    }

    const jobTimeEntries = allTimeEntries.filter((entry) => entry.jobId === job.id);
    const laborCostCents = jobTimeEntries.reduce((sum, entry) => sum + Number(entry.laborCostCents ?? 0), 0);
    const actualLaborHours =
      Math.round(jobTimeEntries.reduce((sum, entry) => sum + entryHours(entry), 0) * 100) / 100;

    const materialCostCents = materials
      .filter((mat) => mat.jobId === job.id && mat.status === 'consumed')
      .reduce((sum, mat) => {
        const unitCost =
          mat.unitCostCentsAtConsume != null
            ? Number(mat.unitCostCentsAtConsume)
            : inventoryUnitCost(inventoryById.get(mat.inventoryItemId));
        return sum + Math.round(Number(mat.quantity ?? 0) * unitCost);
      }, 0);

    const proposal = job.proposalId ? proposalsById.get(job.proposalId) : undefined;
    const estimatedLaborCostCents =
      proposal?.pricing?.laborCostCents != null
        ? Number(proposal.pricing.laborCostCents)
        : proposal?.laborCostCents != null
          ? Number(proposal.laborCostCents)
          : undefined;

    const grossProfitCents = revenueCents - laborCostCents - materialCostCents;
    return {
      jobId: job.id,
      customerId: job.customerId,
      revenueCents,
      laborCostCents,
      materialCostCents,
      estimatedLaborCostCents,
      grossProfitCents,
      marginPercent: marginPercent(revenueCents, grossProfitCents),
      actualLaborHours,
    };
  });

  const revenueCents = results.reduce((s, r) => s + r.revenueCents, 0);
  const laborCostCents = results.reduce((s, r) => s + r.laborCostCents, 0);
  const materialCostCents = results.reduce((s, r) => s + r.materialCostCents, 0);
  const grossProfitCents = results.reduce((s, r) => s + r.grossProfitCents, 0);
  const actualLaborHours = Math.round(results.reduce((s, r) => s + r.actualLaborHours, 0) * 100) / 100;

  return {
    results,
    revenueCents,
    laborCostCents,
    materialCostCents,
    grossProfitCents,
    marginPercent: marginPercent(revenueCents, grossProfitCents),
    actualLaborHours,
  };
}
