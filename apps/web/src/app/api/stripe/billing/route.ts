import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { getOrganization, updateOrganization } from '@yuletide/firebase';

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * GET — Stripe Connect status for the signed-in org.
 * POST — Start or resume Express Connect onboarding.
 */
export async function GET() {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!stripeConfigured()) {
    return NextResponse.json({
      platformConfigured: false,
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId: null,
      message: 'STRIPE_SECRET_KEY is not set on the server',
    });
  }

  const org = await getOrganization(ctx.organizationId);
  const accountId = org?.stripeConnectAccountId ?? null;
  if (!accountId) {
    return NextResponse.json({
      platformConfigured: true,
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId: null,
    });
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return NextResponse.json({
      platformConfigured: true,
      connected: Boolean(account.charges_enabled && account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      accountId,
      payoutsEnabled: Boolean(account.payouts_enabled),
    });
  } catch {
    return NextResponse.json({
      platformConfigured: true,
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId,
      message: 'Saved Connect account could not be loaded from Stripe',
    });
  }
}

export async function POST(_req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Stripe is not configured on the server. Set STRIPE_SECRET_KEY (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) then restart.',
      },
      { status: 503 },
    );
  }

  try {
    const stripe = getStripe();
    const org = await getOrganization(ctx.organizationId);
    let accountId = org?.stripeConnectAccountId ?? null;

    if (accountId) {
      try {
        const existing = await stripe.accounts.retrieve(accountId);
        if (existing.charges_enabled && existing.details_submitted) {
          return NextResponse.json({
            alreadyConnected: true,
            accountId,
            url: null,
          });
        }
      } catch {
        // Stale id — create a fresh Express account
        accountId = null;
      }
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organizationId: ctx.organizationId,
        },
      });
      accountId = account.id;
      await updateOrganization(ctx.organizationId, { stripeConnectAccountId: accountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appOrigin()}/app/settings/integrations?stripe=refresh`,
      return_url: `${appOrigin()}/app/settings/integrations?stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start Stripe Connect';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
