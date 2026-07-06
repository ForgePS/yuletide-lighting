'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Edit,
  Eye,
  FileText,
  LayoutGrid,
  List,
  MapPin,
  MessageSquarePlus,
  Plus,
  Search,
  StickyNote,
  Upload,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatServiceAddress } from '@/components/customer-address-fields';
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  formatCurrency,
  formatDate,
  labelCustomerStatus,
  labelCustomerType,
  statusBadgeClass,
  customerDisplayName,
} from '@/lib/customer360-utils';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import type { CustomerListItem, CustomerStatus, CustomerType } from '@clcrm/types';

function QuickActions({ customer }: { customer: CustomerListItem }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const { toast } = useToast();
  const addNote = trpc.customer360.addNote.useMutation({
    onSuccess: () => {
      toast('Note added', 'success');
      setNoteOpen(false);
      setNote('');
    },
    onError: () => toast('Could not add note', 'error'),
  });

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Link href={`/app/customers/${customer.id}`} className="btn-ghost px-2 py-1 text-xs" title="View">
          <Eye className="h-3.5 w-3.5" />
        </Link>
        <Link href={`/app/customers/${customer.id}/edit`} className="btn-ghost px-2 py-1 text-xs" title="Edit">
          <Edit className="h-3.5 w-3.5" />
        </Link>
        <Link href={`/app/customers/${customer.id}/properties`} className="btn-ghost px-2 py-1 text-xs" title="Add property">
          <MapPin className="h-3.5 w-3.5" />
        </Link>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" title="Add note" onClick={() => setNoteOpen(true)}>
          <StickyNote className="h-3.5 w-3.5" />
        </button>
        <Link href={`/app/proposals/new?customerId=${customer.id}`} className="btn-ghost px-2 py-1 text-xs" title="Create quote">
          <FileText className="h-3.5 w-3.5" />
        </Link>
      </div>
      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setNoteOpen(false)} aria-label="Close" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="font-semibold">Add note for {customerDisplayName(customer)}</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input mt-3 min-h-[100px]" placeholder="Internal note..." />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setNoteOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate({ customerId: customer.id, note })}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CustomerTable({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  items: CustomerListItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  if (items.length === 0) {
    return <EmptyState title="No customers found" description="Try adjusting your search or filters, or add a new customer." />;
  }

  const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[900px]">
        <thead>
          <tr>
            <th className="w-10">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all" />
            </th>
            <th>Customer</th>
            <th>Type</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Status</th>
            <th>Revenue</th>
            <th>Last job</th>
            <th>Next job</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((customer) => (
            <tr key={customer.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(customer.id)}
                  onChange={() => onToggle(customer.id)}
                  aria-label={`Select ${customerDisplayName(customer)}`}
                />
              </td>
              <td>
                <Link href={`/app/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                  {customerDisplayName(customer)}
                </Link>
              </td>
              <td className="text-muted-foreground">{labelCustomerType(customer.customerType)}</td>
              <td className="text-muted-foreground">{customer.phone ?? '—'}</td>
              <td className="text-muted-foreground">{customer.email ?? '—'}</td>
              <td className="max-w-[180px] truncate text-muted-foreground">{formatServiceAddress(customer.primaryProperty)}</td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(customer.status)}`}>
                  {labelCustomerStatus(customer.status)}
                </span>
              </td>
              <td>{formatCurrency(customer.lifetimeRevenueCents)}</td>
              <td className="text-muted-foreground">{customer.lastJobDate ? formatDate(customer.lastJobDate) : '—'}</td>
              <td className="text-muted-foreground">{customer.nextScheduledJobDate ? formatDate(customer.nextScheduledJobDate) : '—'}</td>
              <td><QuickActions customer={customer} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomerCard({ customer }: { customer: CustomerListItem }) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/app/customers/${customer.id}`} className="font-semibold text-primary hover:underline">
            {customerDisplayName(customer)}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">{labelCustomerType(customer.customerType)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(customer.status)}`}>
          {labelCustomerStatus(customer.status)}
        </span>
      </div>
      <p className="mt-3 truncate text-sm text-muted-foreground">{formatServiceAddress(customer.primaryProperty)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Revenue</span><p className="font-medium">{formatCurrency(customer.lifetimeRevenueCents)}</p></div>
        <div><span className="text-muted-foreground">Next job</span><p className="font-medium">{customer.nextScheduledJobDate ? formatDate(customer.nextScheduledJobDate) : '—'}</p></div>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <QuickActions customer={customer} />
      </div>
    </div>
  );
}

export function CustomerList() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'card'>('table');
  const [typeFilters, setTypeFilters] = useState<CustomerType[]>([]);
  const [statusFilters, setStatusFilters] = useState<CustomerStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<CustomerStatus | ''>('');
  const [bulkRep, setBulkRep] = useState('');
  const { year } = useAnalyticsYear();
  const { toast } = useToast();
  const bulkUpdate = trpc.customer360.bulkUpdate.useMutation({
    onSuccess: (result) => {
      toast(`Updated ${result.updated} customers`, 'success');
      setSelectedIds(new Set());
      setBulkStatus('');
      setBulkRep('');
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const seedDemo = trpc.customer360.seedDemo.useMutation({
    onSuccess: (result) => {
      if (result.seeded) toast('Demo customer seeded', 'success');
      else toast('Customers already exist', 'info');
      refetch();
    },
  });

  const { data, isLoading, isError, refetch } = trpc.customer360.list.useQuery(
    {
      page: 1,
      pageSize: 50,
      search: search || undefined,
      customerTypes: typeFilters.length ? typeFilters : undefined,
      statuses: statusFilters.length ? statusFilters : undefined,
      view,
      year,
    },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{data?.total ?? 0} customers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/settings/import" className="btn-secondary">
            <Upload className="h-4 w-4" />
            Import data
          </Link>
          <button type="button" className="btn-secondary" onClick={() => seedDemo.mutate()} disabled={seedDemo.isPending}>
            Seed demo
          </button>
          <Link href="/app/customers/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name, business, phone, email, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button type="button" className={view === 'table' ? 'btn-primary px-3 py-1.5 text-sm' : 'btn-ghost px-3 py-1.5 text-sm'} onClick={() => setView('table')}>
            <List className="h-4 w-4" />
          </button>
          <button type="button" className={view === 'card' ? 'btn-primary px-3 py-1.5 text-sm' : 'btn-ghost px-3 py-1.5 text-sm'} onClick={() => setView('card')}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <MultiSelectDropdown
          label="Customer type"
          placeholder="All types"
          options={CUSTOMER_TYPE_OPTIONS}
          values={typeFilters}
          onChange={setTypeFilters}
        />
        <MultiSelectDropdown
          label="Status"
          placeholder="All statuses"
          options={CUSTOMER_STATUS_OPTIONS}
          values={statusFilters}
          onChange={setStatusFilters}
        />
      </div>

      <div className="mt-6">
        <BulkActionBar selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
          <select className="input w-auto py-1.5 text-sm" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as CustomerStatus | '')}>
            <option value="">Set status...</option>
            {CUSTOMER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className="input w-40 py-1.5 text-sm" placeholder="Assign rep" value={bulkRep} onChange={(e) => setBulkRep(e.target.value)} />
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={bulkUpdate.isPending || (!bulkStatus && !bulkRep.trim())}
            onClick={() =>
              bulkUpdate.mutate({
                customerIds: [...selectedIds],
                ...(bulkStatus ? { status: bulkStatus } : {}),
                ...(bulkRep.trim() ? { assignedSalespersonName: bulkRep.trim() } : {}),
              })
            }
          >
            Apply
          </button>
        </BulkActionBar>

        {isLoading && <LoadingState message="Loading customers..." />}
        {isError && <ErrorState message="Could not load customers." onRetry={() => refetch()} />}
        {!isLoading && !isError && view === 'table' && (
          <div className="card overflow-hidden">
            <CustomerTable
              items={data?.items ?? []}
              selectedIds={selectedIds}
              onToggle={(id) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onToggleAll={() => {
                const ids = data?.items.map((c) => c.id) ?? [];
                setSelectedIds((prev) => (ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));
              }}
            />
          </div>
        )}
        {!isLoading && !isError && view === 'card' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(data?.items ?? []).length === 0 ? (
              <div className="col-span-full"><EmptyState title="No customers found" icon={MessageSquarePlus} /></div>
            ) : (
              data?.items.map((customer) => <CustomerCard key={customer.id} customer={customer} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
