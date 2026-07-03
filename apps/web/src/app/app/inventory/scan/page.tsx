import { BarcodeScannerPanel } from '@/components/inventory';

export default function InventoryScanPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Scan items in or out of warehouse, trucks, and job sites.</p>
      <BarcodeScannerPanel />
    </div>
  );
}
