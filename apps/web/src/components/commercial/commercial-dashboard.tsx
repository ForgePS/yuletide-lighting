'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@clcrm/ui';
import { LoadingState, EmptyState } from '@/components/ui/states';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  prospect: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-amber-100 text-amber-800',
  archived: 'bg-muted text-muted-foreground',
};

export function CommercialStatsCards() {
  const { data, isLoading } = trpc.commercial360.dashboard.useQuery();
  if (isLoading || !data) return <LoadingState message="Loading commercial stats..." />;

  const cards = [
    { label: 'Accounts', value: String(data.totalAccounts) },
    { label: 'Locations', value: String(data.totalLocations) },
    { label: 'Active contracts', value: String(data.activeContracts) },
    { label: 'Renewals (30d)', value: String(data.pendingRenewals) },
    { label: 'Booked revenue', value: formatCurrency(data.commercialRevenueCents) },
    { label: 'Projected pipeline', value: formatCurrency(data.projectedRevenueCents) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CommercialAccountsTable() {
  const { data, isLoading } = trpc.commercial360.accounts.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const create = trpc.commercial360.accounts.create.useMutation({
    onSuccess: () => {
      toast('Commercial account created', 'success');
      utils.commercial360.invalidate();
      setShowForm(false);
    },
    onError: () => toast('Could not create account', 'error'),
  });

  if (isLoading) return <LoadingState message="Loading commercial accounts..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="font-semibold">Commercial accounts</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New account'}
        </button>
      </div>
      {showForm && (
        <CommercialAccountForm
          onSubmit={(formData) => create.mutate(formData)}
          loading={create.isPending}
        />
      )}
      {!data?.length && !showForm ? (
        <EmptyState
          title="No commercial accounts"
          description="Create a parent account for shopping centers, HOAs, municipalities, and multi-site clients."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Linked customer</th>
                <th>Locations</th>
                <th>Contracts</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.name}</td>
                  <td className="text-muted-foreground">{row.customerName ?? '—'}</td>
                  <td>{row.locationCount}</td>
                  <td>{row.activeContractCount}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[row.status] ?? ''}`}>
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <Link href={`/app/commercial/${row.id}`} className="text-xs text-primary hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommercialAccountForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { name: string; billingAddress?: string; notes?: string }) => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState({ name: '', billingAddress: '', notes: '' });
  return (
    <form
      className="card grid gap-4 p-6 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <input required placeholder="Account name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input sm:col-span-2" />
      <input placeholder="Shared billing address" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} className="input sm:col-span-2" />
      <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[80px] sm:col-span-2" />
      <button type="submit" className="btn-primary sm:col-span-2" disabled={loading}>Create account</button>
    </form>
  );
}

export function CommercialDashboard() {
  return (
    <div className="space-y-6">
      <CommercialStatsCards />
      <CommercialAccountsTable />
    </div>
  );
}
