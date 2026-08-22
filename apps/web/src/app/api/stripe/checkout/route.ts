import { NextRequest, NextResponse } from 'next/server';
import { inferInvoicePaymentType, isValidPublicAccessToken } from '@clcrm/types';
import { getStripe } from '@/lib/stripe';
import {
  getByPublicToken,
  getOrganization,
  portalInvoicePayableCents,
  portalPaymentSafeMode,
  recordInvoicePayment360,
} from '@yuletide/firebase';

/**
 * Portal / public invoice checkout (P2-S6 / YL-S13).
 * Amount is server-authoritative. Live charges blocked in emulator/safe mode.
 * Safe-mode records payment via recordInvoicePayment360 so the AR loop closes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const invoiceToken = typeof body.invoiceToken === 'string' ? body.invoiceToken.trim() : '';
    // YL-S22: fail closed on weak / malformed public tokens (same bar as getByPublicToken).
    if (!isValidPublicAccessToken(invoiceToken)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const invoice = await getByPublicToken<Record<string, unknown>>('invoices', invoiceToken);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orgId = String(invoice.organizationId ?? '');
    if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payable = portalInvoicePayableCents({
      status: invoice.status as string | undefined,
      subtotalCents: Number(invoice.subtotalCents ?? 0),
      amountPaidCents: Number(invoice.amountPaidCents ?? 0),
      depositCents: Number(invoice.depositCents ?? 0),
    });
    if (!payable.payable || payable.amountCents <= 0) {
      return NextResponse.json({ error: 'This action is no longer available.' }, { status: 409 });
    }

    // Ignore client amountCents entirely — server invoice truth only.
    const amountCents = payable.amountCents;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';
    const invoiceId = String(invoice.id);
    const paymentType = inferInvoicePaymentType(
      {
        subtotalCents: Number(invoice.subtotalCents ?? 0),
        amountPaidCents: Number(invoice.amountPaidCents ?? 0),
        depositCents: Number(invoice.depositCents ?? 0),
      },
      amountCents,
    );

    if (portalPaymentSafeMode()) {
      // EMULATOR / safe-mode: no Stripe network call; still record AR payment.
      const mockId = `mock_cs_${invoiceId}_${amountCents}_${Date.now()}`;
      await recordInvoicePayment360(
        orgId,
        {
          invoiceId,
          amountCents,
          paymentType,
          paymentMethod: 'credit_card',
          transactionId: mockId,
          processor: 'safe_mode',
          notes: 'Safe-mode simulated payment',
        },
        null,
      );
      return NextResponse.json({
        url: `${appUrl}/pay/${invoiceToken}?success=1&mock=1&session=${encodeURIComponent(mockId)}`,
        amountCents,
        mode: 'safe',
        providerCalls: 0,
      });
    }

    const org = await getOrganization(orgId);
    const stripe = getStripe();
    const idempotencyKey = `portal-checkout:${orgId}:${invoiceId}:${amountCents}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card', 'us_bank_account'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: `Invoice ${String(invoice.invoiceNumber ?? invoice.id)}` },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/pay/${invoiceToken}?success=1`,
        cancel_url: `${appUrl}/pay/${invoiceToken}`,
        metadata: {
          invoiceId,
          organizationId: orgId,
          amountCents: String(amountCents),
        },
        ...(org?.stripeConnectAccountId
          ? { payment_intent_data: { transfer_data: { destination: org.stripeConnectAccountId } } }
          : {}),
      },
      { idempotencyKey },
    );

    return NextResponse.json({ url: session.url, amountCents, mode: 'stripe' });
  } catch {
    return NextResponse.json({ error: 'Your request could not be completed.' }, { status: 400 });
  }
}
