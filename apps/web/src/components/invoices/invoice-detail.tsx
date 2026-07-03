'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency, statusColor } from '@/lib/invoice-utils';
import { formatDate } from '@clcrm/ui';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InvoiceActivityTimeline } from './invoice-pipeline';
import type { InvoiceRecord } from '@clcrm/types';

function toDateInput(date?: Date | string | null) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function payUrl(token: string) {
  if (typeof window !== 'undefined') return `${window.location.origin}/pay/${token}`;
  return `/pay/${token}`;
}

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } = trpc.invoices360.getById.useQuery({ invoiceId });
  const { data: payments } = trpc.invoices360.payments.list.useQuery({ invoiceId }, { enabled: !!data });
  const [editing, setEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const send = trpc.invoices360.send.useMutation({
    onSuccess: () => {
      toast('Invoice sent', 'success');
      refetch();
      utils.invoices360.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const update = trpc.invoices360.update.useMutation({
    onSuccess: () => {
      toast('Invoice updated', 'success');
      setEditing(false);
      refetch();
      utils.invoices360.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const remove = trpc.invoices360.delete.useMutation({
    onSuccess: () => {
      toast('Invoice removed', 'success');
      router.push('/app/invoices');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState message="Loading invoice..." />;
  if (isError || !data) return <ErrorState message="Invoice not found." onRetry={() => refetch()} />;

  const canSend = data.status === 'draft';
  const url = payUrl(data.publicToken);

  const copyPayLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Payment link copied', 'success');
    } catch {
      toast('Could not copy link', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{data.invoiceNumber}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(data.status)}`}>
                {data.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.customerName && (
                <>
                  <Link href={`/app/customers/${data.customerId}/billing`} className="text-primary hover:underline">
                    {data.customerName}
                  </Link>
                  {' · '}
                </>
              )}
              Due {formatDate(data.dueDate)}
              {data.sentAt && <> · Sent {formatDate(data.sentAt)}</>}
            </p>
            {data.proposalId && (
              <p className="mt-1 text-sm">
                From proposal{' '}
                <Link href={`/app/proposals/${data.proposalId}`} className="text-primary hover:underline">
                  View proposal
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canSend && (
              <button type="button" className="btn-primary" disabled={send.isPending} onClick={() => send.mutate({ invoiceId })}>
                {send.isPending ? 'Sending...' : 'Send invoice'}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
            {data.balanceDueCents > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setPaymentOpen(true)}>Record payment</button>
            )}
            <button type="button" className="btn-secondary" onClick={copyPayLink}>
              <Copy className="h-4 w-4" /> Copy pay link
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink className="h-4 w-4" /> Customer view
            </a>
            <button type="button" className="btn-ghost text-primary" onClick={() => setRemoveOpen(true)}>Remove</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="font-semibold">Amounts</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium">{formatCurrency(data.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Deposit ({data.depositPercent}%)</dt><dd>{formatCurrency(data.depositCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd className="text-emerald-600">{formatCurrency(data.amountPaidCents)}</dd></div>
            <div className="flex justify-between border-t pt-2"><dt className="font-medium">Balance due</dt><dd className="text-lg font-semibold">{formatCurrency(data.balanceDueCents)}</dd></div>
          </dl>
          {data.daysOverdue > 0 && data.balanceDueCents > 0 && (
            <p className="mt-3 text-sm text-red-600">{data.daysOverdue} days overdue</p>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold">Details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Property</dt><dd>{data.propertyAddress || '—'}</dd></div>
            <div><dt className="text-muted-foreground">Views</dt><dd>{data.viewCount}{data.lastViewedAt ? ` · last ${formatDate(data.lastViewedAt)}` : ''}</dd></div>
            <div><dt className="text-muted-foreground">Reminders</dt><dd>{data.remindersPaused ? 'Paused' : 'Active'}</dd></div>
            <div><dt className="text-muted-foreground">Created</dt><dd>{formatDate(data.createdAt)}</dd></div>
          </dl>
          {data.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{data.notes}</p>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <InvoiceEditPanel
          invoice={data}
          loading={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(payload) => update.mutate({ invoiceId, data: payload })}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Payments</h2>
          {!payments?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{formatCurrency(p.amountCents)}</p>
                    <p className="text-xs capitalize text-muted-foreground">{p.paymentMethod.replace(/_/g, ' ')} · {p.paymentType}</p>
                  </div>
                  <span className="text-muted-foreground">{formatDate(p.paidAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Activity</h2>
          <div className="mt-4">
            <InvoiceActivityTimeline invoiceId={invoiceId} />
          </div>
        </div>
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        invoice={data}
        onClose={() => setPaymentOpen(false)}
        onSuccess={() => {
          setPaymentOpen(false);
          refetch();
          utils.invoices360.invalidate();
        }}
      />

      <ConfirmDialog
        open={removeOpen}
        title="Remove invoice?"
        message={data.amountPaidCents
          ? 'This invoice has payments and will be cancelled rather than deleted.'
          : 'Draft invoices without payments are deleted; sent invoices are cancelled.'}
        confirmLabel="Remove invoice"
        destructive
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => remove.mutate({ invoiceId })}
        loading={remove.isPending}
      />
    </div>
  );
}

function InvoiceEditPanel({
  invoice,
  loading,
  onCancel,
  onSubmit,
}: {
  invoice: InvoiceRecord;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    subtotalCents?: number;
    depositPercent?: number;
    dueDate?: Date;
    notes?: string;
    propertyAddress?: string;
    remindersPaused?: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    subtotalDollars: (invoice.subtotalCents / 100).toFixed(2),
    depositPercent: invoice.depositPercent,
    dueDate: toDateInput(invoice.dueDate),
    propertyAddress: invoice.propertyAddress ?? '',
    notes: invoice.notes ?? '',
    remindersPaused: invoice.remindersPaused,
  });

  return (
    <form
      className="card grid gap-4 p-6 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          subtotalCents: Math.round(parseFloat(form.subtotalDollars || '0') * 100),
          depositPercent: Number(form.depositPercent) || 0,
          dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
          propertyAddress: form.propertyAddress,
          notes: form.notes,
          remindersPaused: form.remindersPaused,
        });
      }}
    >
      <div className="sm:col-span-2"><h2 className="font-semibold">Edit invoice</h2></div>
      <div>
        <label className="mb-1 block text-sm font-medium">Amount ($)</label>
        <input className="input w-full" type="number" step="0.01" value={form.subtotalDollars} onChange={(e) => setForm({ ...form, subtotalDollars: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Deposit %</label>
        <input className="input w-full" type="number" min={0} max={100} value={form.depositPercent} onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Due date</label>
        <input className="input w-full" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Property address</label>
        <input className="input w-full" value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={form.remindersPaused} onChange={(e) => setForm({ ...form, remindersPaused: e.target.checked })} />
        Pause payment reminders
      </label>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea className="input w-full" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>
  );
}

function RecordPaymentDialog({
  open,
  invoice,
  onClose,
  onSuccess,
}: {
  open: boolean;
  invoice: InvoiceRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'check' | 'cash' | 'credit_card' | 'ach' | 'wire_transfer'>('check');
  const [type, setType] = useState<'deposit' | 'partial' | 'final'>('partial');

  const record = trpc.invoices360.payments.record.useMutation({
    onSuccess: () => {
      toast('Payment recorded', 'success');
      setAmount('');
      onSuccess();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="card w-full max-w-md space-y-4 bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const amountCents = Math.round(parseFloat(amount || '0') * 100);
          if (amountCents <= 0) {
            toast('Enter a valid amount', 'error');
            return;
          }
          record.mutate({
            invoiceId: invoice.id,
            amountCents,
            paymentType: type,
            paymentMethod: method,
          });
        }}
      >
        <h2 className="font-semibold">Record payment</h2>
        <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} · {formatCurrency(invoice.balanceDueCents)} due</p>
        <input className="input w-full" type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        <select className="input w-full" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="deposit">Deposit</option>
          <option value="partial">Partial</option>
          <option value="final">Final</option>
        </select>
        <select className="input w-full" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="check">Check</option>
          <option value="cash">Cash</option>
          <option value="credit_card">Credit card</option>
          <option value="ach">ACH</option>
          <option value="wire_transfer">Wire transfer</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={record.isPending}>{record.isPending ? 'Saving...' : 'Record payment'}</button>
        </div>
      </form>
    </div>
  );
}
