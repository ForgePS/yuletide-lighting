'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { invoicePayableCents, formatInvoiceStatusLabel } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@clcrm/ui';

export default function PublicPaymentPage() {
  const params = useParams();
  const search = useSearchParams();
  const token = params.token as string;
  const success = search.get('success') === '1';
  const { data, refetch, isFetching } = trpc.invoices.getByToken.useQuery({ token });

  if (!data) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const { invoice, customer, organization } = data;
  const payable = invoicePayableCents(invoice);
  const balanceDue = Math.max(0, invoice.subtotalCents - invoice.amountPaidCents);

  async function handlePay() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceToken: token }),
    });
    const payload = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (payload?.url) {
      window.location.href = payload.url;
      return;
    }
    alert(payload?.error ?? 'Checkout unavailable');
  }

  return (
    <div className="mesh-bg min-h-screen py-12">
      <div className="card mx-auto max-w-lg p-8 shadow-soft">
        <h1 className="text-xl font-bold" style={{ color: organization?.brandColor ?? '#DC2626' }}>
          {organization?.companyName}
        </h1>
        <p className="mt-2 text-muted-foreground">Invoice {invoice.invoiceNumber}</p>
        <p className="text-sm text-muted-foreground">
          {customer?.firstName} {customer?.lastName}
        </p>
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {formatInvoiceStatusLabel(invoice.status)}
        </p>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total</span>
            <span>{formatCurrency(invoice.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatCurrency(invoice.amountPaidCents)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Balance due</span>
            <span>{formatCurrency(balanceDue)}</span>
          </div>
          {payable.payable && payable.amountCents !== balanceDue && (
            <div className="flex justify-between text-muted-foreground">
              <span>Next payment due</span>
              <span>{formatCurrency(payable.amountCents)}</span>
            </div>
          )}
        </div>

        {success && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm text-green-800">
            Payment received. Thank you!
            <button type="button" className="ml-2 underline" onClick={() => void refetch()} disabled={isFetching}>
              Refresh
            </button>
          </div>
        )}

        {invoice.status === 'paid' || balanceDue <= 0 ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-center text-green-800">
            Paid in full — thank you!
          </div>
        ) : payable.payable ? (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => void handlePay()}
              style={{ backgroundColor: organization?.brandColor ?? undefined }}
              className="btn-primary w-full py-3"
            >
              Pay {formatCurrency(payable.amountCents)}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Amount is calculated server-side (deposit first when applicable).
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
            This invoice is not currently payable online.
          </div>
        )}
      </div>
    </div>
  );
}
