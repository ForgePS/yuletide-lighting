'use client';

import { useParams } from 'next/navigation';
import { CustomerBilling } from '@/components/invoices';

export default function CustomerBillingPage() {
  const customerId = useParams().customerId as string;
  return <CustomerBilling customerId={customerId} />;
}
