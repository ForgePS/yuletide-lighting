'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { formatCurrency, STATUS_COLORS } from '@/lib/mockup-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { MockupDashboardKpis } from '@clcrm/types';

export function MockupDashboard({ kpis }: { kpis?: MockupDashboardKpis }) {
  if (!kpis) return null;
  const cards = [
    { label: 'Recent designs', value: String(kpis.recentDesigns) },
    { label: 'Drafts', value: String(kpis.draftDesigns) },
    { label: 'Approved', value: String(kpis.approvedDesigns) },
    { label: 'Most viewed', value: String(kpis.mostViewedCount) },
    { label: 'Conversion rate', value: `${kpis.designConversionRatePercent}%` },
    { label: 'Revenue generated', value: formatCurrency(kpis.revenueGeneratedCents) },
    { label: 'Avg design time', value: `${kpis.averageDesignTimeMinutes} min` },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function MockupDashboardPage() {
  const { data: kpis, isLoading, isError, refetch } = trpc.mockups360.dashboard.useQuery();
  const { data: mockups } = trpc.mockups360.list.useQuery();

  if (isLoading) return <LoadingState message="Loading design dashboard..." />;
  if (isError || !kpis) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <MockupDashboard kpis={kpis} />
      <div className="card p-6">
        <h2 className="font-semibold">Recent designs</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockups?.slice(0, 6).map((m) => (
            <Link key={m.id} href={`/app/mockups/${m.id}`} className="group overflow-hidden rounded-lg border transition hover:shadow-md">
              <AuthenticatedImage
                value={m.thumbnailUrl ?? m.imageUrl}
                alt={m.name}
                className="aspect-video w-full object-cover"
                fallback={<div className="aspect-video w-full bg-muted" />}
              />
              <div className="p-3">
                <p className="font-medium group-hover:text-primary">{m.name}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[m.status] ?? ''}`}>{m.status.replace(/_/g, ' ')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
