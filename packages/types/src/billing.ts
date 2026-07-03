export type SubscriptionInterval = 'month' | 'year';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'locked';

export type SubscriptionPlan = 'monthly' | 'yearly';

export const SUBSCRIPTION_PRICING: Record<SubscriptionPlan, { amountCents: number; interval: SubscriptionInterval; label: string }> = {
  monthly: { amountCents: 7500, interval: 'month', label: '$75 / month' },
  yearly: { amountCents: 75000, interval: 'year', label: '$750 / year' },
};

export type SubscriptionPaymentRecord = {
  id: string;
  organizationId: string;
  stripeInvoiceId: string;
  amountCents: number;
  currency: string;
  status: string;
  plan: SubscriptionPlan | null;
  paidAt: Date;
  createdAt: Date;
};

export type OrgSubscriptionState = {
  organizationId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan | null;
  interval: SubscriptionInterval | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  lockAt: Date | null;
  isLocked: boolean;
  hasAccess: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
};

export type PromoCodePreview = {
  code: string;
  promotionCodeId: string;
  percentOff: number | null;
  amountOffCents: number | null;
  duration: string;
  durationInMonths: number | null;
  description: string | null;
  estimatedMonthlyCents: number | null;
  estimatedYearlyCents: number | null;
};
