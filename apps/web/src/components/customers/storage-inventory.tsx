'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { StoragePullSheetView } from '@/components/storage';
import { formatCurrency, STORAGE_CATEGORY_OPTIONS, STORAGE_CONDITION_OPTIONS } from '@/lib/customer360-utils';
import type { StorageCategory, StorageCondition, StorageInventoryItem } from '@clcrm/types';

export function StorageInventory({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.customer360.storage.list.useQuery({ customerId });
  const { data: records, isLoading: recordsLoading } = trpc.storage360.records.list.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const [showPullSheet, setShowPullSheet] = useState(false);
  const create = trpc.customer360.storage.create.useMutation({
    onSuccess: () => { toast('Storage item added', 'success'); refetch(); setShowForm(false); },
    onError: () => toast('Could not add item', 'error'),
  });
  const update = trpc.customer360.storage.update.useMutation({
    onSuccess: () => { toast('Item updated', 'success'); refetch(); },
  });
  const { data: pullSheet } = trpc.storage360.pullSheet.useQuery(
    { customerId },
    { enabled: showPullSheet },
  );

  if (isLoading || recordsLoading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Storage records</h2>
            <p className="text-sm text-muted-foreground">Season storage bins created after takedown.</p>
          </div>
          <div className="flex gap-2">
            {records?.length ? (
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowPullSheet(true)}>
                Pull sheet
              </button>
            ) : null}
            <Link href="/app/storage" className="btn-ghost text-sm">Storage hub</Link>
          </div>
        </div>
        {!records?.length ? (
          <EmptyState title="No storage records" description="Complete a takedown job to auto-create a storage record, or add one from the storage hub." />
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr><th>Bin</th><th>Location</th><th>Items</th><th>Status</th><th>Stored</th><th></th></tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono">{row.binNumber || '—'}</td>
                    <td className="text-muted-foreground">{[row.locationId, row.rack, row.shelf].filter(Boolean).join(' / ') || '—'}</td>
                    <td>{row.itemCount}</td>
                    <td className="capitalize">{row.status}</td>
                    <td className="text-muted-foreground">{row.storedAt.toLocaleDateString()}</td>
                    <td>
                      <Link href={`/app/storage/${row.id}`} className="text-xs text-primary hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex justify-between">
          <div>
            <h2 className="font-semibold">Item inventory</h2>
            <p className="text-sm text-muted-foreground">Detailed item-level tracking with barcodes.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add item'}</button>
        </div>
        {showForm && <StorageForm onSubmit={(formData) => create.mutate({ customerId, data: formData as never })} loading={create.isPending} />}
        {!data?.length && !showForm ? (
          <EmptyState title="No storage items" description="Track customer-owned inventory stored for next season." />
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr><th>Item</th><th>Category</th><th>Qty</th><th>Condition</th><th>Location</th><th>Barcode</th><th></th></tr>
              </thead>
              <tbody>
                {data?.map((item) => (
                  <StorageRow key={item.id} item={item as StorageInventoryItem} onMarkDamaged={() => update.mutate({ customerId, itemId: item.id, data: { condition: 'damaged' } })} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPullSheet && pullSheet && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="card w-full max-w-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Customer pull sheet</h3>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => window.print()}>Print</button>
                <button type="button" className="btn-ghost" onClick={() => setShowPullSheet(false)}>Close</button>
              </div>
            </div>
            <StoragePullSheetView sheet={pullSheet} />
          </div>
        </div>
      )}
    </div>
  );
}

function StorageRow({ item, onMarkDamaged }: { item: StorageInventoryItem; onMarkDamaged: () => void }) {
  const loc = [item.warehouseBuilding, item.row, item.shelf, item.bin].filter(Boolean).join(' / ') || '—';
  return (
    <tr>
      <td className="font-medium">{item.itemName}</td>
      <td className="text-muted-foreground">{STORAGE_CATEGORY_OPTIONS.find((o) => o.value === item.category)?.label}</td>
      <td>{item.quantity}</td>
      <td>{STORAGE_CONDITION_OPTIONS.find((o) => o.value === item.condition)?.label}</td>
      <td className="text-muted-foreground">{loc}</td>
      <td className="font-mono text-xs">{item.barcodeValue ?? '—'}</td>
      <td>
        <button type="button" className="btn-ghost text-xs" onClick={onMarkDamaged}>Mark damaged</button>
      </td>
    </tr>
  );
}

function StorageForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading?: boolean }) {
  const [form, setForm] = useState({
    itemName: '', category: 'c9_lights' as StorageCategory, quantity: 1, condition: 'good' as StorageCondition,
    warehouseBuilding: '', row: '', shelf: '', bin: '', replacementCostCents: '', notes: '',
  });
  return (
    <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        replacementCostCents: form.replacementCostCents ? Number(form.replacementCostCents) : null,
      });
    }}>
      <input required placeholder="Item name *" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className="input" />
      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as StorageCategory })} className="input">
        {STORAGE_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="input" />
      <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as StorageCondition })} className="input">
        {STORAGE_CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input placeholder="Warehouse" value={form.warehouseBuilding} onChange={(e) => setForm({ ...form, warehouseBuilding: e.target.value })} className="input" />
      <input placeholder="Row / Shelf / Bin" value={`${form.row}`} onChange={(e) => setForm({ ...form, row: e.target.value })} className="input" />
      <button type="submit" className="btn-primary sm:col-span-2" disabled={loading}>Save item</button>
    </form>
  );
}
