'use client';

import { useState } from 'react';
import { ClipboardList, PackageCheck, Plus, Search, ShoppingCart } from 'lucide-react';
import type { ProjectPrepItem, ProjectPrepStatus } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const STATUS_OPTIONS: Array<{ value: ProjectPrepStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pulling', label: 'Pulling' },
  { value: 'partially_pulled', label: 'Partially pulled' },
  { value: 'to_be_ordered', label: 'To be ordered' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'packed', label: 'Packed' },
  { value: 'ready', label: 'Ready' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusLabel(status: ProjectPrepStatus) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: ProjectPrepStatus) {
  if (status === 'ready' || status === 'packed') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'ordered' || status === 'to_be_ordered') return 'bg-amber-500/10 text-amber-700';
  if (status === 'cancelled') return 'bg-red-500/10 text-red-700';
  if (status === 'pulling' || status === 'partially_pulled') return 'bg-blue-500/10 text-blue-700';
  return 'bg-muted text-muted-foreground';
}

function PrepForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [storageLocation, setStorageLocation] = useState('');
  const [vendorName, setVendorName] = useState('');
  const create = trpc.projectPrep360.create.useMutation({
    onSuccess: () => {
      toast('Prep item added', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not add prep item', 'error'),
  });

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          customerName,
          customerId: '',
          jobTitle,
          jobId: '',
          proposalId: '',
          inventoryItemId: '',
          sku,
          itemName,
          category,
          status: 'pending',
          quantityNeeded,
          quantityPulled: 0,
          quantityOrdered: 0,
          quantityCheckedIn: 0,
          storageLocation,
          truckId: '',
          truckName: '',
          vendorName,
          dueDate: null,
          notes: '',
          source: 'manual',
        });
      }}
    >
      <input className="input" placeholder="Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <input className="input" placeholder="Job / project" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
      <input className="input" placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
      <input className="input" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
      <input className="input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <input className="input" type="number" min="0" placeholder="Quantity needed" value={quantityNeeded} onChange={(e) => setQuantityNeeded(Number(e.target.value))} />
      <input className="input" placeholder="Storage location" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
      <input className="input" placeholder="Vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Save prep item'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PrepActions({ item, onChanged }: { item: ProjectPrepItem; onChanged: () => void }) {
  const { toast } = useToast();
  const updateStatus = trpc.projectPrep360.updateStatus.useMutation({
    onSuccess: () => {
      toast('Prep item updated', 'success');
      onChanged();
    },
    onError: () => toast('Could not update prep item', 'error'),
  });

  function mutate(status: ProjectPrepStatus, patch: Partial<Pick<ProjectPrepItem, 'quantityPulled' | 'quantityOrdered' | 'quantityCheckedIn'>> = {}) {
    updateStatus.mutate({
      prepItemId: item.id,
      status,
      quantityPulled: patch.quantityPulled,
      quantityOrdered: patch.quantityOrdered,
      quantityCheckedIn: patch.quantityCheckedIn,
      notes: item.notes ?? '',
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {item.status === 'pending' && (
        <>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('pulling')}>Pull</button>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('to_be_ordered')}>Order</button>
        </>
      )}
      {(item.status === 'pulling' || item.status === 'partially_pulled') && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('ready', { quantityPulled: item.quantityNeeded })}>Mark pulled</button>
      )}
      {(item.status === 'to_be_ordered' || item.status === 'ordered') && (
        <>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('ordered', { quantityOrdered: item.quantityNeeded })}>Ordered</button>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('checked_in', { quantityCheckedIn: item.quantityNeeded })}>Check in</button>
        </>
      )}
      {item.status === 'checked_in' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('packed')}>Pack</button>
      )}
      {item.status === 'packed' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('ready')}>Ready</button>
      )}
    </div>
  );
}

function PrepTable({ items, onChanged }: { items: ProjectPrepItem[]; onChanged: () => void }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No prep items found"
        description="Create prep items for materials that need pulling, ordering, check-in, or packing before install."
        icon={ClipboardList}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Job</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Needed</th>
            <th>Pulled</th>
            <th>Ordered</th>
            <th>Checked in</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <p className="font-medium">{item.itemName}</p>
                <p className="text-xs text-muted-foreground">{item.sku || item.category || 'No SKU'}</p>
              </td>
              <td>{item.jobTitle}</td>
              <td className="text-muted-foreground">{item.customerName || '—'}</td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </td>
              <td>{item.quantityNeeded}</td>
              <td>{item.quantityPulled}</td>
              <td>{item.quantityOrdered}</td>
              <td>{item.quantityCheckedIn}</td>
              <td className="text-muted-foreground">{item.truckName || item.storageLocation || item.vendorName || '—'}</td>
              <td><PrepActions item={item} onChanged={onChanged} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectPrepPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectPrepStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = trpc.projectPrep360.list.useQuery(
    { page: 1, pageSize: 100, search: search || undefined, status: status || undefined },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Project Prep</h1>
          <p className="page-subtitle">Pull, order, check in, and pack materials before install day.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Add prep item
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Prep items</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.totalItems ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Ready / packed</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.readyItems ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Order needed</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.orderNeededItems ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Not started</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.blockedItems ?? 0}</p>
        </div>
      </div>

      {creating && <PrepForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search job, customer, item, SKU, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as ProjectPrepStatus | '')}>
          {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading project prep..." />}
        {isError && <ErrorState message="Could not load project prep." onRetry={() => refetch()} />}
        {!isLoading && !isError && <PrepTable items={data?.items ?? []} onChanged={() => refetch()} />}
      </div>
    </div>
  );
}
