'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/inventory-utils';
import { LoadingState } from '@/components/ui/states';

export function LowStockAlertPanel({ compact }: { compact?: boolean }) {
  const { data, isLoading } = trpc.inventory360.lowStock.useQuery();

  if (isLoading) return <LoadingState message="Checking stock levels..." />;
  if (!data?.length) return null;

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/80 ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={`font-semibold text-amber-900 ${compact ? 'text-sm' : ''}`}>
            Low stock alerts ({data.length})
          </h2>
          {!compact && (
            <p className="mt-1 text-sm text-amber-800/80">
              Items at or below reorder level — restock before install season.
            </p>
          )}
        </div>
        <Link href="/app/inventory/purchase-orders" className="text-sm font-medium text-amber-900 hover:underline">
          Create PO →
        </Link>
      </div>
      <ul className={`mt-3 space-y-2 ${compact ? 'max-h-40 overflow-y-auto' : ''}`}>
        {data.slice(0, compact ? 5 : 12).map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2 text-sm">
            <Link href={`/app/inventory/items/${item.id}`} className="font-medium text-amber-950 hover:underline">
              {item.sku} — {item.name}
            </Link>
            <span className="tabular-nums text-amber-800">
              {item.available} avail · reorder {item.reorderLevel}
              {item.quantityDamaged > 0 && ` · ${item.quantityDamaged} damaged`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
