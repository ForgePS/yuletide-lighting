'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import {
  PortalStickyBar,
  PortalStatusPill,
  PortalResponsiveTable,
} from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export function PortalBillingPage() {
  return (
    <PortalAuthedFrame title="Billing" feature="billing" stickyPad>
      {({ enabledFeatures }) => <BillingBody />}
    </PortalAuthedFrame>
  );
}

function BillingBody() {
  const { data: dash } = trpc.portal360.public.dashboard.useQuery(portalSessionInput);
  const { data, isLoading, isError } = trpc.portal360.public.invoices.useQuery(portalSessionInput);
  const [paying, setPaying] = useState(false);

  if (isLoading) return <LoadingState message="Loading invoices..." />;
  if (isError) return <p className="text-base text-red-600">Could not load invoices.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        No invoices yet.
      </p>
    );
  }

  const open = data.filter(
    (i) => i.status !== 'paid' && i.status !== 'void' && i.status !== 'cancelled',
  );
  const balanceDue = open.reduce(
    (sum, i) => sum + Math.max(0, i.subtotalCents - i.amountPaidCents),
    0,
  );
  const canPay = Boolean(dash?.settings.allowOnlinePayments);
  const primaryPay = open.find(
    (i) => i.publicToken && Math.max(0, i.subtotalCents - i.amountPaidCents) > 0,
  );

  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:flex md:items-end md:justify-between md:gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Amount due</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{formatCurrency(balanceDue)}</p>
          <p className="mt-1 text-base text-stone-600">
            {open.length} open invoice{open.length === 1 ? '' : 's'}
          </p>
        </div>
        {primaryPay?.publicToken && canPay && balanceDue > 0 && (
          <Link
            href={`/pay/${primaryPay.publicToken}`}
            className="btn-primary mt-4 hidden min-h-11 items-center px-6 text-base md:inline-flex"
            onClick={() => setPaying(true)}
          >
            {paying ? 'Opening…' : `Pay ${formatCurrency(balanceDue)}`}
          </Link>
        )}
      </div>

      <PortalResponsiveTable
        rows={data}
        columns={[
          {
            key: 'num',
            header: 'Invoice',
            cell: (inv) => <span className="font-semibold">{inv.invoiceNumber}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (inv) => (
              <PortalStatusPill tone={inv.status === 'paid' ? 'success' : 'warn'}>
                {inv.status.replace(/_/g, ' ')}
              </PortalStatusPill>
            ),
          },
          {
            key: 'due',
            header: 'Amount due',
            cell: (inv) => formatCurrency(Math.max(0, inv.subtotalCents - inv.amountPaidCents)),
          },
          {
            key: 'date',
            header: 'Due date',
            cell: (inv) => (inv.dueDate ? formatDate(inv.dueDate) : '—'),
          },
          {
            key: 'action',
            header: '',
            className: 'text-right',
            cell: (inv) => {
              const remaining = Math.max(0, inv.subtotalCents - inv.amountPaidCents);
              if (!inv.publicToken) return null;
              const pay = canPay && inv.status !== 'paid' && remaining > 0;
              return (
                <Link
                  href={`/pay/${inv.publicToken}`}
                  className={pay ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
                >
                  {pay ? 'Pay' : 'View'}
                </Link>
              );
            },
          },
        ]}
        mobileCard={(inv) => {
          const remaining = Math.max(0, inv.subtotalCents - inv.amountPaidCents);
          return (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-stone-900">{inv.invoiceNumber}</p>
                <PortalStatusPill tone={inv.status === 'paid' ? 'success' : 'warn'}>
                  {inv.status.replace(/_/g, ' ')}
                </PortalStatusPill>
              </div>
              <p className="mt-2 text-base text-stone-700">
                {formatCurrency(remaining)} due
                {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
              </p>
              {inv.publicToken && (
                <Link
                  href={`/pay/${inv.publicToken}`}
                  className={`${canPay && inv.status !== 'paid' && remaining > 0 ? 'btn-primary' : 'btn-secondary'} mt-4 inline-flex min-h-11 w-full items-center justify-center text-base`}
                >
                  {canPay && inv.status !== 'paid' && remaining > 0 ? 'Pay now' : 'View invoice'}
                </Link>
              )}
            </div>
          );
        }}
      />

      {primaryPay?.publicToken && canPay && balanceDue > 0 && (
        <PortalStickyBar>
          <Link
            href={`/pay/${primaryPay.publicToken}`}
            className="btn-primary inline-flex min-h-11 w-full items-center justify-center text-base md:hidden"
            onClick={() => setPaying(true)}
          >
            {paying ? 'Opening secure payment…' : `Pay ${formatCurrency(balanceDue)}`}
          </Link>
        </PortalStickyBar>
      )}
    </>
  );
}
