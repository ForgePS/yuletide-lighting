'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CustomerForm, customerToFormValues } from '@/components/customers';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function EditCustomerPage() {
  const customerId = useParams().customerId as string;
  const { data, isLoading, isError, refetch } = trpc.customer360.getById.useQuery({ customerId });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load customer." onRetry={() => refetch()} />;

  return (
    <div>
      <div className="page-header mb-6">
        <Link href={`/app/customers/${customerId}`} className="text-sm text-primary hover:underline">← Back to profile</Link>
        <h1 className="page-title mt-2">Edit customer</h1>
      </div>
      <CustomerForm
        mode="edit"
        customerId={customerId}
        initial={customerToFormValues(data, data.properties?.[0])}
      />
    </div>
  );
}
