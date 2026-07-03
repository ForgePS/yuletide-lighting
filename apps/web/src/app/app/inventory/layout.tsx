'use client';

import Link from 'next/link';
import { InventoryNav } from '@/components/inventory';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Inventory</h1>
        <p className="page-subtitle">Manage SKUs, stock levels, and pricing</p>
      </div>
      <InventoryNav />
      <div>{children}</div>
    </div>
  );
}
