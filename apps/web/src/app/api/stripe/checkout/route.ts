import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getByPublicToken, getOrganization } from '@yuletide/firebase';

export async function POST(req: NextRequest) {
  const { invoiceToken, amountCents } = await req.json();
  const stripe = getStripe();

  const invoice = await getByPublicToken<Record<string, unknown>>('invoices', invoiceToken);
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const orgId = invoice.organizationId as string;
  const org = await getOrganization(orgId);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'us_bank_account'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Invoice ${invoice.invoiceNumber}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceToken}?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceToken}`,
    metadata: {
      invoiceId: invoice.id as string,
      organizationId: orgId,
    },
    ...(org?.stripeConnectAccountId
      ? { payment_intent_data: { transfer_data: { destination: org.stripeConnectAccountId } } }
      : {}),
  });

  return NextResponse.json({ url: session.url });
}
