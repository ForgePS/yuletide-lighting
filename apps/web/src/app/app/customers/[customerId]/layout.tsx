'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { CustomerHeader, CustomerTabs } from '@/components/customers';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAnalyticsYear } from '@/lib/analytics-year-context';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const customerId = params.customerId as string;
  const { year } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.customer360.getById.useQuery({ customerId, year });

  if (isLoading) return <LoadingState message="Loading customer..." />;
  if (isError || !data) {
    return (
      <div>
        <Link href="/app/customers" className="text-sm text-primary hover:underline">← Customers</Link>
        <div className="mt-6">
          <ErrorState title="Customer not found" message="This customer may have been deleted or you may not have access." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/app/customers" className="text-sm text-primary hover:underline">← Customers</Link>
      <CustomerHeader customerId={customerId} customer={data} />
      <CustomerTabs customerId={customerId} />
      <div>{children}</div>
    </div>
  );
}
