'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import {
  downloadInventoryCsv,
  formatCurrency,
  formatMultiPrice,
  stockLevelColor,
} from '@/lib/inventory-utils';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { InventoryEditDialog, InventoryForm } from './inventory-table';
import { LowStockAlertPanel } from './low-stock-panel';
import type { InventoryItemRecord } from '@clcrm/types';

const PAGE_SIZES = [20, 50, 100];

function computeAvailable(item: InventoryItemRecord) {
  return Math.max(
    0,
    item.quantityOnHand - item.quantityReserved - item.quantityAssigned - item.quantityDamaged - item.quantityLost,
  );
}

export function InventoryHub() {
  const { toast } = useToast();
  const optionsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, refetch } = trpc.inventory360.items.list.useQuery(undefined, { staleTime: 15_000 });
  const { data: kpis } = trpc.inventory360.dashboard.useQuery(undefined, { staleTime: 60_000 });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItemRecord | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const create = trpc.inventory360.items.create.useMutation({
    onSuccess: () => {
      toast('Item created', 'success');
      refetch();
      setShowForm(false);
    },
    onError: () => toast('Could not create item', 'error'),
  });

  const update = trpc.inventory360.items.update.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast('Could not update stock', 'error'),
    onSettled: () => setAdjustingId(null),
  });

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of data ?? []) {
      if (item.categoryName) names.add(item.categoryName);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      if (categoryFilter && item.categoryName !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q)
        || item.name.toLowerCase().includes(q)
        || (item.categoryName ?? '').toLowerCase().includes(q)
        || (item.locationPath ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function adjustStock(item: InventoryItemRecord, delta: number) {
    setAdjustingId(item.id);
    update.mutate({
      itemId: item.id,
      data: { quantityOnHand: Math.max(0, item.quantityOnHand + delta) },
    });
  }

  function exportCsv() {
    downloadInventoryCsv(filtered);
    setOptionsOpen(false);
    toast(`Exported ${filtered.length} items`, 'success');
  }

  if (isLoading) return <LoadingState message="Loading inventory..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search inventory"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New item'}
          </button>
          <div className="relative" ref={optionsRef}>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              onClick={() => setOptionsOpen((v) => !v)}
            >
              Options
              <ChevronDown className="h-4 w-4" />
            </button>
            {optionsOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOptionsOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-xl border border-border bg-surface py-1 shadow-lg">
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-muted" onClick={exportCsv}>
                    Export CSV
                  </button>
                  <Link href="/app/settings/import" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setOptionsOpen(false)}>
                    Import data
                  </Link>
                  <Link href="/app/inventory/warehouse" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setOptionsOpen(false)}>
                    Warehouse locations
                  </Link>
                  <Link href="/app/inventory/dashboard" className="block px-4 py-2 text-sm hover:bg-muted" onClick={() => setOptionsOpen(false)}>
                    Analytics
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {kpis && (data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{data?.length ?? 0}</strong> items</span>
          <span><strong className="text-foreground">{formatCurrency(kpis.totalInventoryValueCents)}</strong> total value</span>
          {kpis.lowStockCount > 0 && (
            <span className="text-amber-700"><strong>{kpis.lowStockCount}</strong> low stock</span>
          )}
          {kpis.reorderAlerts > 0 && (
            <span className="text-red-700"><strong>{kpis.reorderAlerts}</strong> reorder alerts</span>
          )}
        </div>
      )}

      {(data?.length ?? 0) > 0 && <LowStockAlertPanel compact />}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Category</span>
          <select
            className="input w-auto min-w-[10rem]"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        {(search || categoryFilter) && (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => { setSearch(''); setCategoryFilter(''); setPage(1); }}
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {showForm && (
        <InventoryForm onSubmit={(d) => create.mutate(d as never)} loading={create.isPending} />
      )}

      {!data?.length && !showForm ? (
        <EmptyState
          title="No inventory items yet"
          description="Upload a CSV export or add your first item to start tracking stock."
          action={<Link href="/app/settings/import" className="btn-primary mt-4">Import data</Link>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching items" description="Try a different search or category filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stor. loc.</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Single price</th>
                  <th>Multi price</th>
                  <th className="text-right">Cur. stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const avail = computeAvailable(item);
                  const busy = adjustingId === item.id && update.isPending;
                  return (
                    <tr key={item.id} className="group">
                      <td className="font-mono text-xs whitespace-nowrap">{item.sku}</td>
                      <td>
                        <Link href={`/app/inventory/items/${item.id}`} className="font-medium text-primary hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="text-muted-foreground">{item.categoryName ?? '—'}</td>
                      <td className="max-w-[120px] truncate text-muted-foreground">{item.locationPath ?? '—'}</td>
                      <td className="text-right tabular-nums">{formatCurrency(item.unitCostCents)}</td>
                      <td className="text-right tabular-nums">{formatCurrency(item.sellPriceCents)}</td>
                      <td className="max-w-[180px] truncate text-xs text-muted-foreground" title={formatMultiPrice(item.prices, item.sellPriceCents)}>
                        {formatMultiPrice(item.prices, item.sellPriceCents)}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-40"
                            disabled={busy || item.quantityOnHand <= 0}
                            onClick={() => adjustStock(item, -1)}
                            aria-label={`Decrease stock for ${item.sku}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className={`min-w-[2rem] text-center font-semibold tabular-nums ${avail <= item.reorderLevel ? 'text-amber-700' : ''}`}>
                            {item.quantityOnHand}
                          </span>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            disabled={busy}
                            onClick={() => adjustStock(item, 1)}
                            aria-label={`Increase stock for ${item.sku}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={`ml-1 inline-block h-2 w-2 rounded-full ${stockLevelColor(avail, item.reorderLevel)}`}
                            title={`${avail} available · reorder at ${item.reorderLevel}`}
                          />
                        </div>
                      </td>
                      <td>
                        <button type="button" className="btn-ghost px-2 py-1 text-xs opacity-0 group-hover:opacity-100" onClick={() => setEditing(item)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              Page size
              <select
                className="input w-auto py-1"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={currentPage <= 1} onClick={() => setPage(1)}>First</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span className="px-2 tabular-nums">{currentPage} / {totalPages}</span>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>Last</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <InventoryEditDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}
    </div>
  );
}
