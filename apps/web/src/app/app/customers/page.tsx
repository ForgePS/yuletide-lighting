'use client';

import Link from 'next/link';
import { CustomerList } from '@/components/customers';

export default function CustomersPage() {
  return (
    <div className="space-y-4" data-tour="customers-list">
      <div className="flex justify-end">
        <Link href="/app/customers/portal-qr" className="text-sm text-primary hover:underline">
          Bulk portal QR codes
        </Link>
      </div>
      <CustomerList />
    </div>
  );
}
