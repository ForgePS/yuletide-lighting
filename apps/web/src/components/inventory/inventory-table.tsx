'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/inventory-utils';
import { PillSelect } from '@/components/ui/pill-select';
import type { InventoryCategoryGroup, InventoryItemRecord } from '@clcrm/types';
import { useToast } from '@/lib/toast';

const FALLBACK_AISLES = ['1', '2', '3', '4', '5', '6'];
const FALLBACK_RACKS = ['1', '2', '3', '4'];

function formatCategoryGroup(group: InventoryCategoryGroup) {
  return group.replace(/_/g, ' ');
}

function computeAvailable(item: InventoryItemRecord) {
  return Math.max(0, item.quantityOnHand - item.quantityReserved - item.quantityAssigned - item.quantityDamaged - item.quantityLost);
}

export function InventoryEditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItemRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: categories } = trpc.inventory360.categories.list.useQuery();
  const update = trpc.inventory360.items.update.useMutation({
    onSuccess: () => { toast('Item updated', 'success'); onSaved(); },
    onError: () => toast('Could not update item', 'error'),
  });

  const [form, setForm] = useState({
    name: item.name,
    categoryId: item.categoryId ?? '',
    quantityOnHand: item.quantityOnHand,
    reorderLevel: item.reorderLevel,
    unitCostCents: item.unitCostCents,
    sellPriceCents: item.sellPriceCents,
    locationAisle: item.locationAisle ?? '',
    locationRack: item.locationRack ?? '',
  });

  const categoryOptions = useMemo(
    () => (categories ?? []).map((cat) => ({ value: cat.id, label: cat.name })),
    [categories],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <form
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const category = categories?.find((cat) => cat.id === form.categoryId);
          update.mutate({
            itemId: item.id,
            data: {
              name: form.name,
              categoryId: category?.id,
              categoryName: category?.name,
              categoryGroup: category?.group,
              quantityOnHand: form.quantityOnHand,
              reorderLevel: form.reorderLevel,
              unitCostCents: form.unitCostCents,
              sellPriceCents: form.sellPriceCents,
              replacementCostCents: form.unitCostCents,
              locationAisle: form.locationAisle || undefined,
              locationRack: form.locationRack || undefined,
            },
          });
        }}
      >
        <h2 className="text-lg font-semibold">Edit {item.sku}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required className="input sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
          <PillSelect label="Category" fullWidth className="sm:col-span-2" value={form.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} options={categoryOptions} placeholder="Select category..." />
          <input type="number" min={0} className="input" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: Math.max(0, Number(e.target.value)) })} placeholder="Qty on hand" />
          <input type="number" min={0} className="input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Math.max(0, Number(e.target.value)) })} placeholder="Reorder level" />
          <input type="number" min={0} step="0.01" className="input" value={form.unitCostCents / 100} onChange={(e) => setForm({ ...form, unitCostCents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} placeholder="Unit cost ($)" />
          <input type="number" min={0} step="0.01" className="input" value={form.sellPriceCents / 100} onChange={(e) => setForm({ ...form, sellPriceCents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} placeholder="Sell price ($)" />
          <input className="input" value={form.locationAisle} onChange={(e) => setForm({ ...form, locationAisle: e.target.value })} placeholder="Aisle" />
          <input className="input" value={form.locationRack} onChange={(e) => setForm({ ...form, locationRack: e.target.value })} placeholder="Rack" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}

export function InventoryForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading?: boolean }) {
  const { data: categories } = trpc.inventory360.categories.list.useQuery();
  const { data: warehouses } = trpc.inventory360.warehouses.list.useQuery();
  const warehouseId = warehouses?.[0]?.id ?? '';
  const { data: locations } = trpc.inventory360.warehouses.locations.list.useQuery(
    { warehouseId },
    { enabled: !!warehouseId },
  );

  const [form, setForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    categoryName: '',
    categoryGroup: '' as InventoryCategoryGroup | '',
    unitCostCents: 0,
    quantityOnHand: 0,
    reorderLevel: 10,
    locationAisle: '',
    locationRack: '',
    locationShelf: '',
    locationBin: '',
  });

  const aisleOptions = useMemo(() => {
    const fromLocations = [...new Set((locations ?? []).map((loc) => loc.aisle).filter(Boolean))];
    return fromLocations.length ? fromLocations : FALLBACK_AISLES;
  }, [locations]);

  const rackOptions = useMemo(() => {
    const filtered = (locations ?? []).filter((loc) => !form.locationAisle || loc.aisle === form.locationAisle);
    const fromLocations = [...new Set(filtered.map((loc) => loc.rack).filter(Boolean))];
    return fromLocations.length ? fromLocations : FALLBACK_RACKS;
  }, [locations, form.locationAisle]);

  const categoriesByGroup = useMemo(() => {
    const groups = new Map<InventoryCategoryGroup, typeof categories>();
    for (const category of categories ?? []) {
      const existing = groups.get(category.group) ?? [];
      groups.set(category.group, [...existing, category]);
    }
    return groups;
  }, [categories]);

  const categoryOptionGroups = useMemo(
    () =>
      [...categoriesByGroup.entries()].map(([group, items]) => ({
        label: formatCategoryGroup(group),
        options: (items ?? []).map((category) => ({ value: category.id, label: category.name })),
      })),
    [categoriesByGroup],
  );

  function updateCategory(categoryId: string) {
    const category = categories?.find((item) => item.id === categoryId);
    setForm((prev) => ({
      ...prev,
      categoryId,
      categoryName: category?.name ?? '',
      categoryGroup: category?.group ?? '',
    }));
  }

  return (
    <form
      className="card grid gap-4 p-6 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.categoryId) return;
        onSubmit({
          ...form,
          categoryGroup: form.categoryGroup || undefined,
          sellPriceCents: form.unitCostCents * 2,
          replacementCostCents: form.unitCostCents,
          warehouseId,
        });
      }}
    >
      <input required placeholder="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
      <input required placeholder="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />

      <PillSelect
        label="Category"
        required
        fullWidth
        className="sm:col-span-2"
        value={form.categoryId}
        onChange={updateCategory}
        optionGroups={categoryOptionGroups}
        placeholder="Select category..."
      />

      <input type="number" min={0} step="0.01" placeholder="Unit cost ($)" value={form.unitCostCents ? form.unitCostCents / 100 : ''} onChange={(e) => setForm({ ...form, unitCostCents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} className="input" />
      <input type="number" min={0} placeholder="Qty on hand" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: Math.max(0, Number(e.target.value)) })} className="input" />
      <input type="number" min={0} placeholder="Reorder level" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Math.max(0, Number(e.target.value)) })} className="input sm:col-span-2" />

      <PillSelect
        label="Aisle"
        fullWidth
        value={form.locationAisle}
        onChange={(locationAisle) => setForm({ ...form, locationAisle, locationRack: '' })}
        options={aisleOptions.map((aisle) => ({ value: aisle, label: aisle }))}
        placeholder="Select aisle..."
      />

      <PillSelect
        label="Rack"
        fullWidth
        disabled={!form.locationAisle}
        value={form.locationRack}
        onChange={(locationRack) => setForm({ ...form, locationRack })}
        options={rackOptions.map((rack) => ({ value: rack, label: rack }))}
        placeholder="Select rack..."
      />

      <button type="submit" className="btn-primary sm:col-span-2" disabled={loading || !form.categoryId}>Save item</button>
    </form>
  );
}

/** @deprecated Use InventoryHub at /app/inventory */
export function InventoryTable() {
  return null;
}

export function InventoryCard({ item }: { item: InventoryItemRecord }) {
  const avail = computeAvailable(item);
  return (
    <div className="card p-4">
      <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
      <p className="font-semibold">{item.name}</p>
      <p className="mt-2 text-sm">{avail} available · {formatCurrency(item.unitCostCents)} unit</p>
    </div>
  );
}
