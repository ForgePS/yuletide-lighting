import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthContext } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { ensureStripeCustomer, lookupPromotionCode, subscriptionLineItem } from '@/lib/subscription-stripe';
import { checkoutPlanSchema } from '@clcrm/validators';

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = checkoutPlanSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
  }

  const promoCode = parsed.data.promoCode?.trim();
  let promotionCodeId: string | undefined;
  if (promoCode) {
    const match = await lookupPromotionCode(promoCode);
    if (!match) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 });
    }
    promotionCodeId = match.promo.id;
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(ctx.organizationId, ctx.email);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [subscriptionLineItem(parsed.data.plan)],
    success_url: `${appUrl}/app/settings/subscription?success=1`,
    cancel_url: `${appUrl}/app/settings/subscription?canceled=1`,
    client_reference_id: ctx.organizationId,
    metadata: {
      organizationId: ctx.organizationId,
      plan: parsed.data.plan,
      ...(promoCode ? { promoCode } : {}),
    },
    subscription_data: {
      metadata: {
        organizationId: ctx.organizationId,
        plan: parsed.data.plan,
        ...(promoCode ? { promoCode } : {}),
      },
    },
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
  });

  return NextResponse.json({ url: session.url });
}
