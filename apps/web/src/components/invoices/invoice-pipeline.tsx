'use client';



import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { useMemo, useState } from 'react';

import { trpc } from '@/lib/trpc';

import { formatCurrency, statusColor } from '@/lib/invoice-utils';

import { formatDate } from '@clcrm/ui';

import { LoadingState, EmptyState } from '@/components/ui/states';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { useToast } from '@/lib/toast';

import { useAnalyticsYear } from '@/lib/analytics-year-context';

import { invoiceInYear } from '@/lib/year-filter-utils';

import { InvoiceCreateForm } from './invoice-create-form';

import type { InvoiceRecord } from '@clcrm/types';



const PIPELINE_COLUMNS = [

  { key: 'draft', label: 'Draft' },

  { key: 'sent', label: 'Sent' },

  { key: 'viewed', label: 'Viewed' },

  { key: 'pending_payment', label: 'Pending' },

  { key: 'partially_paid', label: 'Partial' },

  { key: 'overdue', label: 'Overdue' },

  { key: 'in_collection', label: 'Collection' },

  { key: 'disputed', label: 'Disputed' },

  { key: 'paid', label: 'Paid' },

];



function InvoiceCard({

  invoice,

  onRemove,

}: {

  invoice: InvoiceRecord;

  onRemove: (invoice: InvoiceRecord) => void;

}) {

  return (

    <Link

      href={`/app/invoices/${invoice.id}`}

      className="block rounded-lg border border-border bg-white p-3 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"

    >

      <div className="flex items-start justify-between gap-2">

        <span className="font-medium text-primary">{invoice.invoiceNumber}</span>

        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor(invoice.status)}`}>{invoice.status.replace(/_/g, ' ')}</span>

      </div>

      <p className="mt-1 text-muted-foreground">{invoice.customerName ?? 'Customer'}</p>

      <p className="mt-2 font-semibold">{formatCurrency(invoice.balanceDueCents)}</p>

      <p className="text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>

      <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.preventDefault()}>

        <button type="button" className="btn-ghost px-2 py-1 text-xs text-primary" onClick={() => onRemove(invoice)}>Remove</button>

      </div>

    </Link>

  );

}



export function InvoicePipeline() {
  const router = useRouter();
  const { toast } = useToast();
  const { year } = useAnalyticsYear();

  const [view, setView] = useState<'kanban' | 'table'>('table');

  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const { data: pipeline, isLoading } = trpc.invoices360.pipeline.useQuery();

  const { data: list, refetch: refetchList } = trpc.invoices360.list.useQuery();

  const utils = trpc.useUtils();

  const [removing, setRemoving] = useState<InvoiceRecord | null>(null);



  const remove = trpc.invoices360.delete.useMutation({

    onSuccess: () => {

      toast('Invoice removed', 'success');

      setRemoving(null);

      refetchList();

      utils.invoices360.invalidate();

    },

    onError: () => toast('Could not remove invoice', 'error'),

  });



  const filtered = useMemo(() => {

    const q = search.trim().toLowerCase();

    return (list ?? []).filter((inv) => {

      if (!invoiceInYear(inv, year)) return false;

      if (statusFilter && inv.status !== statusFilter) return false;

      if (!q) return true;

      return (

        inv.invoiceNumber.toLowerCase().includes(q)

        || (inv.customerName ?? '').toLowerCase().includes(q)

      );

    });

  }, [list, search, statusFilter, year]);



  if (isLoading) return <LoadingState message="Loading invoices..." />;



  return (

    <div className="space-y-4">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex flex-wrap gap-2">

          <button type="button" className="btn-primary" onClick={() => setCreating((v) => !v)}>

            {creating ? 'Cancel' : '+ New invoice'}

          </button>

          <button type="button" className={view === 'table' ? 'btn-secondary' : 'btn-ghost'} onClick={() => setView('table')}>List</button>

          <button type="button" className={view === 'kanban' ? 'btn-secondary' : 'btn-ghost'} onClick={() => setView('kanban')}>Pipeline</button>

        </div>

        <div className="flex flex-wrap gap-2">

          <input

            className="input w-full sm:w-56"

            placeholder="Search invoice or customer..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>

            <option value="">All statuses</option>

            {PIPELINE_COLUMNS.map((c) => (

              <option key={c.key} value={c.key}>{c.label}</option>

            ))}

          </select>

        </div>

      </div>



      {creating && (

        <InvoiceCreateForm onCancel={() => setCreating(false)} onSuccess={() => { setCreating(false); refetchList(); utils.invoices360.invalidate(); }} />

      )}



      {!list?.length && !creating ? (

        <EmptyState

          title="No invoices yet"

          description="Create an invoice from an approved proposal or start a new invoice for any customer."

          action={<button type="button" className="btn-primary mt-4" onClick={() => setCreating(true)}>Create first invoice</button>}

        />

      ) : view === 'kanban' && pipeline ? (

        <div className="flex gap-4 overflow-x-auto pb-4">

          {PIPELINE_COLUMNS.map((col) => {

            const items = (pipeline[col.key] ?? []).filter((inv) => filtered.some((f) => f.id === inv.id));

            return (

              <div key={col.key} className="min-w-[220px] flex-shrink-0">

                <h3 className="mb-3 text-sm font-semibold">{col.label} ({items.length})</h3>

                <div className="space-y-2">

                  {items.map((inv) => (

                    <InvoiceCard key={inv.id} invoice={inv} onRemove={setRemoving} />

                  ))}

                </div>

              </div>

            );

          })}

        </div>

      ) : (

        <div className="overflow-hidden rounded-xl border bg-white">

          <table className="data-table w-full">

            <thead>

              <tr>

                <th>Number</th>

                <th>Customer</th>

                <th>Status</th>

                <th>Total</th>

                <th>Balance</th>

                <th>Due</th>

                <th>Overdue</th>

                <th></th>

              </tr>

            </thead>

            <tbody>

              {filtered.map((invoice) => (

                <tr key={invoice.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/app/invoices/${invoice.id}`)}>

                  <td className="font-medium text-primary">{invoice.invoiceNumber}</td>

                  <td>

                    <Link href={`/app/customers/${invoice.customerId}/billing`} className="hover:underline" onClick={(e) => e.stopPropagation()}>

                      {invoice.customerName ?? '—'}

                    </Link>

                  </td>

                  <td><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor(invoice.status)}`}>{invoice.status.replace(/_/g, ' ')}</span></td>

                  <td>{formatCurrency(invoice.subtotalCents)}</td>

                  <td>{formatCurrency(invoice.balanceDueCents)}</td>

                  <td>{formatDate(invoice.dueDate)}</td>

                  <td>{invoice.daysOverdue > 0 ? `${invoice.daysOverdue}d` : '—'}</td>

                  <td onClick={(e) => e.stopPropagation()}>

                    <button type="button" className="btn-ghost px-2 py-1 text-xs text-primary" onClick={() => setRemoving(invoice)}>Remove</button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {!filtered.length && (

            <p className="p-6 text-center text-sm text-muted-foreground">No invoices match your filters.</p>

          )}

        </div>

      )}



      <ConfirmDialog

        open={!!removing}

        title="Remove invoice?"

        message={removing?.amountPaidCents

          ? 'This invoice has payments, so it will be removed from active AR instead of hard-deleted.'

          : 'Draft invoices without payments are deleted; sent/active invoices are cancelled.'}

        confirmLabel="Remove invoice"

        destructive

        onCancel={() => setRemoving(null)}

        onConfirm={() => removing && remove.mutate({ invoiceId: removing.id })}

        loading={remove.isPending}

      />

    </div>

  );

}



export function InvoiceActivityTimeline({ invoiceId }: { invoiceId: string }) {

  const { data } = trpc.invoices360.activity.list.useQuery({ invoiceId });

  if (!data?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (

    <ol className="space-y-3 border-l-2 border-border pl-4">

      {data.map((a) => (

        <li key={a.id} className="relative">

          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />

          <p className="text-sm font-medium">{a.title}</p>

          {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}

          <p className="text-xs text-muted-foreground">{formatDate(a.occurredAt)}</p>

        </li>

      ))}

    </ol>

  );

}

