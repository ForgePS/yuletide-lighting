import { nanoid } from 'nanoid';
import type {
  AiProposalAssist,
  CustomerStage,
  InstallType,
  PackageTier,
  PricingComponents,
  ProposalAnalytics,
  ProposalApproval,
  ProposalListItem,
  ProposalPackage,
  ProposalRecord,
  ProposalStatus,
  ProposalTemplate,
  ProposalView,
  UpsellSuggestion,
} from '@clcrm/types';
import { normalizeProposalStatus, PROPOSAL_PIPELINE_STATUSES } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colDelete, colGet, colList, colUpdate, getByPublicToken, getOrganization, updateCustomer } from './firestore';
import { updateCustomerPipelineStage } from './customer360';
import { getBrandingForCustomerFacing, getProposalSettings, getSeasonSettings } from './settings360';

function ts() {
  return Timestamp.now();
}

const PROPOSAL_STATUS_TO_PIPELINE: Partial<Record<ProposalStatus, CustomerStage>> = {
  sent: 'proposal_sent',
  viewed: 'proposal_viewed',
  customer_questions: 'proposal_viewed',
  approved: 'approved',
  deposit_paid: 'deposit_paid',
  scheduled: 'scheduled',
  rejected: 'lost',
  expired: 'lost',
};

async function syncCustomerPipelineFromProposal(
  orgId: string,
  customerId: string,
  status: ProposalStatus,
  opts?: { estimatedValueCents?: number; userId?: string | null; userName?: string | null },
) {
  const normalized = normalizeProposalStatus(status);
  const stage = PROPOSAL_STATUS_TO_PIPELINE[normalized];
  if (stage) {
    await updateCustomerPipelineStage(orgId, customerId, stage, opts?.userId, opts?.userName ?? 'System');
  }
  if (opts?.estimatedValueCents != null) {
    await updateCustomer(orgId, customerId, { pipelineEstimatedValueCents: opts.estimatedValueCents });
  }
}

function proposalPath(orgId: string, proposalId: string) {
  return `organizations/${orgId}/proposals/${proposalId}`;
}

function subPath(orgId: string, proposalId: string, sub: string) {
  return `${proposalPath(orgId, proposalId)}/${sub}`;
}

const DEFAULT_PRICING: PricingComponents = {
  linearFootage: 0,
  treeWrapCount: 0,
  garlandLengthFt: 0,
  wreathCount: 0,
  specialtyDecorCount: 0,
  laborHours: 0,
  equipmentChargeCents: 0,
  travelChargeCents: 0,
  materialCostCents: 0,
  laborCostCents: 0,
};

export function calculatePricingFromComponents(pricing: PricingComponents) {
  const materialCostCents =
    pricing.materialCostCents ||
    Math.round(pricing.linearFootage * 350 + pricing.treeWrapCount * 8500 + pricing.garlandLengthFt * 450 + pricing.wreathCount * 12000 + pricing.specialtyDecorCount * 5000);
  const laborCostCents = pricing.laborCostCents || Math.round(pricing.laborHours * 7500);
  const totalCost = materialCostCents + laborCostCents + pricing.equipmentChargeCents + pricing.travelChargeCents;
  const salesPriceCents = Math.round(totalCost * 1.45);
  const grossProfitCents = salesPriceCents - totalCost;
  const grossMarginPercent = salesPriceCents > 0 ? Math.round((grossProfitCents / salesPriceCents) * 100) : 0;
  return { materialCostCents, laborCostCents, salesPriceCents, grossProfitCents, grossMarginPercent, totalCostCents: totalCost };
}

export function calculateUpsells(proposal: Partial<ProposalRecord>, installType?: InstallType | null): { suggestions: UpsellSuggestion[]; totalPotentialCents: number } {
  const suggestions: UpsellSuggestion[] = [];
  const p = proposal.pricing ?? DEFAULT_PRICING;
  if ((p.treeWrapCount ?? 0) < 2) suggestions.push({ label: 'Tree wraps', potentialCents: 85000 });
  if ((p.linearFootage ?? 0) < 100) suggestions.push({ label: 'Additional rooflines', potentialCents: 65000 });
  if ((p.garlandLengthFt ?? 0) === 0) suggestions.push({ label: 'Garland', potentialCents: 45000 });
  if ((p.wreathCount ?? 0) === 0) suggestions.push({ label: 'Wreaths', potentialCents: 35000 });
  suggestions.push({ label: 'Pathway lighting', potentialCents: 55000 });
  if (installType !== 'permanent_lighting') suggestions.push({ label: 'Permanent lighting', potentialCents: 250000 });
  suggestions.push({ label: 'Storage service', potentialCents: 25000 });
  const totalPotentialCents = suggestions.slice(0, 4).reduce((s, u) => s + u.potentialCents, 0);
  return { suggestions, totalPotentialCents };
}

export function generateAiAssist(input: {
  customerName: string;
  propertyAddress: string;
  installType?: string | null;
  pricing?: PricingComponents;
}): AiProposalAssist {
  const calc = calculatePricingFromComponents(input.pricing ?? DEFAULT_PRICING);
  const install = input.installType?.replace(/_/g, ' ') ?? 'holiday lighting';
  return {
    scopeOfWork: `Professional ${install} installation including design consultation, premium LED materials, professional installation, timer setup, season maintenance, and takedown service.`,
    customerSummary: `${input.customerName} — ${input.propertyAddress}. Ideal candidate for full-season holiday lighting.`,
    proposalDescription: `Custom ${install} package tailored for your property with professional installation and warranty coverage.`,
    followUpEmail: `Hi ${input.customerName.split(' ')[0]},\n\nThank you for reviewing your holiday lighting proposal. I'm happy to answer any questions or schedule a walkthrough.\n\nBest regards`,
    contractLanguage: `Client agrees to scope of work as described. 50% deposit due upon approval. Remaining balance due upon completion. Cancellation within 48 hours of install date subject to fee.`,
    suggestedPriceCents: calc.salesPriceCents,
    suggestedUpsells: ['Tree wraps', 'Garland', 'Storage renewal'],
    suggestedWarranty: '2-season workmanship warranty on all installations',
    suggestedDepositPercent: 50,
  };
}

function packageFromInput(proposalId: string, pkg: Omit<ProposalPackage, 'id' | 'proposalId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'subtotalCents' | 'materialCostCents' | 'laborCostCents' | 'grossProfitCents' | 'grossMarginPercent'>): Omit<ProposalPackage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> {
  const lineItems = (pkg.lineItems ?? []).map((li) => ({ ...li, id: li.id ?? nanoid() }));
  const subtotalFromItems = lineItems.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  const calc = calculatePricingFromComponents(pkg.pricing ?? DEFAULT_PRICING);
  const subtotalCents = subtotalFromItems > 0 ? subtotalFromItems : calc.salesPriceCents;
  return {
    proposalId,
    tier: pkg.tier,
    name: pkg.name,
    label: pkg.label,
    description: pkg.description ?? null,
    lineItems,
    products: pkg.products ?? [],
    decorations: pkg.decorations ?? [],
    laborDescription: pkg.laborDescription ?? null,
    addOns: pkg.addOns ?? [],
    warranty: pkg.warranty ?? null,
    subtotalCents,
    materialCostCents: calc.materialCostCents,
    laborCostCents: calc.laborCostCents,
    grossProfitCents: subtotalCents - calc.totalCostCents,
    grossMarginPercent: subtotalCents > 0 ? Math.round(((subtotalCents - calc.totalCostCents) / subtotalCents) * 100) : 0,
    isRecommended: pkg.isRecommended ?? false,
    pricing: pkg.pricing ?? DEFAULT_PRICING,
  };
}

async function subList<T>(orgId: string, proposalId: string, sub: string): Promise<T[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(subPath(orgId, proposalId, sub)).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as T);
}

async function subCreate<T extends Record<string, unknown>>(orgId: string, proposalId: string, sub: string, data: T, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(subPath(orgId, proposalId, sub)).doc();
  const now = ts();
  await ref.set({ proposalId, ...data, createdAt: now, updatedAt: now, createdBy: userId ?? null, updatedBy: userId ?? null });
  const snap = await ref.get();
  return mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as T & { id: string };
}

export async function listProposals360(orgId: string): Promise<ProposalListItem[]> {
  const proposals = await colList<ProposalRecord>(orgId, 'proposals');
  const customers = await colList<{ id: string; firstName: string; lastName: string; businessName?: string | null }>(orgId, 'customers');
  const properties = await colList<{ id: string; addressLine1: string; city: string; state: string }>(orgId, 'properties');

  return proposals.map((p) => {
    const customer = customers.find((c) => c.id === p.customerId);
    const property = properties.find((pr) => pr.id === p.propertyId);
    return {
      ...normalizeProposalRecord(p),
      customerName: customer?.businessName || (customer ? `${customer.firstName} ${customer.lastName}` : undefined),
      propertyAddress: property ? `${property.addressLine1}, ${property.city}, ${property.state}` : undefined,
    };
  });
}

export function normalizeProposalRecord(p: ProposalRecord): ProposalRecord {
  return {
    ...p,
    status: normalizeProposalStatus(p.status),
    pricing: p.pricing ?? DEFAULT_PRICING,
    mockupIds: p.mockupIds ?? [],
    financingOption: p.financingOption ?? 'deposit_50',
    depositPercent: p.depositPercent ?? 50,
    depositAmountCents: p.depositAmountCents ?? 0,
    depositStatus: p.depositStatus ?? 'pending',
    followUpAutomationEnabled: p.followUpAutomationEnabled ?? true,
    upsellSuggestions: p.upsellSuggestions ?? [],
    upsellPotentialCents: p.upsellPotentialCents ?? 0,
    lineItems: p.lineItems ?? [],
    agreementOptions: p.agreementOptions ?? [],
  };
}

export async function getProposal360(orgId: string, proposalId: string) {
  const proposal = await colGet<ProposalRecord>(orgId, 'proposals', proposalId);
  if (!proposal) return null;
  const [packages, views, approvals] = await Promise.all([
    subList<ProposalPackage>(orgId, proposalId, 'packages'),
    subList<ProposalView>(orgId, proposalId, 'views'),
    subList<ProposalApproval>(orgId, proposalId, 'approvals'),
  ]);
  return { ...normalizeProposalRecord(proposal), packages, views, approvals };
}

export async function createProposal360(
  orgId: string,
  input: {
    customerId: string;
    propertyId: string;
    title: string;
    salespersonName?: string | null;
    installType?: InstallType | null;
    season?: string | null;
    scopeOfWork?: string | null;
    agreementMode?: 'single' | 'multi';
    agreementOptions?: ProposalRecord['agreementOptions'];
    lineItems?: ProposalRecord['lineItems'];
    notes?: string | null;
    validUntil?: Date | null;
    designId?: string | null;
    propertyPhotoUrl?: string | null;
    mockupIds?: string[];
    pricing?: PricingComponents;
    financingOption?: ProposalRecord['financingOption'];
    depositPercent?: number;
    installDate?: Date | null;
    removalDate?: Date | null;
    termsAndConditions?: string | null;
    packages?: Array<Omit<ProposalPackage, 'id' | 'proposalId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'subtotalCents' | 'materialCostCents' | 'laborCostCents' | 'grossProfitCents' | 'grossMarginPercent'>>;
  },
  userId?: string | null,
) {
  const [proposalSettings, seasonSettings] = await Promise.all([
    getProposalSettings(orgId, userId),
    getSeasonSettings(orgId, userId),
  ]);
  const depositPercent = input.depositPercent ?? proposalSettings.defaultDepositPercent;
  const validUntil = input.validUntil ?? (() => {
    const date = new Date();
    date.setDate(date.getDate() + proposalSettings.defaultExpirationDays);
    return date;
  })();
  const termsAndConditions = input.termsAndConditions ?? proposalSettings.defaultTerms ?? null;
  const season = input.season ?? String(seasonSettings.seasonYear);

  const pricing = input.pricing ?? DEFAULT_PRICING;
  const lineItems = (input.lineItems ?? []).map((li) => ({ ...li, id: li.id ?? nanoid() }));
  const calc = calculatePricingFromComponents(pricing);
  const subtotalCents = lineItems.length > 0 ? lineItems.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0) : calc.salesPriceCents;
  const upsells = calculateUpsells({ pricing, subtotalCents }, input.installType);

  const proposal = await colCreate(orgId, 'proposals', {
    customerId: input.customerId,
    propertyId: input.propertyId,
    title: input.title,
    status: 'draft',
    salespersonName: input.salespersonName ?? null,
    installType: input.installType ?? null,
    season,
    scopeOfWork: input.scopeOfWork ?? null,
    agreementMode: input.agreementMode ?? 'single',
    agreementOptions: input.agreementOptions ?? [],
    lineItems,
    subtotalCents,
    notes: input.notes ?? null,
    validUntil,
    publicToken: nanoid(32),
    viewCount: 0,
    mockupIds: input.mockupIds ?? [],
    designId: input.designId ?? null,
    propertyPhotoUrl: input.propertyPhotoUrl ?? null,
    pricing,
    financingOption: input.financingOption ?? 'deposit_50',
    depositPercent,
    depositAmountCents: Math.round(subtotalCents * (depositPercent / 100)),
    depositStatus: 'pending',
    installDate: input.installDate ?? null,
    removalDate: input.removalDate ?? null,
    termsAndConditions,
    followUpAutomationEnabled: true,
    upsellSuggestions: upsells.suggestions.map((s) => s.label),
    upsellPotentialCents: upsells.totalPotentialCents,
  });

  const packages = input.packages?.length
    ? input.packages
    : [
        { tier: 'basic' as PackageTier, name: 'Basic', label: 'Package A — Basic', isRecommended: false, lineItems: [], products: [], decorations: [], addOns: [], pricing },
        { tier: 'recommended' as PackageTier, name: 'Recommended', label: 'Package B — Recommended', isRecommended: true, lineItems: [], products: [], decorations: [], addOns: [], pricing: { ...pricing, linearFootage: pricing.linearFootage * 1.2 } },
        { tier: 'premium' as PackageTier, name: 'Premium', label: 'Package C — Premium', isRecommended: false, lineItems: [], products: [], decorations: [], addOns: [], pricing: { ...pricing, linearFootage: pricing.linearFootage * 1.5, treeWrapCount: pricing.treeWrapCount + 2 } },
      ];

  const createdPackages: ProposalPackage[] = [];
  for (const pkg of packages) {
    const built = packageFromInput(proposal.id, pkg as never);
    const saved = await subCreate(orgId, proposal.id, 'packages', built, userId);
    createdPackages.push(saved as ProposalPackage);
  }

  const recommended = createdPackages.find((p) => p.isRecommended) ?? createdPackages[1];
  if (recommended) {
    await colUpdate(orgId, 'proposals', proposal.id, { selectedPackageId: recommended.id, subtotalCents: recommended.subtotalCents });
  }

  await colCreate(orgId, 'jobs', {
    customerId: input.customerId,
    propertyId: input.propertyId,
    proposalId: proposal.id,
    title: input.title,
    stage: 'draft_proposal',
  });

  await updateCustomerPipelineStage(orgId, input.customerId, 'needs_estimate', userId, 'System');

  return getProposal360(orgId, proposal.id);
}

export async function updateProposal360(orgId: string, proposalId: string, data: Record<string, unknown>, userId?: string | null) {
  const patch: Record<string, unknown> = { ...data, updatedBy: userId ?? null };
  if (data.pricing) {
    const calc = calculatePricingFromComponents(data.pricing as PricingComponents);
    if (!data.lineItems) patch.subtotalCents = calc.salesPriceCents;
  }
  if (data.lineItems && Array.isArray(data.lineItems)) {
    patch.subtotalCents = (data.lineItems as Array<{ quantity: number; unitPriceCents: number }>).reduce(
      (s, i) => s + i.quantity * i.unitPriceCents,
      0,
    );
    if (data.depositPercent != null) {
      patch.depositAmountCents = Math.round((patch.subtotalCents as number) * (Number(data.depositPercent) / 100));
    }
  }
  await colUpdate(orgId, 'proposals', proposalId, patch);
  return getProposal360(orgId, proposalId);
}

export async function deleteProposal360(orgId: string, proposalId: string) {
  const jobs = await colList<{ id: string; proposalId?: string | null }>(orgId, 'jobs');
  await Promise.all(
    jobs
      .filter((job) => job.proposalId === proposalId)
      .map((job) => colDelete(orgId, 'jobs', job.id)),
  );
  await colDelete(orgId, 'proposals', proposalId);
}

export async function updateProposalStatus(orgId: string, proposalId: string, status: ProposalStatus, userId?: string | null) {
  const proposal = await colGet<ProposalRecord>(orgId, 'proposals', proposalId);
  if (!proposal) return null;

  const normalized = normalizeProposalStatus(status);
  const patch: Record<string, unknown> = { status: normalized === 'approved' ? 'approved' : normalized };
  if (normalized === 'sent') patch.sentAt = new Date();
  if (normalized === 'viewed') patch.openDate = new Date();
  await colUpdate(orgId, 'proposals', proposalId, patch);

  const jobs = await colList<{ id: string; proposalId: string }>(orgId, 'jobs');
  const job = jobs.find((j) => j.proposalId === proposalId);
  if (job) {
    const stageMap: Partial<Record<ProposalStatus, string>> = {
      sent: 'sent_proposal',
      viewed: 'sent_proposal',
      approved: 'accepted_proposal',
      deposit_paid: 'deposit_paid',
      scheduled: 'scheduled',
    };
    if (stageMap[normalized]) await colUpdate(orgId, 'jobs', job.id, { stage: stageMap[normalized] });
  }

  await syncCustomerPipelineFromProposal(orgId, proposal.customerId, normalized, {
    estimatedValueCents: normalized === 'approved' ? proposal.subtotalCents : undefined,
    userId,
  });

  try {
    const { fireAutomationTrigger } = await import('./automation360');
    const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', proposal.customerId);
    const customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Customer';
    const ctx = {
      customerId: proposal.customerId,
      customerName,
      proposalId,
      vars: { customerName, proposalNumber: proposal.proposalNumber ?? proposalId },
    };
    if (normalized === 'sent') await fireAutomationTrigger(orgId, 'proposal_sent', ctx, userId);
    if (normalized === 'viewed') await fireAutomationTrigger(orgId, 'proposal_viewed', ctx, userId);
    if (normalized === 'approved') await fireAutomationTrigger(orgId, 'proposal_accepted', ctx, userId);
  } catch {
    // Best-effort automations
  }

  return getProposal360(orgId, proposalId);
}

export async function sendProposal360(orgId: string, proposalId: string, userId?: string | null) {
  return updateProposalStatus(orgId, proposalId, 'sent', userId);
}

export async function getProposalByToken(token: string, meta?: { userAgent?: string; device?: string; ip?: string }) {
  const proposal = await getByPublicToken<ProposalRecord & { organizationId: string }>('proposals', token);
  if (!proposal) return null;
  const orgId = proposal.organizationId;
  const normalized = normalizeProposalRecord(proposal);
  const newStatus = ['sent', 'ready_to_send'].includes(normalized.status) ? 'viewed' : normalized.status;
  await colUpdate(orgId, 'proposals', proposal.id, {
    viewCount: (proposal.viewCount ?? 0) + 1,
    lastViewedAt: new Date(),
    openDate: proposal.openDate ?? new Date(),
    status: newStatus,
  });
  if (newStatus === 'viewed') {
    await syncCustomerPipelineFromProposal(orgId, proposal.customerId, 'viewed');
    try {
      const { fireAutomationTrigger } = await import('./automation360');
      const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', proposal.customerId);
      await fireAutomationTrigger(orgId, 'proposal_viewed', {
        customerId: proposal.customerId,
        customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Customer',
        proposalId: proposal.id,
      });
    } catch {
      // Best-effort
    }
  }
  await subCreate(orgId, proposal.id, 'views', {
    viewedAt: new Date(),
    device: meta?.device ?? null,
    userAgent: meta?.userAgent ?? null,
    ipAddress: meta?.ip ?? null,
  });

  const [full, customer, property, organization, packages, branding] = await Promise.all([
    getProposal360(orgId, proposal.id),
    colGet<{ firstName: string; lastName: string; businessName?: string | null }>(orgId, 'customers', proposal.customerId),
    colGet<{ addressLine1: string; city: string; state: string; postalCode: string }>(orgId, 'properties', proposal.propertyId),
    getOrganization(orgId),
    subList<ProposalPackage>(orgId, proposal.id, 'packages'),
    getBrandingForCustomerFacing(orgId),
  ]);

  let mockups: Array<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null }> = [];
  if (proposal.mockupIds?.length) {
    mockups = (await Promise.all(proposal.mockupIds.map((id) => colGet<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null }>(orgId, 'mockups', id)))).filter(Boolean) as typeof mockups;
  }

  return {
    proposal: full,
    customer,
    property,
    organization: organization
      ? { ...organization, companyName: branding.companyName, brandColor: branding.brandColor, logoUrl: branding.logoUrl }
      : null,
    packages,
    mockups,
  };
}

export async function recordPublicApproval(
  token: string,
  input: {
    action: 'approved' | 'rejected' | 'changes_requested';
    customerName: string;
    signatureData?: string | null;
    packageId?: string | null;
    agreementCode?: string | null;
    notes?: string | null;
    ipAddress?: string | null;
  },
) {
  const proposal = await getByPublicToken<ProposalRecord & { organizationId: string }>('proposals', token);
  if (!proposal) return null;
  const orgId = proposal.organizationId;
  const statusMap = { approved: 'approved', rejected: 'rejected', changes_requested: 'customer_questions' } as const;
  const patch: Record<string, unknown> = {
    status: statusMap[input.action],
    acceptedByName: input.customerName,
  };
  if (input.action === 'approved') {
    patch.acceptedAt = new Date();
    patch.selectedAgreementCode = input.agreementCode ?? null;
    patch.selectedPackageId = input.packageId ?? proposal.selectedPackageId ?? null;
    if (input.packageId) {
      const pkg = await getAdminFirestore().doc(`${subPath(orgId, proposal.id, 'packages')}/${input.packageId}`).get();
      if (pkg.exists) patch.subtotalCents = (pkg.data() as ProposalPackage).subtotalCents;
    }
    patch.depositAmountCents = Math.round((patch.subtotalCents as number ?? proposal.subtotalCents) * (proposal.depositPercent / 100));
    patch.contractGeneratedAt = new Date();
    patch.contractUrl = `https://contracts.yuletidelighting.com/${proposal.id}`;
  }
  await colUpdate(orgId, 'proposals', proposal.id, patch);
  await subCreate(orgId, proposal.id, 'approvals', {
    action: input.action,
    customerName: input.customerName,
    signatureData: input.signatureData ?? null,
    ipAddress: input.ipAddress ?? null,
    packageId: input.packageId ?? null,
    agreementCode: input.agreementCode ?? null,
    notes: input.notes ?? null,
    approvedAt: new Date(),
  });

  if (input.action === 'approved') {
    const jobs = await colList<{ id: string; proposalId: string }>(orgId, 'jobs');
    const job = jobs.find((j) => j.proposalId === proposal.id);
    if (job) await colUpdate(orgId, 'jobs', job.id, { stage: 'accepted_proposal' });
    const subtotal = (patch.subtotalCents as number | undefined) ?? proposal.subtotalCents;
    await syncCustomerPipelineFromProposal(orgId, proposal.customerId, 'approved', {
      estimatedValueCents: subtotal,
    });
  } else if (input.action === 'rejected') {
    await syncCustomerPipelineFromProposal(orgId, proposal.customerId, 'rejected');
  }

  return getProposal360(orgId, proposal.id);
}

export async function collectDeposit(orgId: string, proposalId: string, amountCents?: number) {
  const proposal = await colGet<ProposalRecord>(orgId, 'proposals', proposalId);
  if (!proposal) return null;
  const amount = amountCents ?? proposal.depositAmountCents ?? Math.round(proposal.subtotalCents * (proposal.depositPercent / 100));
  await colUpdate(orgId, 'proposals', proposalId, {
    depositStatus: 'paid',
    depositAmountCents: amount,
    status: 'deposit_paid',
  });
  const jobs = await colList<{ id: string; proposalId: string }>(orgId, 'jobs');
  const job = jobs.find((j) => j.proposalId === proposalId);
  if (job) await colUpdate(orgId, 'jobs', job.id, { stage: 'deposit_paid' });
  return getProposal360(orgId, proposalId);
}

export async function getProposalAnalytics(orgId: string): Promise<ProposalAnalytics> {
  const proposals = (await colList<ProposalRecord>(orgId, 'proposals')).map(normalizeProposalRecord);
  const countBy = (statuses: ProposalStatus[]) => proposals.filter((p) => statuses.includes(p.status)).length;

  const approved = proposals.filter((p) => ['approved', 'deposit_paid', 'scheduled'].includes(p.status));
  const rejected = proposals.filter((p) => p.status === 'rejected');
  const sent = proposals.filter((p) => !['draft', 'internal_review'].includes(p.status));

  const revenueWonCents = approved.reduce((s, p) => s + p.subtotalCents, 0);
  const revenueLostCents = rejected.reduce((s, p) => s + p.subtotalCents, 0);
  const totalProposalRevenueCents = proposals.reduce((s, p) => s + p.subtotalCents, 0);

  const closeTimes = approved
    .filter((p) => p.sentAt && p.acceptedAt)
    .map((p) => (new Date(p.acceptedAt!).getTime() - new Date(p.sentAt!).getTime()) / 86400000);
  const averageCloseTimeDays = closeTimes.length ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length) : 0;

  const salesMap = new Map<string, { won: number; revenueCents: number }>();
  for (const p of approved) {
    const name = p.salespersonName ?? 'Unassigned';
    const cur = salesMap.get(name) ?? { won: 0, revenueCents: 0 };
    salesMap.set(name, { won: cur.won + 1, revenueCents: cur.revenueCents + p.subtotalCents });
  }
  const salespersonPerformance = [...salesMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenueCents - a.revenueCents);

  const monthlyMap = new Map<string, { revenueCents: number; count: number }>();
  for (const p of approved) {
    const d = p.acceptedAt ?? p.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthlyMap.get(key) ?? { revenueCents: 0, count: 0 };
    monthlyMap.set(key, { revenueCents: cur.revenueCents + p.subtotalCents, count: cur.count + 1 });
  }

  const funnel = PROPOSAL_PIPELINE_STATUSES.map((stage) => ({
    stage,
    count: proposals.filter((p) => p.status === stage).length,
  }));

  return {
    totalProposals: proposals.length,
    draftProposals: countBy(['draft', 'internal_review', 'ready_to_send']),
    sentProposals: countBy(['sent']),
    viewedProposals: countBy(['viewed', 'customer_questions']),
    approvedProposals: approved.length,
    rejectedProposals: rejected.length,
    expiredProposals: countBy(['expired']),
    conversionRate: sent.length ? Math.round((approved.length / sent.length) * 100) : 0,
    totalProposalRevenueCents,
    revenueWonCents,
    revenueLostCents,
    averageProposalValueCents: proposals.length ? Math.round(totalProposalRevenueCents / proposals.length) : 0,
    averageCloseTimeDays,
    topSalesperson: salespersonPerformance[0]?.name ?? null,
    topUpsells: ['Tree wraps', 'Garland', 'Storage service'],
    packageSelectionRate: { basic: 25, recommended: 55, premium: 20 },
    monthlyRevenue: [...monthlyMap.entries()].sort().map(([month, v]) => ({ month, ...v })),
    funnel,
    salespersonPerformance,
  };
}

export async function listProposalTemplates(orgId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/proposalTemplates`).orderBy('name').get();
  return snap.docs.map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as ProposalTemplate);
}

export async function ensureProposalTemplates(orgId: string) {
  const existing = await listProposalTemplates(orgId);
  if (existing.length > 0) return existing;

  const defaults: Array<Omit<ProposalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>> = [
    { organizationId: orgId, name: 'Residential Roofline', category: 'residential_roofline', description: 'Standard roofline package', scopeOfWork: 'Roofline C9 installation, timer setup, takedown included.', installType: 'roofline', defaultPackages: [], isActive: true },
    { organizationId: orgId, name: 'Residential Premium', category: 'residential_premium', description: 'Roofline + trees + wreaths', scopeOfWork: 'Full property premium display.', installType: 'custom', defaultPackages: [], isActive: true },
    { organizationId: orgId, name: 'Commercial Property', category: 'commercial', description: 'Commercial facade lighting', scopeOfWork: 'Commercial-grade installation with maintenance plan.', installType: 'commercial_display', defaultPackages: [], isActive: true },
    { organizationId: orgId, name: 'HOA Community', category: 'hoa', description: 'Community entrance displays', installType: 'garland', defaultPackages: [], isActive: true },
    { organizationId: orgId, name: 'Municipal Display', category: 'municipal', description: 'City/downtown installations', installType: 'commercial_display', defaultPackages: [], isActive: true },
    { organizationId: orgId, name: 'Permanent Lighting', category: 'permanent_lighting', description: 'Year-round permanent LED', installType: 'permanent_lighting', defaultPackages: [], isActive: true },
  ];

  const db = getAdminFirestore();
  const now = ts();
  for (const t of defaults) {
    await db.collection(`organizations/${orgId}/proposalTemplates`).add({ ...t, createdAt: now, updatedAt: now, createdBy: null, updatedBy: null });
  }
  return listProposalTemplates(orgId);
}

export async function createProposalTemplate(orgId: string, data: Omit<ProposalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/proposalTemplates`).doc();
  const now = ts();
  await ref.set({ ...data, organizationId: orgId, createdAt: now, updatedAt: now, createdBy: userId ?? null, updatedBy: userId ?? null });
  const snap = await ref.get();
  return mapTimestampsFromData({ id: snap.id, ...snap.data()! }) as ProposalTemplate;
}

export async function updateProposalPackage(orgId: string, proposalId: string, packageId: string, data: Partial<ProposalPackage>, userId?: string | null) {
  const db = getAdminFirestore();
  await db.doc(`${subPath(orgId, proposalId, 'packages')}/${packageId}`).update({ ...data, updatedAt: ts(), updatedBy: userId ?? null });
  return getProposal360(orgId, proposalId);
}

export { PROPOSAL_PIPELINE_STATUSES };
