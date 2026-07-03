'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency, formatMultiPrice } from '@/lib/inventory-utils';
import { LoadingState } from '@/components/ui/states';
import { InventoryEditDialog } from './inventory-table';
import { QRGenerator } from './warehouse-map';
import { computeAvailable } from '@clcrm/types';

export function InventoryItemDetail({ itemId }: { itemId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.inventory360.items.getById.useQuery({ itemId });
  const markDamaged = trpc.inventory360.items.markDamaged.useMutation({
    onSuccess: () => { toast('Damage recorded', 'success'); refetch(); setDamageQty(''); },
    onError: () => toast('Could not record damage', 'error'),
  });
  const [showEdit, setShowEdit] = useState(false);
  const [damageQty, setDamageQty] = useState('');
  const [damageStatus, setDamageStatus] = useState<'repair' | 'replace' | 'dispose'>('repair');

  if (isLoading || !data) return <LoadingState message="Loading item..." />;

  const { item, allocations } = data;
  const available = computeAvailable(item);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/inventory" className="text-sm text-muted-foreground hover:text-primary">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{item.sku}</p>
          {item.categoryName && <p className="text-sm text-muted-foreground">{item.categoryName}</p>}
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowEdit(true)}>Edit item</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">On hand</p>
          <p className="text-xl font-semibold">{item.quantityOnHand}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className={`text-xl font-semibold ${available <= item.reorderLevel ? 'text-amber-700' : ''}`}>{available}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Reserved</p>
          <p className="text-xl font-semibold">{item.quantityReserved}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Damaged</p>
          <p className="text-xl font-semibold text-red-700">{item.quantityDamaged}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3 p-6 lg:col-span-2">
          <h2 className="font-semibold">Location & pricing</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Storage location</dt><dd className="font-medium">{item.locationPath ?? 'Unassigned'}</dd></div>
            <div><dt className="text-muted-foreground">Warehouse</dt><dd>{item.warehouseId ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Unit cost</dt><dd>{formatCurrency(item.unitCostCents)}</dd></div>
            <div><dt className="text-muted-foreground">Sell price</dt><dd>{formatMultiPrice(item.prices, item.sellPriceCents)}</dd></div>
            <div><dt className="text-muted-foreground">Reorder level</dt><dd>{item.reorderLevel}</dd></div>
            <div><dt className="text-muted-foreground">Max stock</dt><dd>{item.maxStock}</dd></div>
            <div><dt className="text-muted-foreground">Barcode</dt><dd className="font-mono text-xs">{item.barcode ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">QR code</dt><dd className="font-mono text-xs">{item.qrCode ?? '—'}</dd></div>
          </dl>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <QRGenerator sku={item.sku} qrCode={item.qrCode} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Record damage</h2>
        <p className="mt-1 text-sm text-muted-foreground">Move units from on-hand to damaged inventory.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input type="number" min={1} placeholder="Qty" value={damageQty} onChange={(e) => setDamageQty(e.target.value)} className="input w-24" />
          <select value={damageStatus} onChange={(e) => setDamageStatus(e.target.value as typeof damageStatus)} className="input w-auto">
            <option value="repair">Repair</option>
            <option value="replace">Replace</option>
            <option value="dispose">Dispose</option>
          </select>
          <button
            type="button"
            className="btn-primary"
            disabled={!damageQty || markDamaged.isPending}
            onClick={() => markDamaged.mutate({ itemId, quantity: Number(damageQty), status: damageStatus })}
          >
            Mark damaged
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Job material reservations</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Job</th><th>Qty</th><th>Status</th><th>Pick location</th></tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/app/jobs/${a.jobId}`} className="text-primary hover:underline">{a.jobId.slice(0, 8)}…</Link>
                </td>
                <td>{a.quantity}</td>
                <td className="capitalize">{a.status}</td>
                <td className="text-muted-foreground">{a.warehouseLocation ?? item.locationBin ?? '—'}</td>
              </tr>
            ))}
            {!allocations.length && (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Not reserved for any jobs.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showEdit && (
        <InventoryEditDialog item={item} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); refetch(); }} />
      )}
    </div>
  );
}
