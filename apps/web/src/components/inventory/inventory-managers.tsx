'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/inventory-utils';
import { LoadingState, EmptyState } from '@/components/ui/states';

export function PurchaseOrderManager() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.inventory360.purchaseOrders.list.useQuery();
  const { data: vendors } = trpc.inventory360.vendors.list.useQuery();
  const create = trpc.inventory360.purchaseOrders.create.useMutation({ onSuccess: () => { toast('PO created', 'success'); refetch(); } });
  const updateStatus = trpc.inventory360.purchaseOrders.updateStatus.useMutation({ onSuccess: () => { toast('PO updated', 'success'); refetch(); } });
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-semibold">Purchase orders</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New PO'}</button>
      </div>
      {showForm && (
        <form className="card space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); create.mutate({ vendorId: String(fd.get('vendorId')), lineItems: [{ description: String(fd.get('desc')), quantityOrdered: Number(fd.get('qty')), unitCostCents: Number(fd.get('cost')) }] }); setShowForm(false); }}>
          <select name="vendorId" required className="input">{vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <input name="desc" required placeholder="Item description" className="input" />
          <div className="grid gap-4 sm:grid-cols-2"><input name="qty" type="number" required placeholder="Qty" className="input" /><input name="cost" type="number" required placeholder="Unit cost (cents)" className="input" /></div>
          <button type="submit" className="btn-primary">Create PO</button>
        </form>
      )}
      {!data?.length ? <EmptyState title="No purchase orders" /> : (
        <table className="data-table card overflow-hidden">
          <thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map((po) => (
              <tr key={po.id}>
                <td className="font-mono">{po.poNumber}</td>
                <td>{po.vendorName}</td>
                <td className="capitalize">{po.status.replace(/_/g, ' ')}</td>
                <td>{formatCurrency(po.subtotalCents)}</td>
                <td className="space-x-2">
                  {po.status === 'draft' && <button type="button" className="text-sm text-primary" onClick={() => updateStatus.mutate({ poId: po.id, status: 'ordered' })}>Order</button>}
                  {po.status === 'ordered' && <button type="button" className="text-sm text-primary" onClick={() => updateStatus.mutate({ poId: po.id, status: 'received' })}>Receive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function VendorManager() {
  const { data, isLoading } = trpc.inventory360.vendors.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <table className="data-table card overflow-hidden">
      <thead><tr><th>Vendor</th><th>Lead time</th><th>Preferred</th><th>Contact</th></tr></thead>
      <tbody>{data?.map((v) => <tr key={v.id}><td className="font-medium">{v.name}</td><td>{v.leadTimeDays} days</td><td>{v.isPreferred ? 'Yes' : '—'}</td><td className="text-muted-foreground">{v.email ?? v.phone ?? '—'}</td></tr>)}</tbody>
    </table>
  );
}

export function InventoryTransferForm() {
  const { toast } = useToast();
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const { data, refetch } = trpc.inventory360.transfers.list.useQuery();
  const create = trpc.inventory360.transfers.create.useMutation({ onSuccess: () => { toast('Transfer recorded', 'success'); refetch(); } });

  return (
    <div className="space-y-6">
      <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); create.mutate({ itemId: String(fd.get('itemId')), quantity: Number(fd.get('qty')), fromLocation: String(fd.get('from')), toLocation: String(fd.get('to')), fromType: 'warehouse', toType: String(fd.get('toType')) as 'warehouse' | 'truck' | 'customer' | 'job_site', reason: 'restock' }); e.currentTarget.reset(); }}>
        <select name="itemId" required className="input sm:col-span-2">{items?.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}</select>
        <input name="from" required placeholder="From location" className="input" />
        <input name="to" required placeholder="To location" className="input" />
        <select name="toType" className="input"><option value="warehouse">Warehouse</option><option value="truck">Truck</option><option value="customer">Customer</option><option value="job_site">Job site</option></select>
        <input name="qty" type="number" required placeholder="Quantity" className="input" />
        <button type="submit" className="btn-primary sm:col-span-2">Transfer</button>
      </form>
      <table className="data-table card overflow-hidden">
        <thead><tr><th>Item</th><th>Qty</th><th>From → To</th><th>Date</th></tr></thead>
        <tbody>{data?.map((t) => <tr key={t.id}><td>{t.itemName}</td><td>{t.quantity}</td><td>{t.fromLocation} → {t.toLocation}</td><td>{new Date(t.transferredAt).toLocaleDateString()}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function AuditManager() {
  const { toast } = useToast();
  const { data, refetch } = trpc.inventory360.audits.list.useQuery();
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const create = trpc.inventory360.audits.create.useMutation({ onSuccess: () => { toast('Audit completed', 'success'); refetch(); } });

  return (
    <div className="space-y-6">
      <form className="card space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); if (!items?.[0]) return; create.mutate({ auditType: 'cycle_count', lines: items.slice(0, 5).map((i) => ({ itemId: i.id, expectedQty: i.quantityOnHand, actualQty: i.quantityOnHand })) }); }}>
        <p className="text-sm text-muted-foreground">Run a quick cycle count on first 5 items (demo).</p>
        <button type="submit" className="btn-primary">Start cycle count</button>
      </form>
      {data?.map((audit) => (
        <div key={audit.id} className="card p-4">
          <p className="font-medium capitalize">{audit.auditType.replace(/_/g, ' ')} — {audit.accuracyPercent}% accuracy</p>
          <p className="text-xs text-muted-foreground">{audit.lines.length} lines · {audit.completedAt ? new Date(audit.completedAt).toLocaleString() : ''}</p>
        </div>
      ))}
    </div>
  );
}

export function TruckInventoryManager() {
  const { data, isLoading } = trpc.inventory360.trucks.list.useQuery();
  const { data: items } = trpc.inventory360.items.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data?.map((truck) => (
        <div key={truck.id} className="card p-5">
          <h3 className="font-semibold">{truck.vehicleName}</h3>
          <p className="text-sm capitalize text-muted-foreground">{truck.vehicleType.replace(/_/g, ' ')}</p>
          <p className="mt-3 text-sm">{truck.totalItems} items · {formatCurrency(truck.totalValueCents)}</p>
          <ul className="mt-2 text-xs text-muted-foreground">{items?.filter((i) => i.truckId === truck.id).slice(0, 3).map((i) => <li key={i.id}>{i.name}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export function CustomerInventoryManager() {
  const { toast } = useToast();
  const { data, refetch } = trpc.inventory360.customers.list.useQuery({});
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const { data: customers } = trpc.customer360.list.useQuery({ page: 1, pageSize: 100, enrich: 'none' });
  const assign = trpc.inventory360.customers.assign.useMutation({ onSuccess: () => { toast('Assigned to customer', 'success'); refetch(); } });

  return (
    <div className="space-y-6">
      <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); assign.mutate({ customerId: String(fd.get('customerId')), itemId: String(fd.get('itemId')), quantity: Number(fd.get('qty')), storageBin: String(fd.get('bin')) }); }}>
        <select name="customerId" required className="input">{customers?.items.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
        <select name="itemId" required className="input">{items?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input name="qty" type="number" required placeholder="Quantity" className="input" />
        <input name="bin" placeholder="Storage bin" className="input" />
        <button type="submit" className="btn-primary sm:col-span-2">Assign to customer</button>
      </form>
      <table className="data-table card overflow-hidden">
        <thead><tr><th>Customer</th><th>Item</th><th>Qty</th><th>Bin</th><th>QR</th></tr></thead>
        <tbody>{data?.map((a) => <tr key={a.id}><td>{a.customerName ?? a.customerId}</td><td>{a.itemName}</td><td>{a.quantity}</td><td>{a.storageBin ?? '—'}</td><td className="font-mono text-xs">{a.qrCode ?? '—'}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function StorageManager() {
  return <CustomerInventoryManager />;
}
