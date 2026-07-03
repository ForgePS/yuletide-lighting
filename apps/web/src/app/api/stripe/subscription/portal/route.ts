import { NextResponse } from 'next/server';
import { createAuthContext } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { getOrganization } from '@yuletide/firebase';

export async function POST() {
  const ctx = await createAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await getOrganization(ctx.organizationId);
  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account yet' }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/app/settings/subscription`,
  });

  return NextResponse.json({ url: session.url });
}
