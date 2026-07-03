'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';

type InvoiceCreateFormProps = {
  defaultCustomerId?: string;
  defaultProposalId?: string;
  defaultSubtotalCents?: number;
  defaultDepositPercent?: number;
  onSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
  compact?: boolean;
};

export function InvoiceCreateForm({
  defaultCustomerId = '',
  defaultProposalId,
  defaultSubtotalCents = 0,
  defaultDepositPercent = 50,
  onSuccess,
  onCancel,
  compact,
}: InvoiceCreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customers, isLoading: customersLoading } = trpc.customer360.list.useQuery(
    { page: 1, pageSize: 50, search: customerSearch || undefined, enrich: 'none' },
    { staleTime: 60_000 },
  );
  const [form, setForm] = useState({
    customerId: defaultCustomerId,
    subtotalDollars: defaultSubtotalCents ? (defaultSubtotalCents / 100).toFixed(2) : '',
    depositPercent: defaultDepositPercent,
    dueDays: 30,
    notes: '',
  });

  const create = trpc.invoices360.create.useMutation({
    onSuccess: (invoice) => {
      toast('Invoice created', 'success');
      if (onSuccess) onSuccess(invoice.id);
      else router.push(`/app/invoices/${invoice.id}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const createFromProposal = trpc.invoices360.createFromProposal.useMutation({
    onSuccess: (invoice) => {
      toast('Invoice created from proposal', 'success');
      if (onSuccess) onSuccess(invoice.id);
      else router.push(`/app/invoices/${invoice.id}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const loading = create.isPending || createFromProposal.isPending;

  return (
    <form
      className={compact ? 'space-y-4' : 'card grid gap-4 p-6 sm:grid-cols-2'}
      onSubmit={(e) => {
        e.preventDefault();
        if (defaultProposalId) {
          createFromProposal.mutate({
            proposalId: defaultProposalId,
            depositPercent: Number(form.depositPercent) || 50,
            dueDays: Number(form.dueDays) || 30,
          });
          return;
        }
        if (!form.customerId) {
          toast('Select a customer', 'error');
          return;
        }
        const subtotalCents = Math.round(parseFloat(form.subtotalDollars || '0') * 100);
        if (subtotalCents <= 0) {
          toast('Enter a valid amount', 'error');
          return;
        }
        create.mutate({
          customerId: form.customerId,
          subtotalCents,
          depositPercent: Number(form.depositPercent) || 50,
          dueDays: Number(form.dueDays) || 30,
          notes: form.notes || undefined,
        });
      }}
    >
      {!compact && (
        <div className="sm:col-span-2">
          <h2 className="font-semibold">{defaultProposalId ? 'Create invoice from proposal' : 'New invoice'}</h2>
          <p className="text-sm text-muted-foreground">
            {defaultProposalId
              ? 'Creates a draft invoice using the approved proposal total.'
              : 'Create a draft invoice, then review and send it to the customer.'}
          </p>
        </div>
      )}

      {!defaultProposalId && (
        <div className={compact ? '' : 'sm:col-span-2'}>
          <label className="mb-1 block text-sm font-medium">Customer</label>
          {!defaultCustomerId && (
            <input
              type="search"
              className="input mb-2 w-full"
              placeholder="Search customers..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          )}
          <select
            className="input w-full"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            required
            disabled={!!defaultCustomerId || customersLoading}
          >
            <option value="">{customersLoading ? 'Loading...' : 'Select customer'}</option>
            {(customers?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.businessName || c.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {!defaultProposalId && (
        <div>
          <label className="mb-1 block text-sm font-medium">Amount ($)</label>
          <input
            className="input w-full"
            type="number"
            step="0.01"
            min="0"
            value={form.subtotalDollars}
            onChange={(e) => setForm({ ...form, subtotalDollars: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Deposit %</label>
        <input
          className="input w-full"
          type="number"
          min={0}
          max={100}
          value={form.depositPercent}
          onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Due in (days)</label>
        <input
          className="input w-full"
          type="number"
          min={1}
          max={365}
          value={form.dueDays}
          onChange={(e) => setForm({ ...form, dueDays: Number(e.target.value) })}
        />
      </div>

      {!defaultProposalId && (
        <div className={compact ? '' : 'sm:col-span-2'}>
          <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
          <textarea
            className="input w-full"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal notes or line-item summary"
          />
        </div>
      )}

      <div className={`flex justify-end gap-2 ${compact ? '' : 'sm:col-span-2'}`}>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create draft invoice'}
        </button>
      </div>
    </form>
  );
}
