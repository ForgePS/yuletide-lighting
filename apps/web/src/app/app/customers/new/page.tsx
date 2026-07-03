'use client';

import Link from 'next/link';
import { CustomerForm } from '@/components/customers';

export default function NewCustomerPage() {
  return (
    <div>
      <div className="page-header">
        <Link href="/app/customers" className="text-sm text-primary hover:underline">← Customers</Link>
        <h1 className="page-title mt-2">New customer</h1>
        <p className="page-subtitle">Create a customer record with service address and billing info</p>
      </div>
      <div className="mt-6">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
