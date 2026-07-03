'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/inventory-utils';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import type { InventoryDashboardKpis } from '@clcrm/types';
import { LowStockAlertPanel } from './low-stock-panel';

export function InventoryDashboard({ kpis }: { kpis?: InventoryDashboardKpis }) {
  const cards = kpis
    ? [
        { label: 'Total inventory value', value: formatCurrency(kpis.totalInventoryValueCents) },
        { label: 'Available value', value: formatCurrency(kpis.availableInventoryValueCents) },
        { label: 'Assigned value', value: formatCurrency(kpis.assignedInventoryValueCents) },
        { label: 'Customer-owned value', value: formatCurrency(kpis.customerOwnedValueCents) },
        { label: 'Truck inventory value', value: formatCurrency(kpis.truckInventoryValueCents) },
        { label: 'Damaged value', value: formatCurrency(kpis.damagedInventoryValueCents) },
        { label: 'Reorder alerts', value: String(kpis.reorderAlerts) },
        { label: 'Low stock items', value: String(kpis.lowStockCount) },
        { label: 'Inventory turnover', value: String(kpis.inventoryTurnover) },
        { label: 'Accuracy %', value: `${kpis.inventoryAccuracyPercent}%` },
      ]
    : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function InventoryDashboardPage() {
  const { data, isLoading, isError, refetch } = trpc.inventory360.dashboard.useQuery();
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const { data: forecasts } = trpc.inventory360.forecasts.useQuery();

  if (isLoading) return <LoadingState message="Loading inventory dashboard..." />;
  if (isError || !data) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />;

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      {!hasItems && (
        <EmptyState
          title="Import your inventory"
          description="Upload an inventory CSV export to populate SKUs, stock levels, and costs."
          action={<Link href="/app/settings/import" className="btn-primary mt-4">Go to data import</Link>}
        />
      )}
      {hasItems && (
        <>
      <LowStockAlertPanel />
      <InventoryDashboard kpis={data} />
      {forecasts && forecasts.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold">Reorder forecasts</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {forecasts.slice(0, 8).map((f) => (
              <li key={f.itemId} className="flex justify-between border-b border-border py-2">
                <span>{f.itemName} ({f.sku})</span>
                <span className="text-muted-foreground">Order {f.suggestedReorderQty} units</span>
              </li>
            ))}
          </ul>
        </div>
      )}
        </>
      )}
    </div>
  );
}
