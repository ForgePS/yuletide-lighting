/** Proposal & Sales Closing — Sprint PROP-001 */

export type ProposalStatus =
  | 'draft'
  | 'internal_review'
  | 'ready_to_send'
  | 'sent'
  | 'viewed'
  | 'customer_questions'
  | 'approved'
  | 'deposit_paid'
  | 'scheduled'
  | 'rejected'
  | 'expired'
  | 'superseded'
  // legacy aliases stored in DB
  | 'accepted'
  | 'declined';

export type InstallType =
  | 'roofline'
  | 'trees'
  | 'wreaths'
  | 'garland'
  | 'commercial_display'
  | 'permanent_lighting'
  | 'service_call'
  | 'custom';

export type PackageTier = 'basic' | 'recommended' | 'premium';

export type FinancingOption = 'full_payment' | 'deposit_50' | 'monthly' | 'financing_partner';

export type DepositStatus = 'pending' | 'paid' | 'refunded';

export type ApprovalAction = 'approved' | 'rejected' | 'changes_requested';

export type ProposalTemplateCategory =
  | 'residential_roofline'
  | 'residential_premium'
  | 'commercial'
  | 'hoa'
  | 'municipal'
  | 'permanent_lighting';

export type ProposalAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PricingComponents = {
  linearFootage: number;
  treeWrapCount: number;
  garlandLengthFt: number;
  wreathCount: number;
  specialtyDecorCount: number;
  laborHours: number;
  equipmentChargeCents: number;
  travelChargeCents: number;
  materialCostCents: number;
  laborCostCents: number;
};

export type ProposalLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  category?: string;
  inventoryItemId?: string | null;
  agreementCode?: string | null;
};

export type ProposalPackage = ProposalAuditFields & {
  id: string;
  proposalId: string;
  tier: PackageTier;
  name: string;
  label: string;
  description?: string | null;
  lineItems: ProposalLineItem[];
  products: string[];
  decorations: string[];
  laborDescription?: string | null;
  addOns: string[];
  warranty?: string | null;
  subtotalCents: number;
  materialCostCents: number;
  laborCostCents: number;
  grossProfitCents: number;
  grossMarginPercent: number;
  isRecommended: boolean;
  pricing: PricingComponents;
};

export type ProposalView = ProposalAuditFields & {
  id: string;
  proposalId: string;
  viewedAt: Date;
  durationSeconds?: number | null;
  device?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type ProposalApproval = ProposalAuditFields & {
  id: string;
  proposalId: string;
  action: ApprovalAction;
  customerName: string;
  signatureData?: string | null;
  ipAddress?: string | null;
  packageId?: string | null;
  agreementCode?: string | null;
  notes?: string | null;
  approvedAt: Date;
};

export type ProposalRecord = ProposalAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId: string;
  title: string;
  proposalNumber?: string | null;
  status: ProposalStatus;
  salespersonId?: string | null;
  salespersonName?: string | null;
  installType?: InstallType | null;
  season?: string | null;
  scopeOfWork?: string | null;
  agreementMode: 'single' | 'multi';
  agreementOptions: Array<{ code: string; label: string; active: boolean }>;
  selectedAgreementCode?: string | null;
  lineItems: ProposalLineItem[];
  subtotalCents: number;
  notes?: string | null;
  validUntil?: Date | null;
  publicToken: string;
  viewCount: number;
  lastViewedAt?: Date | null;
  sentAt?: Date | null;
  acceptedAt?: Date | null;
  acceptedByName?: string | null;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  termsVersion?: string | null;
  signedSnapshotJson?: string | null;
  signedDocumentUrl?: string | null;
  revisionOfId?: string | null;
  supersededById?: string | null;
  mockupIds: string[];
  designId?: string | null;
  propertyPhotoUrl?: string | null;
  selectedPackageId?: string | null;
  pricing: PricingComponents;
  financingOption: FinancingOption;
  depositPercent: number;
  depositAmountCents: number;
  depositStatus: DepositStatus;
  contractUrl?: string | null;
  contractGeneratedAt?: Date | null;
  followUpAutomationEnabled: boolean;
  /** YL-S20 — last automated follow-up recorded (idempotency vs lastViewedAt). */
  followUpLastSentAt?: Date | null;
  upsellSuggestions: string[];
  upsellPotentialCents: number;
  aiSuggestedPriceCents?: number | null;
  aiScopeOfWork?: string | null;
  openDate?: Date | null;
  installDate?: Date | null;
  removalDate?: Date | null;
  termsAndConditions?: string | null;
  commercialAccountId?: string | null;
  commercialLocationIds?: string[];
  isMultiLocation?: boolean;
};

export type ProposalTemplate = ProposalAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  category: ProposalTemplateCategory;
  description?: string | null;
  scopeOfWork?: string | null;
  installType?: InstallType | null;
  defaultPackages: Array<Omit<ProposalPackage, 'id' | 'proposalId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>;
  isActive: boolean;
};

export type ProposalAnalytics = {
  totalProposals: number;
  draftProposals: number;
  sentProposals: number;
  viewedProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  expiredProposals: number;
  conversionRate: number;
  totalProposalRevenueCents: number;
  revenueWonCents: number;
  revenueLostCents: number;
  averageProposalValueCents: number;
  averageCloseTimeDays: number;
  topSalesperson?: string | null;
  topUpsells: string[];
  packageSelectionRate: Record<PackageTier, number>;
  monthlyRevenue: Array<{ month: string; revenueCents: number; count: number }>;
  funnel: Array<{ stage: string; count: number }>;
  salespersonPerformance: Array<{ name: string; won: number; revenueCents: number }>;
};

export type ProposalListItem = ProposalRecord & {
  customerName?: string;
  propertyAddress?: string;
};

export type UpsellSuggestion = {
  label: string;
  potentialCents: number;
};

export type AiProposalAssist = {
  scopeOfWork: string;
  customerSummary: string;
  proposalDescription: string;
  followUpEmail: string;
  contractLanguage: string;
  suggestedPriceCents: number;
  suggestedUpsells: string[];
  suggestedWarranty: string;
  suggestedDepositPercent: number;
};

export const PROPOSAL_PIPELINE_STATUSES: ProposalStatus[] = [
  'draft',
  'internal_review',
  'ready_to_send',
  'sent',
  'viewed',
  'customer_questions',
  'approved',
  'deposit_paid',
  'scheduled',
  'rejected',
  'expired',
];

export function normalizeProposalStatus(status: string): ProposalStatus {
  if (status === 'accepted') return 'approved';
  if (status === 'declined') return 'rejected';
  return status as ProposalStatus;
}

export type ProposalPackageEditorDraft = {
  key: 'good' | 'better' | 'best';
  tier: PackageTier;
  label: string;
  description: string;
  inclusions: string[];
  markupPercent: number;
  isRecommended: boolean;
};

const TIER_TO_KEY: Record<PackageTier, ProposalPackageEditorDraft['key']> = {
  basic: 'good',
  recommended: 'better',
  premium: 'best',
};

const EMPTY_PACKAGE_EDITOR_DRAFTS: ProposalPackageEditorDraft[] = [
  {
    key: 'good',
    tier: 'basic',
    label: 'Good',
    description: '',
    inclusions: [],
    markupPercent: 15,
    isRecommended: false,
  },
  {
    key: 'better',
    tier: 'recommended',
    label: 'Better',
    description: '',
    inclusions: [],
    markupPercent: 25,
    isRecommended: true,
  },
  {
    key: 'best',
    tier: 'premium',
    label: 'Best',
    description: '',
    inclusions: [],
    markupPercent: 35,
    isRecommended: false,
  },
];

/** Infer markup % from package linear footage vs proposal base footage. */
export function inferPackageMarkupPercent(
  packageLinearFootage: number | undefined,
  baseLinearFootage: number | undefined,
  fallback: number,
): number {
  const base = Number(baseLinearFootage);
  const valued = Number(packageLinearFootage);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(valued) || valued <= 0) {
    return fallback;
  }
  return Math.max(0, Math.round((valued / base - 1) * 100));
}

/**
 * YL-S7 / BACKLOG-002 — hydrate Good/Better/Best editor drafts from proposal packages.
 * Org packageDefaults seed new proposals only; edit flows use this helper.
 */
export function buildPackageEditorDraftsFromProposalPackages(
  packages:
    | Array<
        Pick<
          ProposalPackage,
          'tier' | 'label' | 'name' | 'description' | 'products' | 'isRecommended' | 'pricing'
        >
      >
    | null
    | undefined,
  basePricing?: Pick<PricingComponents, 'linearFootage'> | null,
): ProposalPackageEditorDraft[] {
  if (!packages?.length) return EMPTY_PACKAGE_EDITOR_DRAFTS.map((d) => ({ ...d }));
  const baseLf = basePricing?.linearFootage;
  const byKey = new Map<ProposalPackageEditorDraft['key'], ProposalPackageEditorDraft>();
  for (const pkg of packages) {
    const key = TIER_TO_KEY[pkg.tier] ?? 'good';
    const empty = EMPTY_PACKAGE_EDITOR_DRAFTS.find((d) => d.key === key)!;
    byKey.set(key, {
      key,
      tier: pkg.tier,
      label: String(pkg.label ?? pkg.name ?? empty.label),
      description: String(pkg.description ?? ''),
      inclusions: Array.isArray(pkg.products) ? pkg.products.map(String) : [],
      markupPercent: inferPackageMarkupPercent(
        pkg.pricing?.linearFootage,
        baseLf,
        empty.markupPercent,
      ),
      isRecommended: Boolean(pkg.isRecommended),
    });
  }
  return EMPTY_PACKAGE_EDITOR_DRAFTS.map((empty) => byKey.get(empty.key) ?? { ...empty });
}

export function proposalPackagesAreFilled(
  packages: Array<{
    label?: string;
    description?: string;
    inclusions?: string[];
    products?: string[];
  }>,
): boolean {
  return packages.some((pkg) => {
    const label = String(pkg.label ?? '').trim();
    const description = String(pkg.description ?? '').trim();
    const inclusions = Array.isArray(pkg.inclusions)
      ? pkg.inclusions
      : Array.isArray(pkg.products)
        ? pkg.products
        : [];
    return label.length > 0 && (description.length > 0 || inclusions.length > 0);
  });
}
