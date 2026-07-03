'use client';

import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/schedule-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { ScheduleDashboardKpis } from '@clcrm/types';

export function ScheduleDashboard({ kpis }: { kpis?: ScheduleDashboardKpis }) {
  if (!kpis) return null;
  const cards = [
    { label: 'Jobs today', value: String(kpis.jobsScheduledToday) },
    { label: 'Estimates', value: String(kpis.estimatesScheduled) },
    { label: 'Installations', value: String(kpis.installationsScheduled) },
    { label: 'Service calls', value: String(kpis.serviceCallsScheduled) },
    { label: 'Takedowns', value: String(kpis.takedownsScheduled) },
    { label: 'Open slots', value: String(kpis.openTimeSlots) },
    { label: 'Crew utilization', value: `${kpis.crewUtilizationPercent}%` },
    { label: 'Route efficiency', value: String(kpis.routeEfficiencyScore) },
    { label: 'Revenue scheduled', value: formatCurrency(kpis.revenueScheduledCents) },
    { label: 'Capacity remaining', value: `${kpis.capacityRemainingPercent}%` },
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

export function ScheduleDashboardPage() {
  const { data, isLoading, isError, refetch } = trpc.schedule360.dashboard.useQuery();
  const { data: weather } = trpc.schedule360.weather.useQuery();
  const { data: conflicts } = trpc.schedule360.events.conflicts.useQuery({});

  if (isLoading) return <LoadingState message="Loading schedule dashboard..." />;
  if (isError || !data) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <ScheduleDashboard kpis={data} />
      {conflicts && conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{conflicts.length} schedule conflict(s) detected</p>
          <ul className="mt-2 space-y-1">
            {conflicts.slice(0, 5).map((c) => <li key={c.id}>• {c.message}</li>)}
          </ul>
        </div>
      )}
      {weather && (
        <div className="card p-6">
          <h2 className="font-semibold">Weather outlook</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {weather.map((w) => (
              <div key={w.date.toISOString()} className={`rounded-lg border p-3 text-sm ${w.riskLevel === 'high' ? 'border-red-300 bg-red-50' : ''}`}>
                <p className="font-medium">{w.date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                <p className="text-muted-foreground">{w.condition}</p>
                <p className="text-xs">Rain {w.rainProbability}% · Wind {w.windSpeedMph}mph</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
