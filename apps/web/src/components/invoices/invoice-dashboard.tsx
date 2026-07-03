'use client';

import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { formatCurrency } from '@/lib/invoice-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { InvoiceDashboardKpis } from '@clcrm/types';

export function InvoiceDashboard({ kpis, yearLabel }: { kpis?: InvoiceDashboardKpis; yearLabel?: string }) {
  if (!kpis) return null;
  const paidLabel = yearLabel && yearLabel !== 'All time' ? `Collected in ${yearLabel}` : 'Paid this month';
  const cards = [
    { label: 'Total receivables', value: formatCurrency(kpis.totalReceivablesCents) },
    { label: 'Current balance', value: formatCurrency(kpis.currentBalanceCents) },
    { label: 'Overdue balance', value: formatCurrency(kpis.overdueBalanceCents) },
    { label: 'Deposits outstanding', value: formatCurrency(kpis.depositsOutstandingCents) },
    { label: 'Collection rate', value: `${kpis.collectionRatePercent}%` },
    { label: 'Avg days to pay', value: String(kpis.averageDaysToPay) },
    { label: paidLabel, value: formatCurrency(kpis.totalPaidThisMonthCents) },
    { label: 'Expected collections', value: formatCurrency(kpis.expectedCollectionsCents) },
    { label: 'Revenue forecast', value: formatCurrency(kpis.revenueForecastCents) },
    { label: 'Aging risk score', value: String(kpis.agingRiskScore) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function InvoiceDashboardPage() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.invoices360.dashboard.useQuery(filterInput);
  const { data: forecasts } = trpc.invoices360.forecasts.useQuery();

  if (isLoading) return <LoadingState message="Loading AR dashboard..." />;
  if (isError || !data) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Showing collections for <span className="font-medium text-foreground">{yearLabel}</span>. Receivables balances reflect current open invoices.</p>
      <InvoiceDashboard kpis={data} yearLabel={yearLabel} />
      {forecasts && forecasts.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold">Cash flow forecast</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {forecasts.map((f) => (
              <div key={f.horizonDays} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">{f.horizonDays}-day forecast</p>
                <p className="mt-2 text-lg font-semibold">{formatCurrency(f.expectedCollectionsCents)}</p>
                <p className="text-xs text-muted-foreground">Late payment risk: {formatCurrency(f.latePaymentRiskCents)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
