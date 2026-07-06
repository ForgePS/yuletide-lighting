'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@clcrm/ui';

export default function PublicPaymentPage() {
  const params = useParams();
  const token = params.token as string;
  const { data } = trpc.invoices360.public.getByToken.useQuery({ token });
  const recordView = trpc.invoices360.public.recordView.useMutation();

  useEffect(() => {
    if (!token) return;
    recordView.mutate({ token });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!data) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const { invoice, customer, organization, template, renderedTemplate } = data;
  const balanceDue = invoice.subtotalCents - invoice.amountPaidCents;
  const depositDue = Math.max(0, invoice.depositCents - invoice.amountPaidCents);

  async function handlePay(amountCents: number) {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceToken: token, amountCents }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
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
        </div>

        {(template || renderedTemplate?.renderedBlocks?.length) && (
          <div className="mt-6 rounded-lg border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Invoice template preview
            </p>
            <div
              className="relative mt-2 overflow-hidden rounded border bg-white"
              style={{
                width: '100%',
                aspectRatio: `${template?.pageWidth ?? 1024}/${template?.pageHeight ?? 1325}`,
                backgroundImage: template?.backgroundImageUrl ? `url(${template.backgroundImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {template?.logoUrl && (
                <img src={template.logoUrl} alt="Invoice logo" className="absolute left-4 top-4 h-12 max-w-[180px] object-contain" />
              )}
              {(renderedTemplate?.renderedBlocks ?? []).map((block) => (
                <div
                  key={block.id}
                  className="absolute rounded border border-dashed border-primary/40 px-1 py-0.5 text-[10px] sm:text-xs"
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: `${block.width}%`,
                    height: `${block.height}%`,
                    color: template?.primaryColor ?? '#DC2626',
                    textAlign: block.align ?? 'left',
                    fontSize: `${block.textSize ?? 11}px`,
                  }}
                >
                  {block.type === 'image' ? '[Image]' : (block.content || '')}
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.status === 'paid' ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-center text-green-800">
            Paid in full — thank you!
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {depositDue > 0 && invoice.amountPaidCents === 0 && (
              <button
                onClick={() => handlePay(depositDue)}
                style={{ backgroundColor: organization?.brandColor ?? undefined }}
                className="btn-primary w-full py-3"
              >
                Pay deposit ({formatCurrency(depositDue)})
              </button>
            )}
            {balanceDue > 0 && (
              <button onClick={() => handlePay(balanceDue)} className="btn-secondary w-full py-3">
                Pay balance ({formatCurrency(balanceDue)})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
