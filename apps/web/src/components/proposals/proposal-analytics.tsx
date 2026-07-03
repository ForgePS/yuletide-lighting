'use client';

import { trpc } from '@/lib/trpc';
import { ProposalDashboardMetrics } from './proposal-dashboard';
import { formatCurrency } from '@/lib/proposal-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';

export function ProposalAnalyticsPage() {
  const { data, isLoading, isError, refetch } = trpc.proposals360.analytics.useQuery();
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <ProposalDashboardMetrics analytics={data} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Conversion funnel</h2>
          <div className="mt-4 space-y-2">
            {data.funnel.filter((f) => f.count > 0).map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs capitalize text-muted-foreground">{f.stage.replace(/_/g, ' ')}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (f.count / Math.max(data.totalProposals, 1)) * 100)}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-medium">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Salesperson performance</h2>
          <table className="data-table mt-4">
            <thead><tr><th>Name</th><th>Won</th><th>Revenue</th></tr></thead>
            <tbody>
              {data.salespersonPerformance.map((s) => (
                <tr key={s.name}><td>{s.name}</td><td>{s.won}</td><td>{formatCurrency(s.revenueCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold">Monthly revenue won</h2>
          <div className="mt-4 flex items-end gap-2 h-40">
            {data.monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(8, (m.revenueCents / Math.max(data.revenueWonCents, 1)) * 120)}px` }} />
                <span className="text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Package selection rate</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Basic: {data.packageSelectionRate.basic}%</li>
            <li>Recommended: {data.packageSelectionRate.recommended}%</li>
            <li>Premium: {data.packageSelectionRate.premium}%</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Avg close time: {data.averageCloseTimeDays} days · Avg value: {formatCurrency(data.averageProposalValueCents)}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Top upsells</h2>
          <ul className="mt-4 list-disc pl-5 text-sm">{data.topUpsells.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
