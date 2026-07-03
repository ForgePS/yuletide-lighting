'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/inventory-utils';
import { LoadingState } from '@/components/ui/states';
import { BarcodeScannerPanel } from './warehouse-map';

export function InventoryLocationsHub() {
  const { data, isLoading } = trpc.inventory360.locations.summary.useQuery();
  const { data: warehouses } = trpc.inventory360.warehouses.list.useQuery();

  if (isLoading) return <LoadingState message="Loading locations..." />;

  const byType = {
    warehouse: data?.filter((l) => l.locationType === 'warehouse') ?? [],
    vehicle: data?.filter((l) => l.locationType === 'vehicle') ?? [],
    storage_bin: data?.filter((l) => l.locationType === 'storage_bin') ?? [],
    unassigned: data?.filter((l) => l.locationType === 'unassigned') ?? [],
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Warehouses</p>
          <p className="mt-1 text-2xl font-semibold">{warehouses?.length ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Bin locations</p>
          <p className="mt-1 text-2xl font-semibold">{byType.warehouse.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Vehicle loads</p>
          <p className="mt-1 text-2xl font-semibold">{byType.vehicle.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Unassigned</p>
          <p className="mt-1 text-2xl font-semibold">{byType.unassigned.reduce((s, l) => s + l.itemCount, 0)} items</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold">Inventory by location</h2>
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Type</th>
                <th>SKUs</th>
                <th>Qty on hand</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((loc) => (
                <tr key={loc.locationKey}>
                  <td className="font-medium">{loc.label}</td>
                  <td className="capitalize text-muted-foreground">{loc.locationType.replace(/_/g, ' ')}</td>
                  <td>{loc.itemCount}</td>
                  <td>{loc.totalQuantity}</td>
                  <td>{formatCurrency(loc.totalValueCents)}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No inventory locations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarcodeScannerPanel />
        <div className="card p-6">
          <h2 className="font-semibold">Quick links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/app/inventory/warehouse" className="text-primary hover:underline">Manage warehouse bins</Link></li>
            <li><Link href="/app/inventory/trucks" className="text-primary hover:underline">Truck inventory</Link></li>
            <li><Link href="/app/inventory/transfers" className="text-primary hover:underline">Transfer between locations</Link></li>
            <li><Link href="/app/inventory/audits" className="text-primary hover:underline">Cycle counts & audits</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
