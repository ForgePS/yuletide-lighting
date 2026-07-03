import { getStripe } from '@/lib/stripe';
import type { SubscriptionPlan, PromoCodePreview } from '@clcrm/types';
import { SUBSCRIPTION_PRICING } from '@clcrm/types';
import { getOrganization, updateOrganization } from '@yuletide/firebase';
import type Stripe from 'stripe';

export type { PromoCodePreview } from '@clcrm/types';

export async function ensureStripeCustomer(orgId: string, email: string) {
  const org = await getOrganization(orgId);
  if (org?.stripeCustomerId) return org.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { organizationId: orgId },
  });
  await updateOrganization(orgId, { stripeCustomerId: customer.id });
  return customer.id;
}

export function subscriptionLineItem(plan: SubscriptionPlan) {
  const pricing = SUBSCRIPTION_PRICING[plan];
  const priceId = plan === 'monthly'
    ? process.env.STRIPE_PRICE_ID_MONTHLY
    : process.env.STRIPE_PRICE_ID_YEARLY;

  if (priceId) {
    return { price: priceId, quantity: 1 };
  }

  return {
    price_data: {
      currency: 'usd',
      product_data: { name: `Yuletide Lighting CRM (${pricing.label})` },
      unit_amount: pricing.amountCents,
      recurring: { interval: pricing.interval },
    },
    quantity: 1,
  };
}

function applyDiscount(baseCents: number, coupon: Stripe.Coupon) {
  if (coupon.percent_off) {
    return Math.max(0, Math.round(baseCents * (1 - coupon.percent_off / 100)));
  }
  if (coupon.amount_off) {
    return Math.max(0, baseCents - coupon.amount_off);
  }
  return baseCents;
}

export async function lookupPromotionCode(rawCode: string) {
  const code = rawCode.trim();
  if (!code) return null;

  const stripe = getStripe();
  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ['data.coupon'],
  });

  const promo = list.data[0];
  if (!promo || !promo.active) return null;

  const coupon = typeof promo.coupon === 'string'
    ? await stripe.coupons.retrieve(promo.coupon)
    : promo.coupon;

  if (!coupon.valid) return null;

  return { promo, coupon };
}

export function buildPromoPreview(
  code: string,
  promotionCodeId: string,
  coupon: Stripe.Coupon,
): PromoCodePreview {
  const monthly = applyDiscount(SUBSCRIPTION_PRICING.monthly.amountCents, coupon);
  const yearly = applyDiscount(SUBSCRIPTION_PRICING.yearly.amountCents, coupon);

  return {
    code,
    promotionCodeId,
    percentOff: coupon.percent_off ?? null,
    amountOffCents: coupon.amount_off ?? null,
    duration: coupon.duration,
    durationInMonths: coupon.duration_in_months ?? null,
    description: coupon.name ?? null,
    estimatedMonthlyCents: monthly,
    estimatedYearlyCents: yearly,
  };
}

export async function previewPromotionCode(rawCode: string, plan?: SubscriptionPlan) {
  const match = await lookupPromotionCode(rawCode);
  if (!match) return null;

  const preview = buildPromoPreview(match.promo.code, match.promo.id, match.coupon);
  if (plan) {
    const base = SUBSCRIPTION_PRICING[plan].amountCents;
    const discounted = applyDiscount(base, match.coupon);
    return { ...preview, estimatedMonthlyCents: plan === 'monthly' ? discounted : preview.estimatedMonthlyCents, estimatedYearlyCents: plan === 'yearly' ? discounted : preview.estimatedYearlyCents };
  }
  return preview;
}

export async function listActivePromotionCodes(limit = 25) {
  const stripe = getStripe();
  const list = await stripe.promotionCodes.list({
    active: true,
    limit,
    expand: ['data.coupon'],
  });
  return list.data.map((promo) => {
    const coupon = typeof promo.coupon === 'string' ? null : promo.coupon;
    return {
      id: promo.id,
      code: promo.code,
      active: promo.active,
      maxRedemptions: promo.max_redemptions,
      timesRedeemed: promo.times_redeemed,
      expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000) : null,
      percentOff: coupon?.percent_off ?? null,
      amountOffCents: coupon?.amount_off ?? null,
      duration: coupon?.duration ?? null,
      description: coupon?.name ?? null,
    };
  });
}

export async function createStripePromotionCode(input: {
  code: string;
  percentOff?: number;
  amountOffCents?: number;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: Date;
  description?: string;
}) {
  const stripe = getStripe();
  const coupon = await stripe.coupons.create({
    name: input.description ?? `Promo ${input.code}`,
    percent_off: input.percentOff,
    amount_off: input.amountOffCents,
    currency: input.amountOffCents ? 'usd' : undefined,
    duration: input.duration,
    duration_in_months: input.duration === 'repeating' ? input.durationInMonths : undefined,
  });

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: input.code.toUpperCase(),
    max_redemptions: input.maxRedemptions,
    expires_at: input.expiresAt ? Math.floor(input.expiresAt.getTime() / 1000) : undefined,
  });

  return buildPromoPreview(promo.code, promo.id, coupon);
}
