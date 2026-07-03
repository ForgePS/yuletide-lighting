import { nanoid } from 'nanoid';
import type {
  RebookingCampaign,
  RebookingDashboard,
  RebookingRecord,
  RebookingRecordWithCustomer,
} from '@clcrm/types';
import { colCreate, colGet, colList, colUpdate, type CustomerRecord } from './firestore';
import { createProposal360, getProposal360 } from './proposals';
import { updateCustomerPipelineStage, logCustomerActivity } from './customer360';
import { triggerAutomation } from './messages360';

function campaignName(seasonYear: number) {
  return `${seasonYear} Season Rebooking`;
}

function normalizeCampaign(raw: Record<string, unknown>, orgId: string): RebookingCampaign {
  return {
    id: String(raw.id),
    organizationId: orgId,
    seasonYear: Number(raw.seasonYear),
    name: String(raw.name ?? ''),
    status: (raw.status as RebookingCampaign['status']) ?? 'draft',
    startDate: raw.startDate instanceof Date ? raw.startDate : raw.startDate ? new Date(String(raw.startDate)) : null,
    targetCustomerIds: Array.isArray(raw.targetCustomerIds) ? (raw.targetCustomerIds as string[]) : [],
    totalProjectedRevenueCents: Number(raw.totalProjectedRevenueCents ?? 0),
    totalBookedRevenueCents: Number(raw.totalBookedRevenueCents ?? 0),
    emailSubject: (raw.emailSubject as string) ?? null,
    emailBody: (raw.emailBody as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

function normalizeRecord(raw: Record<string, unknown>, orgId: string): RebookingRecord {
  return {
    id: String(raw.id),
    organizationId: orgId,
    campaignId: String(raw.campaignId),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ''),
    previousProposalId: (raw.previousProposalId as string) ?? null,
    previousJobId: (raw.previousJobId as string) ?? null,
    newProposalId: (raw.newProposalId as string) ?? null,
    status: (raw.status as RebookingRecord['status']) ?? 'not_sent',
    projectedValueCents: Number(raw.projectedValueCents ?? 0),
    bookedValueCents: Number(raw.bookedValueCents ?? 0),
    preferredInstallDate: raw.preferredInstallDate instanceof Date ? raw.preferredInstallDate : raw.preferredInstallDate ? new Date(String(raw.preferredInstallDate)) : null,
    preferredMonth: (raw.preferredMonth as string) ?? null,
    lastContactedAt: raw.lastContactedAt instanceof Date ? raw.lastContactedAt : raw.lastContactedAt ? new Date(String(raw.lastContactedAt)) : null,
    notes: (raw.notes as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

async function recalcCampaignTotals(orgId: string, campaignId: string) {
  const records = await listRebookingRecords(orgId, campaignId);
  const projected = records.reduce((s, r) => s + r.projectedValueCents, 0);
  const booked = records.filter((r) => r.status === 'rebooked').reduce((s, r) => s + r.bookedValueCents, 0);
  const targetIds = [...new Set(records.map((r) => r.customerId))];
  await colUpdate(orgId, 'rebookingCampaigns', campaignId, {
    totalProjectedRevenueCents: projected,
    totalBookedRevenueCents: booked,
    targetCustomerIds: targetIds,
  });
}

export async function listRebookingCampaigns(orgId: string): Promise<RebookingCampaign[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'rebookingCampaigns');
  return rows
    .map((r) => normalizeCampaign({ ...r, id: r.id }, orgId))
    .sort((a, b) => b.seasonYear - a.seasonYear);
}

export async function getRebookingCampaign(orgId: string, campaignId: string) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'rebookingCampaigns', campaignId);
  if (!raw) return null;
  return normalizeCampaign({ ...raw, id: campaignId }, orgId);
}

export async function createRebookingCampaign(
  orgId: string,
  input: { seasonYear: number; name?: string; startDate?: Date; emailSubject?: string; emailBody?: string },
  userId?: string | null,
) {
  const existing = (await listRebookingCampaigns(orgId)).find((c) => c.seasonYear === input.seasonYear);
  if (existing) return existing;

  const created = await colCreate(orgId, 'rebookingCampaigns', {
    organizationId: orgId,
    seasonYear: input.seasonYear,
    name: input.name ?? campaignName(input.seasonYear),
    status: 'draft',
    startDate: input.startDate ?? new Date(input.seasonYear, 7, 1),
    targetCustomerIds: [],
    totalProjectedRevenueCents: 0,
    totalBookedRevenueCents: 0,
    emailSubject: input.emailSubject ?? `Book your ${input.seasonYear} holiday lighting display`,
    emailBody: input.emailBody ?? 'We would love to install your display again this season. Reply or use your portal link to rebook with one click.',
    createdBy: userId,
    updatedBy: userId,
  }) as Record<string, unknown>;

  return normalizeCampaign({ ...created, id: created.id }, orgId);
}

export async function updateRebookingCampaign(
  orgId: string,
  campaignId: string,
  data: Partial<RebookingCampaign>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'rebookingCampaigns', campaignId, { ...data, updatedBy: userId });
  if (data.status === 'active') {
    try {
      const { fireAutomationTrigger } = await import('./automation360');
      const records = await listRebookingRecords(orgId, campaignId);
      for (const record of records.slice(0, 50)) {
        if (!record.customerId) continue;
        await fireAutomationTrigger(orgId, 'rebooking_season_begins', {
          customerId: record.customerId,
          customerName: record.customerName ?? 'Customer',
        }, userId);
      }
    } catch {
      // Best-effort batch trigger
    }
  }
  return getRebookingCampaign(orgId, campaignId);
}

export async function listRebookingRecords(orgId: string, campaignId: string): Promise<RebookingRecord[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'rebookingRecords');
  return rows
    .filter((r) => r.campaignId === campaignId)
    .map((r) => normalizeRecord({ ...r, id: r.id }, orgId));
}

export async function listRebookingRecordsDetailed(orgId: string, campaignId: string): Promise<RebookingRecordWithCustomer[]> {
  const records = await listRebookingRecords(orgId, campaignId);
  return Promise.all(
    records.map(async (record) => {
      const customer = record.customerId
        ? await colGet<CustomerRecord>(orgId, 'customers', record.customerId)
        : null;
      const proposal = record.previousProposalId
        ? await getProposal360(orgId, record.previousProposalId)
        : null;
      return {
        ...record,
        customerEmail: customer?.email ?? null,
        customerPhone: customer?.phone ?? customer?.mobilePhone ?? null,
        previousProposalTitle: proposal?.title ?? null,
      };
    }),
  );
}

function customerDisplayName(c: CustomerRecord) {
  return c.businessName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer';
}

export async function populateCampaignFromPriorSeason(orgId: string, campaignId: string, userId?: string | null) {
  const campaign = await getRebookingCampaign(orgId, campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const priorYear = campaign.seasonYear - 1;
  const [jobs, proposals, customers, existingRecords] = await Promise.all([
    colList<Record<string, unknown>>(orgId, 'jobs'),
    colList<Record<string, unknown>>(orgId, 'proposals'),
    colList<CustomerRecord>(orgId, 'customers'),
    listRebookingRecords(orgId, campaignId),
  ]);

  const existingCustomerIds = new Set(existingRecords.map((r) => r.customerId));
  const eligibleCustomerIds = new Set<string>();

  for (const job of jobs) {
    const stage = String(job.stage ?? '');
    if (!['installed', 'removed', 'complete', 'review_requested'].includes(stage)) continue;
    const d = job.installedAt ?? job.removedAt ?? job.createdAt;
    const year = d instanceof Date ? d.getFullYear() : d ? new Date(String(d)).getFullYear() : null;
    if (year === priorYear && job.customerId) eligibleCustomerIds.add(String(job.customerId));
  }

  for (const customer of customers) {
    if (['stored', 'removed', 'rebook_next_season'].includes(customer.pipelineStage ?? '')) {
      eligibleCustomerIds.add(customer.id);
    }
  }

  let added = 0;
  for (const customerId of eligibleCustomerIds) {
    if (existingCustomerIds.has(customerId)) continue;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) continue;

    const customerProposals = proposals
      .filter((p) => p.customerId === customerId)
      .sort((a, b) => {
        const da = a.createdAt instanceof Date ? a.createdAt : new Date(String(a.createdAt ?? 0));
        const db = b.createdAt instanceof Date ? b.createdAt : new Date(String(b.createdAt ?? 0));
        return db.getTime() - da.getTime();
      });
    const previousProposal = customerProposals[0];
    const customerJobs = jobs.filter((j) => j.customerId === customerId);
    const previousJob = customerJobs.find((j) => ['installed', 'removed', 'complete'].includes(String(j.stage ?? '')));

    await colCreate(orgId, 'rebookingRecords', {
      organizationId: orgId,
      campaignId,
      customerId,
      customerName: customerDisplayName(customer),
      previousProposalId: previousProposal ? String(previousProposal.id) : null,
      previousJobId: previousJob ? String(previousJob.id) : null,
      newProposalId: null,
      status: 'not_sent',
      projectedValueCents: Number(previousProposal?.subtotalCents ?? customer.pipelineEstimatedValueCents ?? 0),
      bookedValueCents: 0,
      preferredInstallDate: null,
      preferredMonth: null,
      lastContactedAt: null,
      notes: null,
      createdBy: userId,
      updatedBy: userId,
    });
    added++;
  }

  await recalcCampaignTotals(orgId, campaignId);
  return { added, total: eligibleCustomerIds.size };
}

export async function updateRebookingRecord(
  orgId: string,
  recordId: string,
  data: Partial<RebookingRecord>,
  userId?: string | null,
) {
  await colUpdate(orgId, 'rebookingRecords', recordId, { ...data, updatedBy: userId });
  const record = normalizeRecord({ ...(await colGet(orgId, 'rebookingRecords', recordId))!, id: recordId }, orgId);
  await recalcCampaignTotals(orgId, record.campaignId);
  return record;
}

export async function sendRebookingOutreach(orgId: string, recordId: string, userId?: string | null) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'rebookingRecords', recordId);
  if (!raw) throw new Error('Record not found');
  const record = normalizeRecord({ ...raw, id: recordId }, orgId);
  const campaign = await getRebookingCampaign(orgId, record.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  await colUpdate(orgId, 'rebookingRecords', recordId, {
    status: 'sent',
    lastContactedAt: new Date(),
    updatedBy: userId,
  });

  await triggerAutomation(orgId, 'august_early_booking', record.customerId, {
    seasonYear: String(campaign.seasonYear),
    customerName: record.customerName,
  }, userId).catch(() => {});

  await recalcCampaignTotals(orgId, record.campaignId);
  return updateRebookingRecord(orgId, recordId, {}, userId);
}

export async function processRebookRecord(
  orgId: string,
  recordId: string,
  opts?: { sameDesign?: boolean; upgradeRequested?: boolean; preferredMonth?: string; notes?: string; userId?: string | null },
) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'rebookingRecords', recordId);
  if (!raw) throw new Error('Record not found');
  const record = normalizeRecord({ ...raw, id: recordId }, orgId);
  const campaign = await getRebookingCampaign(orgId, record.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  let newProposalId: string | null = null;
  let bookedValueCents = record.projectedValueCents;

  if (record.previousProposalId) {
    const prev = await getProposal360(orgId, record.previousProposalId);
    if (prev) {
      const proposal = await createProposal360(orgId, {
        customerId: record.customerId,
        propertyId: prev.propertyId,
        title: `${campaign.seasonYear} Season — ${prev.title}`,
        season: String(campaign.seasonYear),
        lineItems: prev.lineItems?.map((li) => ({
          id: nanoid(),
          description: li.description,
          quantity: li.quantity,
          unitPriceCents: li.unitPriceCents,
          agreementCode: li.agreementCode ?? 'STD',
        })) ?? [],
        mockupIds: prev.mockupIds ?? [],
        scopeOfWork: prev.scopeOfWork ?? undefined,
        propertyPhotoUrl: prev.propertyPhotoUrl ?? undefined,
        installType: prev.installType ?? undefined,
        notes: opts?.upgradeRequested
          ? `Upgrade requested. ${opts.notes ?? ''}`.trim()
          : opts?.sameDesign !== false
            ? `Same design rebook from ${campaign.seasonYear - 1} season. ${opts?.notes ?? ''}`.trim()
            : opts?.notes ?? 'Rebook request',
      }, opts?.userId);
      newProposalId = proposal?.id ?? null;
      bookedValueCents = proposal?.subtotalCents ?? bookedValueCents;
    }
  }

  const status = opts?.upgradeRequested ? 'upgrade_requested' : 'rebooked';
  await colUpdate(orgId, 'rebookingRecords', recordId, {
    status,
    newProposalId,
    bookedValueCents,
    preferredMonth: opts?.preferredMonth ?? record.preferredMonth,
    notes: opts?.notes ?? record.notes,
    updatedBy: opts?.userId,
  });

  await updateCustomerPipelineStage(orgId, record.customerId, 'needs_estimate', opts?.userId, 'Rebooking');
  await logCustomerActivity(
    orgId,
    record.customerId,
    'estimate_sent',
    `Rebooked for ${campaign.seasonYear} season${newProposalId ? ' — proposal created' : ''}`,
    opts?.userId,
    'System',
  );

  await recalcCampaignTotals(orgId, record.campaignId);
  return { recordId, newProposalId, status, bookedValueCents };
}

export async function processPortalRebook(
  orgId: string,
  customerId: string,
  input: { sameDesign?: boolean; upgradeRequested?: boolean; preferredMonth?: string; notes?: string },
) {
  const campaigns = await listRebookingCampaigns(orgId);
  const active = campaigns.find((c) => c.status === 'active') ?? campaigns[0];
  if (!active) {
    const year = new Date().getFullYear();
    const campaign = await createRebookingCampaign(orgId, { seasonYear: year });
    await populateCampaignFromPriorSeason(orgId, campaign.id);
    return processPortalRebook(orgId, customerId, input);
  }

  let records = await listRebookingRecords(orgId, active.id);
  let record = records.find((r) => r.customerId === customerId);
  if (!record) {
    await populateCampaignFromPriorSeason(orgId, active.id);
    records = await listRebookingRecords(orgId, active.id);
    record = records.find((r) => r.customerId === customerId);
  }
  if (!record) throw new Error('No prior season record found for rebooking');

  return processRebookRecord(orgId, record.id, {
    sameDesign: input.sameDesign,
    upgradeRequested: input.upgradeRequested,
    preferredMonth: input.preferredMonth,
    notes: input.notes,
  });
}

export async function getRebookingDashboard(orgId: string): Promise<RebookingDashboard> {
  const campaigns = await listRebookingCampaigns(orgId);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const allRecords = await colList<Record<string, unknown>>(orgId, 'rebookingRecords');
  const records = allRecords.map((r) => normalizeRecord({ ...r, id: r.id }, orgId));

  const notSent = records.filter((r) => r.status === 'not_sent').length;
  const sent = records.filter((r) => ['sent', 'opened'].includes(r.status)).length;
  const rebooked = records.filter((r) => ['rebooked', 'upgrade_requested'].includes(r.status)).length;
  const declined = records.filter((r) => r.status === 'declined').length;
  const projectedRevenueCents = records.reduce((s, r) => s + r.projectedValueCents, 0);
  const bookedRevenueCents = records.filter((r) => r.status === 'rebooked' || r.status === 'upgrade_requested').reduce((s, r) => s + r.bookedValueCents, 0);
  const contacted = records.filter((r) => r.status !== 'not_sent').length;

  return {
    activeCampaigns,
    totalTargets: records.length,
    notSent,
    sent,
    rebooked,
    declined,
    projectedRevenueCents,
    bookedRevenueCents,
    conversionRatePercent: contacted ? Math.round((rebooked / contacted) * 100) : 0,
  };
}

export async function getPortalRebookContext(orgId: string, customerId: string) {
  const proposals = await colList<{ id: string; customerId?: string; title?: string; subtotalCents?: number; mockupIds?: string[]; createdAt?: Date }>(orgId, 'proposals');
  const previous = proposals
    .filter((p) => p.customerId === customerId)
    .sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())[0];
  return {
    hasPreviousSeason: Boolean(previous),
    previousProposalTitle: previous?.title ?? null,
    projectedValueCents: Number(previous?.subtotalCents ?? 0),
  };
}
