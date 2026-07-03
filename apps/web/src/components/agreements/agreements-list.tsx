'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus, Search, Upload, FileText } from 'lucide-react';
import type { MultiYearAgreement, MultiYearAgreementStatus } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const STATUS_OPTIONS: Array<{ value: MultiYearAgreementStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'renewal_due', label: 'Renewal due' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function statusLabel(status: MultiYearAgreementStatus) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: MultiYearAgreementStatus) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'renewal_due') return 'bg-amber-500/10 text-amber-700';
  if (status === 'cancelled') return 'bg-red-500/10 text-red-700';
  return 'bg-muted text-muted-foreground';
}

function AgreementForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const year = new Date().getFullYear();
  const { data: customers } = trpc.customer360.list.useQuery({ page: 1, pageSize: 100, enrich: 'none' });
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState(`${year} Holiday Lighting Agreement`);
  const [optionCode, setOptionCode] = useState('A');
  const [optionLabel, setOptionLabel] = useState('3 Year');
  const [startSeason, setStartSeason] = useState(year);
  const [endSeason, setEndSeason] = useState(year + 2);
  const [annualValue, setAnnualValue] = useState('');
  const create = trpc.agreements360.create.useMutation({
    onSuccess: () => {
      toast('Agreement added', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not add agreement', 'error'),
  });

  const selectedCustomerName = useMemo(() => {
    const customer = customers?.items.find((item) => item.id === customerId);
    if (!customer) return customerName;
    return customer.businessName || `${customer.firstName} ${customer.lastName}`.trim();
  }, [customerId, customerName, customers?.items]);

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          customerId,
          customerName: selectedCustomerName,
          propertyId: '',
          propertyLabel: '',
          title,
          status: 'active',
          optionCode,
          optionLabel,
          startSeason,
          endSeason,
          annualValueCents: Math.round((Number(annualValue) || 0) * 100),
          depositPercent: 50,
          autoGenerateProjects: true,
          linkedProjectIds: [],
          notes: '',
          source: 'manual',
          signedAt: new Date(),
          cancelledAt: null,
          nextRenewalDate: new Date(`${endSeason}-08-01T12:00:00`),
        });
      }}
    >
      <select
        className="input"
        value={customerId}
        onChange={(event) => {
          const value = event.target.value;
          setCustomerId(value);
          const customer = customers?.items.find((item) => item.id === value);
          setCustomerName(customer?.businessName || (customer ? `${customer.firstName} ${customer.lastName}` : ''));
        }}
      >
        <option value="">Select linked customer</option>
        {customers?.items.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.businessName || `${customer.firstName} ${customer.lastName}`}
          </option>
        ))}
      </select>
      <input className="input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      <input className="input md:col-span-2" placeholder="Agreement title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="Option code (A-E)" value={optionCode} onChange={(e) => setOptionCode(e.target.value)} required />
      <input className="input" placeholder="Option label" value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)} required />
      <input className="input" type="number" placeholder="Start season" value={startSeason} onChange={(e) => setStartSeason(Number(e.target.value))} required />
      <input className="input" type="number" placeholder="End season" value={endSeason} onChange={(e) => setEndSeason(Number(e.target.value))} required />
      <input className="input md:col-span-2" type="number" min="0" step="0.01" placeholder="Annual value" value={annualValue} onChange={(e) => setAnnualValue(e.target.value)} />
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Save agreement'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AgreementsTable({ agreements }: { agreements: MultiYearAgreement[] }) {
  if (agreements.length === 0) {
    return (
      <EmptyState
        title="No agreements found"
        description="Create multi-year agreements to track renewals, linked seasonal projects, and future revenue."
        icon={FileText}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Agreement</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Term</th>
            <th>Annual</th>
            <th>Total</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          {agreements.map((agreement) => (
            <tr key={agreement.id}>
              <td>
                <p className="font-medium">{agreement.title}</p>
                <p className="text-xs text-muted-foreground">{agreement.optionCode} · {agreement.optionLabel}</p>
              </td>
              <td>
                {agreement.customerId ? (
                  <Link href={`/app/customers/${agreement.customerId}`} className="text-primary hover:underline">
                    {agreement.customerName}
                  </Link>
                ) : (
                  agreement.customerName
                )}
              </td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(agreement.status)}`}>
                  {statusLabel(agreement.status)}
                </span>
              </td>
              <td className="text-muted-foreground">{agreement.startSeason}-{agreement.endSeason}</td>
              <td>{formatCurrency(agreement.annualValueCents)}</td>
              <td>{formatCurrency(agreement.totalValueCents)}</td>
              <td className="text-muted-foreground">{agreement.linkedProjectIds?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgreementsListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MultiYearAgreementStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = trpc.agreements360.list.useQuery(
    { page: 1, pageSize: 100, search: search || undefined, status: status || undefined },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Agreements</h1>
          <p className="page-subtitle">{data?.total ?? 0} multi-year agreements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/settings/import" className="btn-secondary">
            <Upload className="h-4 w-4" />
            Import data
          </Link>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New agreement
          </button>
        </div>
      </div>

      {creating && <AgreementForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search agreement, customer, option..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as MultiYearAgreementStatus | '')}>
          {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading agreements..." />}
        {isError && <ErrorState message="Could not load agreements." onRetry={() => refetch()} />}
        {!isLoading && !isError && <AgreementsTable agreements={data?.items ?? []} />}
      </div>
    </div>
  );
}
