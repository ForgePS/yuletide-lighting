'use client';

import Link from 'next/link';
import { InvoiceNav } from '@/components/invoices';

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Accounts Receivable</h1>
        <p className="page-subtitle">Invoices, collections & cash flow</p>
      </div>
      <InvoiceNav />
      <div>{children}</div>
    </div>
  );
}
