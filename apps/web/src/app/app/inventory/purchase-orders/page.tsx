import { PurchaseOrderManager, VendorManager } from '@/components/inventory';

export default function Page() {
  return (
    <div className="space-y-10">
      <PurchaseOrderManager />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Vendors</h2>
        <VendorManager />
      </div>
    </div>
  );
}
