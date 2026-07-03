import type { OrganizationRecord } from './firestore';
import type { OrgSubscriptionState, SubscriptionPaymentRecord, SubscriptionPlan, SubscriptionStatus } from '@clcrm/types';
import { SUBSCRIPTION_PRICING } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { getOrganization, updateOrganization } from './firestore';
import { mapTimestampsFromData } from './firestore-utils';

/** Lock at 00:00 UTC on the calendar day after the subscription period ends. */
export function computeLockAt(periodEnd: Date): Date {
  const lock = new Date(periodEnd);
  lock.setUTCDate(lock.getUTCDate() + 1);
  lock.setUTCHours(0, 0, 0, 0);
  return lock;
}

export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'unpaid': return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
      // Abandoned or unfinished checkout — do not lock the org.
      return 'none';
    default:
      return 'none';
  }
}

export function resolveAccessEnd(org: OrganizationRecord): Date | null {
  const status = org.subscriptionStatus ?? 'none';

  // Prefer paid period end for real subscriptions so stale trial dates cannot lock active accounts.
  if (org.currentPeriodEnd && (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled')) {
    return new Date(org.currentPeriodEnd);
  }
  if (status === 'trialing' && org.trialEndsAt) {
    return new Date(org.trialEndsAt);
  }
  if (org.currentPeriodEnd) return new Date(org.currentPeriodEnd);
  if (org.trialEndsAt) return new Date(org.trialEndsAt);
  return null;
}

export function isSubscriptionLocked(org: OrganizationRecord): boolean {
  const status = org.subscriptionStatus ?? 'none';

  // Legacy orgs with no billing metadata — full access.
  if (
    !org.subscriptionStatus
    && !org.stripeSubscriptionId
    && !org.stripeCustomerId
    && !org.currentPeriodEnd
    && !org.trialEndsAt
  ) {
    return false;
  }

  // Stripe customer created or checkout abandoned, but no paid subscription on file.
  if (!org.stripeSubscriptionId) {
    return false;
  }

  if (status === 'active' || status === 'trialing') {
    return false;
  }

  if (status === 'past_due' || status === 'canceled' || status === 'locked') {
    const accessEnd = resolveAccessEnd(org);
    if (!accessEnd) return status !== 'past_due';
    return Date.now() >= computeLockAt(accessEnd).getTime();
  }

  return false;
}

export function getOrgSubscriptionState(org: OrganizationRecord): OrgSubscriptionState {
  const accessEnd = resolveAccessEnd(org);
  const lockAt = accessEnd ? computeLockAt(accessEnd) : null;
  const locked = isSubscriptionLocked(org);
  const plan = (org.subscriptionPlan as SubscriptionPlan | null) ?? null;

  return {
    organizationId: org.id,
    status: (org.subscriptionStatus as SubscriptionStatus | undefined) ?? 'none',
    plan,
    interval: (org.subscriptionInterval as 'month' | 'year' | null) ?? null,
    currentPeriodEnd: org.currentPeriodEnd ? new Date(org.currentPeriodEnd) : null,
    trialEndsAt: org.trialEndsAt ? new Date(org.trialEndsAt) : null,
    lockAt,
    isLocked: locked,
    hasAccess: !locked,
    stripeCustomerId: org.stripeCustomerId ?? null,
    stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd ?? false,
  };
}

export async function getOrgSubscriptionStateById(orgId: string): Promise<OrgSubscriptionState | null> {
  const org = await getOrganization(orgId);
  if (!org) return null;
  return getOrgSubscriptionState(org);
}

export function planFromPriceId(priceId: string | undefined | null): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return 'yearly';
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'monthly';
  return null;
}

export function intervalFromPlan(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PRICING[plan].interval;
}

export async function applySubscriptionUpdate(
  orgId: string,
  data: Partial<OrganizationRecord>,
) {
  await updateOrganization(orgId, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function recordSubscriptionPayment(
  orgId: string,
  payment: {
    stripeInvoiceId: string;
    amountCents: number;
    currency: string;
    status: string;
    plan: SubscriptionPlan | null;
    paidAt: Date;
  },
) {
  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/subscriptionPayments`).doc(payment.stripeInvoiceId);
  const existing = await ref.get();
  if (existing.exists) return;
  const now = Timestamp.now();
  await ref.set({
    organizationId: orgId,
    ...payment,
    createdAt: now,
    updatedAt: now,
  });
}

export async function listSubscriptionPayments(orgId: string, limit = 24): Promise<SubscriptionPaymentRecord[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`organizations/${orgId}/subscriptionPayments`)
    .orderBy('paidAt', 'desc')
    .limit(limit)
    .get()
    .catch(async () => {
      const fallback = await db.collection(`organizations/${orgId}/subscriptionPayments`).limit(limit).get();
      return fallback;
    });

  return snap.docs
    .map((d) => mapTimestampsFromData({ id: d.id, ...d.data()! }) as SubscriptionPaymentRecord)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

export async function findOrgByStripeCustomerId(customerId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection('organizations').where('stripeCustomerId', '==', customerId).limit(1).get();
  return snap.empty ? null : snap.docs[0]!;
}
