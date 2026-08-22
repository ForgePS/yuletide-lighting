import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { inferInvoicePaymentType } from '@clcrm/types';
import { getStripe } from '@/lib/stripe';
import {
  applySubscriptionUpdate,
  findOrgByStripeCustomerId,
  mapStripeSubscriptionStatus,
  planFromPriceId,
  recordSubscriptionPayment,
  recordInvoicePayment360,
  getInvoice360,
} from '@yuletide/firebase';

async function resolveOrgId(subscription: Stripe.Subscription, customerId: string) {
  const orgId = subscription.metadata?.organizationId;
  if (orgId) return orgId;
  const orgDoc = await findOrgByStripeCustomerId(customerId);
  return orgDoc?.id ?? null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const orgId = await resolveOrgId(subscription, customerId);
  if (!orgId) return;

  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  const plan = planFromPriceId(priceId)
    ?? (item?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly');

  await applySubscriptionUpdate(orgId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
    subscriptionPlan: plan,
    subscriptionInterval: plan === 'yearly' ? 'year' : 'month',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    lockedAt: null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === 'subscription') {
      const orgId = session.metadata?.organizationId ?? session.client_reference_id;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (orgId && customerId) {
        await applySubscriptionUpdate(orgId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
          subscriptionPlan: (session.metadata?.plan as 'monthly' | 'yearly' | undefined) ?? null,
        });
      }
    } else {
      // YL-S13: customer AR invoice checkout — canonical recordInvoicePayment360 path.
      const invoiceId = session.metadata?.invoiceId;
      const orgId = session.metadata?.organizationId;
      if (invoiceId && orgId) {
        const amountCents = session.amount_total ?? Number(session.metadata?.amountCents ?? 0);
        if (amountCents > 0) {
          const invoice = await getInvoice360(orgId, invoiceId);
          if (invoice) {
            const paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? session.id;
            await recordInvoicePayment360(
              orgId,
              {
                invoiceId,
                amountCents,
                paymentType: inferInvoicePaymentType(invoice, amountCents),
                paymentMethod: 'credit_card',
                transactionId: paymentIntentId,
                processor: 'stripe',
                notes: 'Stripe Checkout',
              },
              null,
            );
          }
        }
      }
    }
  }

  if (
    event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const orgId = await resolveOrgId(subscription, customerId);
    if (orgId) {
      await applySubscriptionUpdate(orgId, {
        subscriptionStatus: 'canceled',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: true,
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription) {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) return NextResponse.json({ received: true });
      const orgDoc = await findOrgByStripeCustomerId(customerId);
      if (orgDoc) {
        const orgId = orgDoc.id;
        const priceId = invoice.lines.data[0]?.price?.id;
        await recordSubscriptionPayment(orgId, {
          stripeInvoiceId: invoice.id,
          amountCents: invoice.amount_paid ?? 0,
          currency: invoice.currency ?? 'usd',
          status: invoice.status ?? 'paid',
          plan: planFromPriceId(priceId),
          paidAt: new Date((invoice.status_transitions.paid_at ?? invoice.created) * 1000),
        });
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (customerId) {
      const orgDoc = await findOrgByStripeCustomerId(customerId);
      if (orgDoc) {
        await applySubscriptionUpdate(orgDoc.id, { subscriptionStatus: 'past_due' });
      }
    }
  }

  return NextResponse.json({ received: true });
}
