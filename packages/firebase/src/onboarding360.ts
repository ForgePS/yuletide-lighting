import {
  COMPANY_SETUP_STEP_IDS,
  COMPANY_SETUP_VERSION,
  DEFAULT_PROPOSAL_PACKAGE_DEFAULTS,
  SKIPPABLE_COMPANY_SETUP_STEPS,
  type CompanySetupCategory,
  type CompanySetupStepId,
  type OnboardingStatus,
} from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { getOrganization, updateOrganization, type OrganizationRecord } from './firestore';
import {
  getBrandingSettings,
  getCompanySettings,
  getInvoiceSettings,
  getProposalSettings,
  listOrgUsers,
} from './settings360';
import { isDemoOrganization } from './demo-tenant';

export type OnboardingChecklistItem = {
  id: CompanySetupStepId;
  label: string;
  description: string;
  done: boolean;
  skipped: boolean;
  skippable: boolean;
  href: string | null;
  category: CompanySetupCategory;
};

export type OnboardingState = {
  version: number;
  status: OnboardingStatus;
  step: CompanySetupStepId | null;
  completed: boolean;
  dismissed: boolean;
  checklist: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
};

const STEP_HREFS: Record<CompanySetupStepId, string | null> = {
  company_profile: '/app/settings/company',
  branding: '/app/settings/branding',
  business_address: '/app/settings/company',
  service_areas: '/app/settings/company',
  users: '/app/settings/users',
  crews: '/app/schedule/crews',
  services: '/app/settings/proposals',
  pricing: '/app/settings/proposals',
  tax_settings: '/app/settings/invoices',
  payment_settings: '/app/settings/integrations',
  inventory: '/app/settings/inventory',
  customer_import: '/app/settings/import',
  first_customer: '/app/customers',
  first_proposal: '/app/proposals/new',
  scheduling: '/app/settings/season',
  launch_readiness: null,
};

function isPaidOrConnected(org: OrganizationRecord): boolean {
  if (org.stripeConnectAccountId) return true;
  const status = org.subscriptionStatus;
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

async function collectionHasRows(orgId: string, collection: string): Promise<boolean> {
  const snap = await getAdminFirestore()
    .collection(`organizations/${orgId}/${collection}`)
    .limit(1)
    .get();
  return !snap.empty;
}

async function seasonSettingsExist(orgId: string): Promise<boolean> {
  const snap = await getAdminFirestore().doc(`organizations/${orgId}/settings/season`).get();
  return snap.exists;
}

async function hasCustomCrews(orgId: string): Promise<boolean> {
  return collectionHasRows(orgId, 'crewSchedules');
}

function serviceAreaConfigured(
  serviceArea: Awaited<ReturnType<typeof getCompanySettings>>['serviceArea'],
): boolean {
  return (
    serviceArea.states.length > 0
    || serviceArea.counties.length > 0
    || serviceArea.cities.length > 0
    || serviceArea.zipCodes.length > 0
    || serviceArea.maxTravelDistanceMiles > 0
  );
}

function proposalServicesConfigured(
  settings: Awaited<ReturnType<typeof getProposalSettings>>,
): boolean {
  for (const tier of ['good', 'better', 'best'] as const) {
    const current = settings.packageDefaults[tier];
    const defaults = DEFAULT_PROPOSAL_PACKAGE_DEFAULTS[tier];
    if (current.description !== defaults.description) return true;
    if (current.inclusions.join('|') !== defaults.inclusions.join('|')) return true;
  }
  return false;
}

function pricingConfigured(settings: Awaited<ReturnType<typeof getProposalSettings>>): boolean {
  const defaultTerms =
    'Payment due upon acceptance. Installation scheduled upon deposit receipt.';
  if (settings.defaultTerms !== defaultTerms) return true;
  if (settings.defaultDepositPercent !== 50) return true;
  for (const tier of ['good', 'better', 'best'] as const) {
    if (
      settings.packageDefaults[tier].markupPercent
      !== DEFAULT_PROPOSAL_PACKAGE_DEFAULTS[tier].markupPercent
    ) {
      return true;
    }
  }
  return false;
}

function labelForStep(id: CompanySetupStepId): string {
  const labels: Record<CompanySetupStepId, string> = {
    company_profile: 'Company profile',
    branding: 'Branding',
    business_address: 'Business address',
    service_areas: 'Service areas',
    users: 'Users',
    crews: 'Crews',
    services: 'Services',
    pricing: 'Pricing',
    tax_settings: 'Tax settings',
    payment_settings: 'Payment settings',
    inventory: 'Inventory',
    customer_import: 'Customer import',
    first_customer: 'First customer',
    first_proposal: 'First proposal',
    scheduling: 'Scheduling',
    launch_readiness: 'Launch readiness',
  };
  return labels[id];
}

function descriptionForStep(id: CompanySetupStepId): string {
  const descriptions: Record<CompanySetupStepId, string> = {
    company_profile: 'Add your company name and contact details.',
    branding: 'Upload your logo and set brand colors.',
    business_address: 'Enter your business mailing address.',
    service_areas: 'Define where you install holiday lighting.',
    users: 'Invite at least one teammate to the workspace.',
    crews: 'Create a field crew for scheduling.',
    services: 'Configure your standard proposal packages.',
    pricing: 'Set default deposits and package pricing.',
    tax_settings: 'Configure tax ID or invoice tax rate.',
    payment_settings: 'Connect Stripe or activate your subscription.',
    inventory: 'Add products you install and maintain.',
    customer_import: 'Import existing customers from a spreadsheet.',
    first_customer: 'Create or import your first customer record.',
    first_proposal: 'Build your first sales proposal.',
    scheduling: 'Set your season calendar or schedule a job.',
    launch_readiness: 'Mark setup complete when you are ready to operate.',
  };
  return descriptions[id];
}

function categoryForStep(id: CompanySetupStepId): CompanySetupCategory {
  if (['company_profile', 'branding', 'business_address', 'service_areas'].includes(id)) {
    return 'foundation';
  }
  if (['users', 'crews'].includes(id)) return 'team';
  if (['services', 'pricing', 'tax_settings', 'payment_settings'].includes(id)) return 'commercial';
  if (['inventory', 'customer_import', 'first_customer', 'first_proposal', 'scheduling'].includes(id)) {
    return 'operations';
  }
  return 'launch';
}

function isSkipped(org: OrganizationRecord, stepId: CompanySetupStepId): boolean {
  return (org.onboardingSkippedSteps ?? []).includes(stepId);
}

function firstIncompleteStep(checklist: OnboardingChecklistItem[]): CompanySetupStepId {
  const incomplete = checklist.find((item) => !item.done && item.id !== 'launch_readiness');
  return incomplete?.id ?? 'launch_readiness';
}

function deriveStatus(completed: boolean, completedCount: number): OnboardingStatus {
  if (completed) return 'complete';
  if (completedCount === 0) return 'not-started';
  return 'in-progress';
}

export async function getOnboardingState(orgId: string): Promise<OnboardingState> {
  const org = await getOrganization(orgId);
  if (!org) {
    return emptyOnboardingState();
  }

  if (isDemoOrganization(org)) {
    return completedOnboardingState();
  }

  const completed = Boolean(org.onboardingCompletedAt);
  const skippedSteps = new Set(org.onboardingSkippedSteps ?? []);

  const [
    company,
    branding,
    proposalSettings,
    invoiceSettings,
    seasonExists,
    hasCustomers,
    hasProposals,
    hasInventory,
    hasCrews,
    hasEvents,
    users,
  ] = await Promise.all([
    getCompanySettings(orgId).catch(() => null),
    getBrandingSettings(orgId).catch(() => null),
    getProposalSettings(orgId).catch(() => null),
    getInvoiceSettings(orgId).catch(() => null),
    seasonSettingsExist(orgId),
    collectionHasRows(orgId, 'customers'),
    collectionHasRows(orgId, 'proposals'),
    collectionHasRows(orgId, 'inventoryItems'),
    hasCustomCrews(orgId),
    collectionHasRows(orgId, 'calendarEvents'),
    listOrgUsers(orgId).catch(() => []),
  ]);

  const companyProfileDone =
    completed
    || Boolean(
      company?.companyName?.trim()
        && (company.phone?.trim() || company.email?.trim()),
    );

  const brandingDone =
    completed
    || Boolean(
      company?.logoUrl?.trim()
        || branding?.primaryLogoUrl?.trim()
        || org.logoUrl?.trim(),
    );

  const addressDone =
    completed
    || Boolean(
      company?.addressLine1?.trim()
        && company.city?.trim()
        && company.state?.trim(),
    );

  const serviceAreasDone =
    completed || Boolean(company && serviceAreaConfigured(company.serviceArea));

  const usersDone = completed || users.length > 1;
  const crewsDone = completed || hasCrews;
  const servicesDone =
    completed || skippedSteps.has('services') || Boolean(proposalSettings && proposalServicesConfigured(proposalSettings));
  const pricingDone =
    completed || Boolean(proposalSettings && pricingConfigured(proposalSettings));
  const taxDone =
    completed
    || Boolean(company?.taxId?.trim())
    || (invoiceSettings?.taxRatePercent ?? 0) > 0;
  const paymentsDone = completed || isPaidOrConnected(org);
  const inventoryDone = completed || skippedSteps.has('inventory') || hasInventory;
  const importDone = completed || skippedSteps.has('customer_import') || hasCustomers;
  const firstCustomerDone = completed || hasCustomers;
  const firstProposalDone = completed || hasProposals;
  const schedulingDone = completed || seasonExists || hasEvents;
  const launchDone = completed;

  const completionByStep: Record<CompanySetupStepId, boolean> = {
    company_profile: companyProfileDone,
    branding: brandingDone,
    business_address: addressDone,
    service_areas: serviceAreasDone,
    users: usersDone,
    crews: crewsDone,
    services: servicesDone,
    pricing: pricingDone,
    tax_settings: taxDone,
    payment_settings: paymentsDone,
    inventory: inventoryDone,
    customer_import: importDone,
    first_customer: firstCustomerDone,
    first_proposal: firstProposalDone,
    scheduling: schedulingDone,
    launch_readiness: launchDone,
  };

  const checklist: OnboardingChecklistItem[] = COMPANY_SETUP_STEP_IDS.map((id) => ({
    id,
    label: labelForStep(id),
    description: descriptionForStep(id),
    done: completionByStep[id],
    skipped: isSkipped(org, id),
    skippable: SKIPPABLE_COMPANY_SETUP_STEPS.includes(id),
    href: STEP_HREFS[id],
    category: categoryForStep(id),
  }));

  const actionableSteps = checklist.filter((item) => item.id !== 'launch_readiness');
  const completedCount = actionableSteps.filter((item) => item.done).length;
  const totalCount = actionableSteps.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const step: CompanySetupStepId = completed
    ? 'launch_readiness'
    : org.onboardingStep && COMPANY_SETUP_STEP_IDS.includes(org.onboardingStep as CompanySetupStepId)
      ? (org.onboardingStep as CompanySetupStepId)
      : firstIncompleteStep(checklist);

  if (!completed && !org.onboardingStartedAt && completedCount > 0) {
    await updateOrganization(orgId, { onboardingStartedAt: new Date() });
  }

  return {
    version: COMPANY_SETUP_VERSION,
    status: deriveStatus(completed, completedCount),
    step,
    completed,
    dismissed: Boolean(org.onboardingDismissedAt) && !completed,
    checklist,
    completedCount,
    totalCount,
    progressPercent,
  };
}

function emptyOnboardingState(): OnboardingState {
  const checklist: OnboardingChecklistItem[] = COMPANY_SETUP_STEP_IDS.map((id) => ({
    id,
    label: labelForStep(id),
    description: descriptionForStep(id),
    done: false,
    skipped: false,
    skippable: SKIPPABLE_COMPANY_SETUP_STEPS.includes(id),
    href: STEP_HREFS[id],
    category: categoryForStep(id),
  }));
  const totalCount = checklist.length - 1;
  return {
    version: COMPANY_SETUP_VERSION,
    status: 'not-started',
    step: 'company_profile',
    completed: false,
    dismissed: false,
    checklist,
    completedCount: 0,
    totalCount,
    progressPercent: 0,
  };
}

function completedOnboardingState(): OnboardingState {
  const checklist: OnboardingChecklistItem[] = COMPANY_SETUP_STEP_IDS.map((id) => ({
    id,
    label: labelForStep(id),
    description: descriptionForStep(id),
    done: true,
    skipped: false,
    skippable: SKIPPABLE_COMPANY_SETUP_STEPS.includes(id),
    href: STEP_HREFS[id],
    category: categoryForStep(id),
  }));
  const totalCount = checklist.length - 1;
  return {
    version: COMPANY_SETUP_VERSION,
    status: 'complete',
    step: 'launch_readiness',
    completed: true,
    dismissed: false,
    checklist,
    completedCount: totalCount,
    totalCount,
    progressPercent: 100,
  };
}

export async function updateOnboardingStep(orgId: string, step: CompanySetupStepId): Promise<OnboardingState> {
  const patch: Partial<OrganizationRecord> = { onboardingStep: step };
  const org = await getOrganization(orgId);
  if (!org?.onboardingStartedAt) {
    patch.onboardingStartedAt = new Date();
  }
  await updateOrganization(orgId, patch);
  return getOnboardingState(orgId);
}

export async function skipOnboardingStep(orgId: string, step: CompanySetupStepId): Promise<OnboardingState> {
  if (!SKIPPABLE_COMPANY_SETUP_STEPS.includes(step)) {
    throw new Error(`Step "${step}" cannot be skipped`);
  }
  const org = await getOrganization(orgId);
  const skipped = new Set(org?.onboardingSkippedSteps ?? []);
  skipped.add(step);
  await updateOrganization(orgId, {
    onboardingSkippedSteps: Array.from(skipped),
    onboardingStartedAt: org?.onboardingStartedAt ?? new Date(),
  });
  return getOnboardingState(orgId);
}

export async function dismissOnboarding(orgId: string): Promise<OnboardingState> {
  await updateOrganization(orgId, {
    onboardingDismissedAt: new Date(),
    onboardingStartedAt: (await getOrganization(orgId))?.onboardingStartedAt ?? new Date(),
  });
  return getOnboardingState(orgId);
}

export async function reopenOnboarding(orgId: string): Promise<OnboardingState> {
  await updateOrganization(orgId, { onboardingDismissedAt: null });
  return getOnboardingState(orgId);
}

export async function completeOnboarding(orgId: string): Promise<OnboardingState> {
  await updateOrganization(orgId, {
    onboardingCompletedAt: new Date(),
    onboardingStep: 'launch_readiness',
    onboardingDismissedAt: null,
  });
  return getOnboardingState(orgId);
}
