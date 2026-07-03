'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/proposal-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { ProposalAnalytics } from '@clcrm/types';

export function ProposalDashboardMetrics({ analytics }: { analytics: ProposalAnalytics }) {
  const cards = [
    { label: 'Total proposals', value: String(analytics.totalProposals) },
    { label: 'Draft', value: String(analytics.draftProposals) },
    { label: 'Sent', value: String(analytics.sentProposals) },
    { label: 'Viewed', value: String(analytics.viewedProposals) },
    { label: 'Approved', value: String(analytics.approvedProposals) },
    { label: 'Rejected', value: String(analytics.rejectedProposals) },
    { label: 'Expired', value: String(analytics.expiredProposals) },
    { label: 'Conversion rate', value: `${analytics.conversionRate}%` },
    { label: 'Total revenue', value: formatCurrency(analytics.totalProposalRevenueCents) },
    { label: 'Revenue won', value: formatCurrency(analytics.revenueWonCents) },
    { label: 'Revenue lost', value: formatCurrency(analytics.revenueLostCents) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-xl font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProposalDashboard() {
  const { data: analytics, isLoading, isError, refetch } = trpc.proposals360.analytics.useQuery();
  const { data: proposals } = trpc.proposals360.list.useQuery();

  if (isLoading) return <LoadingState message="Loading proposal dashboard..." />;
  if (isError || !analytics) return <ErrorState message="Could not load analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <ProposalDashboardMetrics analytics={analytics} />
      <div className="flex flex-wrap gap-2">
        <Link href="/app/proposals/analytics" className="btn-secondary">Full analytics</Link>
        <Link href="/app/proposals/templates" className="btn-secondary">Templates</Link>
        <Link href="/app/proposals/packages" className="btn-secondary">Package library</Link>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Recent proposals</h2>
        </div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Customer</th><th>Status</th><th>Amount</th><th>Views</th></tr></thead>
          <tbody>
            {(proposals ?? []).slice(0, 10).map((p) => (
              <tr key={p.id}>
                <td><Link href={`/app/proposals/${p.id}`} className="font-medium text-primary hover:underline">{p.title}</Link></td>
                <td className="text-muted-foreground">{p.customerName ?? '—'}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusClass(p.status)}`}>{p.status.replace(/_/g, ' ')}</span></td>
                <td>{formatCurrency(p.subtotalCents)}</td>
                <td className="text-muted-foreground">{p.viewCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  return status.includes('approved') || status === 'deposit_paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground';
}
