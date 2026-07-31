'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  CustomerInsightsCard,
  CustomerOverviewWidgets,
  CustomerPortalCard,
} from '@/components/customers';
import { CustomerPortalQrCard } from '@/components/customers/customer-portal-qr-card';
import { CustomerSignMarketingCard } from '@/components/sign-tracker';
import { formatServiceAddress, formatBillingAddress } from '@/components/customer-address-fields';
import { LoadingState, ErrorState } from '@/components/ui/states';
// Follow-up automation UI removed (P0.2 Option B). See docs/production-cleanup/follow-up-automation-decision.md

export default function CustomerOverviewPage() {
  const customerId = useParams().customerId as string;
  const { data, isLoading, isError, error, refetch } = trpc.customer360.getById.useQuery({
    customerId,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load this customer.'}
        onRetry={() => void refetch()}
      />
    );
  }
  const primary = data.properties?.[0] ?? null;

  return (
    <div className="space-y-6">
      <CustomerOverviewWidgets stats={data.stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerInsightsCard insights={data.insights} />
        <CustomerPortalCard customerId={customerId} portal={data.portal} />
      </div>
      <CustomerPortalQrCard customerId={customerId} />
      <CustomerSignMarketingCard customerId={customerId} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Service address</h2>
          <p className="mt-2 text-sm text-muted-foreground">{formatServiceAddress(primary)}</p>
          {primary?.gateCode && (
            <p className="mt-2 text-sm">
              <span className="font-medium">Gate:</span> {primary.gateCode}
            </p>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Billing address</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatBillingAddress({ ...data, primaryProperty: primary })}
          </p>
        </div>
      </div>
    </div>
  );
}
