'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { InvoiceDetail } from '@/components/invoices';

export default function InvoiceDetailPage() {
  const invoiceId = useParams().invoiceId as string;
  return (
    <div className="space-y-4">
      <Link href="/app/invoices" className="text-sm text-muted-foreground hover:text-primary">← All invoices</Link>
      <InvoiceDetail invoiceId={invoiceId} />
    </div>
  );
}
