'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, statusColor } from '@/lib/invoice-utils';
import { formatDate } from '@clcrm/ui';
import { LoadingState } from '@/components/ui/states';
import { InvoiceCreateForm } from './invoice-create-form';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { invoiceInYear } from '@/lib/year-filter-utils';

export function CustomerBilling({ customerId }: { customerId: string }) {
  const { year } = useAnalyticsYear();
  const { data, isLoading, refetch } = trpc.invoices360.customers.balance.useQuery({ customerId });
  const [creating, setCreating] = useState(false);

  const open = useMemo(
    () => (data?.openInvoices ?? []).filter((inv) => invoiceInYear(inv, year)),
    [data?.openInvoices, year],
  );
  const paid = useMemo(
    () => (data?.paidInvoices ?? []).filter((inv) => invoiceInYear(inv, year)),
    [data?.paidInvoices, year],
  );

  if (isLoading) return <LoadingState message="Loading billing..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Billing & invoices</h2>
          <p className="text-sm text-muted-foreground">
            Outstanding balance: <span className="font-semibold text-foreground">{formatCurrency(data?.outstandingBalanceCents ?? 0)}</span>
            {data?.depositsCents ? <> · Deposits received: {formatCurrency(data.depositsCents)}</> : null}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : 'New invoice'}
        </button>
      </div>

      {creating && (
        <InvoiceCreateForm
          defaultCustomerId={customerId}
          compact
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}

      <InvoiceTable title="Open invoices" invoices={open} empty="No open invoices." />
      <InvoiceTable title="Paid invoices" invoices={paid} empty="No paid invoices yet." />
    </div>
  );
}

function InvoiceTable({
  title,
  invoices,
  empty,
}: {
  title: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    balanceDueCents: number;
    amountPaidCents: number;
    subtotalCents: number;
    dueDate: Date;
  }>;
  empty: string;
}) {
  if (!invoices.length) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">{title} ({invoices.length})</h3>
      </div>
      <table className="data-table w-full">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Status</th>
            <th>Total</th>
            <th>Balance</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>
                <Link href={`/app/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                  {inv.invoiceNumber}
                </Link>
              </td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor(inv.status)}`}>
                  {inv.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td>{formatCurrency(inv.subtotalCents)}</td>
              <td>{formatCurrency(inv.balanceDueCents)}</td>
              <td>{formatDate(inv.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
