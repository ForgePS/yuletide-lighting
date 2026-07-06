'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { labelProposalStatus } from '@/lib/proposal-utils';

export default function PortalDashboardPage() {
  const token = useParams().token as string;
  const { toast } = useToast();
  const [messageBody, setMessageBody] = useState('');
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.portal360.public.dashboard.useQuery({ token });
  const sendMessage = trpc.portal360.public.sendMessage.useMutation({
    onSuccess: () => {
      toast('Message sent — we\'ll get back to you soon', 'success');
      setMessageBody('');
      utils.portal360.public.dashboard.invalidate({ token });
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState message="Loading your portal..." />;
  if (isError || !data) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
        <ErrorState message="Portal access not found or disabled. Check your link or contact your provider." />
      </div>
    );
  }

  const brandColor = data.settings.portalPrimaryColor ?? data.organization?.brandColor ?? '#DC2626';
  const customerName = data.customer.businessName
    || `${data.customer.firstName ?? ''} ${data.customer.lastName ?? ''}`.trim();

  return (
    <div className="mesh-bg min-h-screen py-8">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <header className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: brandColor }}>
                {data.organization?.companyName ?? 'Customer Portal'}
              </h1>
              <p className="mt-1 text-muted-foreground">Welcome, {customerName}</p>
            </div>
            <Link href="/portal/login" className="text-sm text-muted-foreground hover:underline">Sign out</Link>
          </div>
        </header>

        {data.schedule.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold">Upcoming schedule</h2>
            <ul className="mt-4 space-y-3">
              {data.schedule.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.appointmentType.replace(/_/g, ' ')}</p>
                    {item.propertyAddress && <p className="text-xs text-muted-foreground">{item.propertyAddress}</p>}
                  </div>
                  <p className="text-sm">{formatDate(item.startAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.proposals.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold">Proposals</h2>
            <ul className="mt-4 space-y-3">
              {data.proposals.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(p.subtotalCents)} · {labelProposalStatus(p.status)}</p>
                  </div>
                  {p.publicToken && data.settings.permissions.approveDesigns && (
                    <Link href={`/p/${p.publicToken}`} className="btn-primary text-sm">
                      {['approved', 'deposit_paid', 'scheduled'].includes(p.status) ? 'View' : 'Review & approve'}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.invoices.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold">Invoices</h2>
            <ul className="mt-4 space-y-3">
              {data.invoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(inv.subtotalCents - inv.amountPaidCents)} due · {inv.status}
                    </p>
                  </div>
                  {inv.publicToken && data.settings.allowOnlinePayments && inv.status !== 'paid' && (
                    <Link href={`/pay/${inv.publicToken}`} className="btn-primary text-sm">Pay now</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.mockups.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold">Design mockups</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.mockups.map((m) => (
                <div key={m.id} className="overflow-hidden rounded-lg border">
                  <div className="relative aspect-video bg-muted">
                    <Image src={m.renderedImageUrl ?? m.imageUrl} alt={m.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    {m.approvalToken && m.status === 'in_review' && (
                      <Link href={`/m/${m.approvalToken}`} className="text-xs text-primary hover:underline">Review</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card p-6">
          <h2 className="font-semibold">Message your team</h2>
          <p className="mt-1 text-sm text-muted-foreground">Send a note and we&apos;ll respond as soon as possible.</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!messageBody.trim()) return;
              sendMessage.mutate({ token, body: messageBody.trim() });
            }}
          >
            <textarea
              className="input min-h-[100px] w-full"
              placeholder="How can we help?"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={sendMessage.isPending || !messageBody.trim()}>
              {sendMessage.isPending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.settings.allowServiceRequests && data.settings.permissions.requestService && (
            <Link href={`/portal/${token}/service-request`} className="card block p-6 hover:border-primary">
              <h2 className="font-semibold">Request service</h2>
              <p className="mt-2 text-sm text-muted-foreground">Report an issue with your display or schedule a repair visit.</p>
            </Link>
          )}
          {data.settings.enabled && (
            <Link href={`/portal/${token}/rebook`} className="card block p-6 hover:border-primary">
              <h2 className="font-semibold">Rebook next season</h2>
              <p className="mt-2 text-sm text-muted-foreground">Request the same design for next year — we&apos;ll reach out to confirm.</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
