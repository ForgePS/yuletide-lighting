import { getAdminFirestore } from './admin';
import { getOrganization, updateOrganization, type OrganizationRecord } from './firestore';
import { getCompanySettings, listOrgUsers } from './settings360';

export type OnboardingChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type OnboardingState = {
  step: string | null;
  completed: boolean;
  checklist: OnboardingChecklistItem[];
};

const STEP_ORDER = ['company', 'season', 'products', 'invite_team', 'payments', 'complete'] as const;
type OnboardingStepId = (typeof STEP_ORDER)[number];

const PAST_PRODUCTS = new Set<string>(['invite_team', 'payments', 'complete']);

function isPaidOrConnected(org: OrganizationRecord): boolean {
  if (org.stripeConnectAccountId) return true;
  const status = org.subscriptionStatus;
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

async function seasonSettingsExist(orgId: string): Promise<boolean> {
  const snap = await getAdminFirestore().doc(`organizations/${orgId}/settings/season`).get();
  return snap.exists;
}

async function inventoryItemCount(orgId: string): Promise<number> {
  const snap = await getAdminFirestore()
    .collection(`organizations/${orgId}/inventoryItems`)
    .limit(1)
    .get();
  return snap.size;
}

function firstIncompleteStep(checklist: OnboardingChecklistItem[]): OnboardingStepId {
  const incomplete = checklist.find((item) => !item.done);
  return (incomplete?.id as OnboardingStepId | undefined) ?? 'complete';
}

export async function getOnboardingState(orgId: string): Promise<OnboardingState> {
  const org = await getOrganization(orgId);
  if (!org) {
    return {
      step: 'company',
      completed: false,
      checklist: STEP_ORDER.map((id) => ({
        id,
        label: labelForStep(id),
        done: false,
      })),
    };
  }

  const completed = Boolean(org.onboardingCompletedAt);
  const [company, seasonExists, productCount, users] = await Promise.all([
    getCompanySettings(orgId).catch(() => null),
    seasonSettingsExist(orgId),
    inventoryItemCount(orgId),
    listOrgUsers(orgId).catch(() => []),
  ]);

  const companyDone = Boolean(
    company &&
      ((company.phone && company.phone.trim()) ||
        (company.email && company.email.trim()) ||
        (company.addressLine1 && company.addressLine1.trim())),
  );
  const productsSkipped = PAST_PRODUCTS.has(org.onboardingStep ?? '');
  const productsDone = productCount > 0 || productsSkipped || completed;
  const inviteDone = users.length > 1 || completed;
  const paymentsDone = isPaidOrConnected(org) || completed;

  const checklist: OnboardingChecklistItem[] = [
    { id: 'company', label: labelForStep('company'), done: companyDone || completed },
    { id: 'season', label: labelForStep('season'), done: seasonExists || completed },
    { id: 'products', label: labelForStep('products'), done: productsDone },
    { id: 'invite_team', label: labelForStep('invite_team'), done: inviteDone },
    { id: 'payments', label: labelForStep('payments'), done: paymentsDone },
    { id: 'complete', label: labelForStep('complete'), done: completed },
  ];

  const step = completed
    ? 'complete'
    : org.onboardingStep && STEP_ORDER.includes(org.onboardingStep as OnboardingStepId)
      ? org.onboardingStep
      : firstIncompleteStep(checklist);

  return { step, completed, checklist };
}

function labelForStep(id: OnboardingStepId): string {
  switch (id) {
    case 'company':
      return 'Company profile';
    case 'season':
      return 'Season calendar';
    case 'products':
      return 'Products / inventory';
    case 'invite_team':
      return 'Invite your team';
    case 'payments':
      return 'Payments & subscription';
    case 'complete':
      return 'Finish onboarding';
    default:
      return id;
  }
}

export async function updateOnboardingStep(orgId: string, step: string): Promise<OnboardingState> {
  await updateOrganization(orgId, { onboardingStep: step });
  return getOnboardingState(orgId);
}

export async function completeOnboarding(orgId: string): Promise<OnboardingState> {
  await updateOrganization(orgId, {
    onboardingCompletedAt: new Date(),
    onboardingStep: 'complete',
  });
  return getOnboardingState(orgId);
}
