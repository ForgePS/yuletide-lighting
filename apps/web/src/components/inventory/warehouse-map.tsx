'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { stockLevelColor } from '@/lib/inventory-utils';
import { LoadingState } from '@/components/ui/states';

export function WarehouseMap() {
  const { data: warehouses, isLoading } = trpc.inventory360.warehouses.list.useQuery();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const warehouseId = selectedWarehouse || warehouses?.[0]?.id || '';
  const { data: locations } = trpc.inventory360.warehouses.locations.list.useQuery({ warehouseId }, { enabled: !!warehouseId });
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const { toast } = useToast();
  const createLoc = trpc.inventory360.warehouses.locations.create.useMutation({ onSuccess: () => toast('Location added', 'success') });

  if (isLoading) return <LoadingState />;

  const hasLocations = (locations?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {warehouses?.map((w) => (
          <button key={w.id} type="button" onClick={() => setSelectedWarehouse(w.id)} className={warehouseId === w.id ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>{w.name}</button>
        ))}
      </div>
      {!hasLocations ? (
        <div className="card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No bin locations yet</p>
          <p className="mt-2">Add aisle/rack/shelf/bin locations below, or assign locations when editing items. Imported items are assigned to the main warehouse automatically.</p>
        </div>
      ) : (
        <>
      <p className="text-sm text-muted-foreground">Click a bin to view inventory count. Color indicates stock level.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {locations!.map((loc) => {
          const count = items?.filter((it) => it.locationPath === loc.label || (it.locationAisle === loc.aisle && it.locationRack === loc.rack)).length ?? loc.itemCount;
          const color = stockLevelColor(count, 3);
          return (
            <button key={loc.id} type="button" className="card card-hover p-4 text-left">
              <div className={`mb-2 h-2 rounded-full ${color}`} />
              <p className="text-xs font-medium">{loc.label}</p>
              <p className="text-lg font-semibold">{count}</p>
            </button>
          );
        })}
      </div>
        </>
      )}
      <form className="card flex flex-wrap gap-2 p-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createLoc.mutate({ warehouseId, aisle: String(fd.get('aisle')), rack: String(fd.get('rack')), shelf: String(fd.get('shelf')), bin: String(fd.get('bin')), capacity: 100 }); }}>
        <input name="aisle" placeholder="Aisle" required className="input w-24" />
        <input name="rack" placeholder="Rack" required className="input w-24" />
        <input name="shelf" placeholder="Shelf" required className="input w-24" />
        <input name="bin" placeholder="Bin" required className="input w-24" />
        <button type="submit" className="btn-primary">Add location</button>
      </form>
    </div>
  );
}

export function BarcodeScannerPanel() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [action, setAction] = useState<'check_in' | 'check_out' | 'assign_customer' | 'assign_truck'>('check_in');
  const scan = trpc.inventory360.barcode.scan.useMutation({ onSuccess: () => { toast('Scan processed', 'success'); setCode(''); } });

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-semibold">Barcode / QR scanner</h2>
      <p className="text-sm text-muted-foreground">Mobile scanner support — enter or scan code below.</p>
      <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="input">
        <option value="check_in">Check in</option>
        <option value="check_out">Check out</option>
        <option value="assign_customer">Assign to customer</option>
        <option value="assign_truck">Assign to truck</option>
      </select>
      <input placeholder="Scan barcode or QR..." value={code} onChange={(e) => setCode(e.target.value)} className="input font-mono" autoFocus />
      <button type="button" className="btn-primary" disabled={!code || scan.isPending} onClick={() => scan.mutate({ code, action, quantity: 1 })}>Process scan</button>
    </div>
  );
}

export function QRGenerator({ sku, qrCode }: { sku: string; qrCode?: string | null }) {
  return (
    <div className="inline-flex flex-col items-center rounded-lg border border-dashed border-border p-4">
      <div className="flex h-24 w-24 items-center justify-center bg-muted font-mono text-[10px]">{qrCode ?? `YL-QR-${sku}`}</div>
      <p className="mt-2 font-mono text-xs">{sku}</p>
    </div>
  );
}
