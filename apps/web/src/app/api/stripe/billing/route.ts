import { NextRequest, NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { updateOrganization } from '@yuletide/firebase';

export async function POST(req: NextRequest) {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();

  const account = await stripe.accounts.create({ type: 'express' });
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?stripe=success`,
    type: 'account_onboarding',
  });

  await updateOrganization(ctx.organizationId, { stripeConnectAccountId: account.id });

  return NextResponse.json({ url: accountLink.url });
}
