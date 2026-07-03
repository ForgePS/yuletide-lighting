'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { formatCurrency } from '@clcrm/ui';
import {
  ArrowUpRight,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  Package,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';

function stageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionCard({
  title,
  href,
  linkLabel,
  children,
  empty,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {href && linkLabel ? (
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            {linkLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {empty ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
    </div>
  );
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function SeasonalCommandCenter() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const { data, isLoading, isError, error, refetch } = trpc.reports360.commandCenter.useQuery(filterInput, { staleTime: 60_000 });

  if (isLoading || (!data && !isError)) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const code = (error as { data?: { code?: string } } | null)?.data?.code;
    const message =
      code === 'UNAUTHORIZED'
        ? 'Your session expired. Sign out and sign in again.'
        : code === 'FORBIDDEN'
          ? 'Your account does not have access to the dashboard.'
          : 'The command center took too long or hit an error. Try again in a moment.';
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h2 className="text-lg font-semibold">Could not load dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button type="button" onClick={() => refetch()} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    { label: 'New leads this week', value: String(data.kpis.newLeadsThisWeek), icon: Users, href: '/app/pipeline', color: 'text-blue-600 bg-blue-500/10' },
    { label: 'Proposals sent', value: String(data.kpis.proposalsSent), icon: FileText, href: '/app/proposals', color: 'text-violet-600 bg-violet-500/10' },
    { label: 'Awaiting approval', value: String(data.kpis.proposalsAwaitingApproval), icon: ClipboardList, href: '/app/proposals', color: 'text-amber-600 bg-amber-500/10' },
    { label: 'Booked revenue', value: formatCurrency(data.kpis.bookedRevenueCents), icon: DollarSign, href: '/app/reports/financial', color: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Projected revenue', value: formatCurrency(data.kpis.projectedRevenueCents), icon: TrendingUp, href: '/app/reports/financial', color: 'text-primary bg-primary/10' },
    { label: 'Installs this week', value: String(data.kpis.installsScheduledThisWeek), icon: Calendar, href: '/app/schedule/calendar', color: 'text-cyan-600 bg-cyan-500/10' },
    { label: 'Removals scheduled', value: String(data.kpis.removalsScheduledThisWeek), icon: Calendar, href: '/app/schedule/calendar', color: 'text-orange-600 bg-orange-500/10' },
    { label: 'Rebooking rate', value: `${data.kpis.rebookingRatePercent}%`, icon: RefreshCw, href: '/app/rebooking', color: 'text-pink-600 bg-pink-500/10' },
    { label: 'Low-stock alerts', value: String(data.kpis.lowStockAlerts), icon: Package, href: '/app/inventory/dashboard', color: 'text-red-600 bg-red-500/10' },
    { label: 'Open service calls', value: String(data.kpis.openServiceCalls), icon: Wrench, href: '/app/service-issues', color: 'text-purple-600 bg-purple-500/10' },
    { label: 'Outstanding invoices', value: formatCurrency(data.kpis.outstandingInvoicesCents), icon: DollarSign, href: '/app/invoices/collections', color: 'text-amber-700 bg-amber-500/10' },
  ];

  const maxForecast = Math.max(...data.revenueForecast.map((f) => f.projectedCents), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">Seasonal operations overview · {yearLabel.toLowerCase()}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
          <Star className="h-4 w-4" />
          {data.currentSeasonPhase}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="card-hover group block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Today's installs" href="/app/schedule/calendar" linkLabel="Schedule" empty={data.todaysInstalls.length === 0 ? 'No installs scheduled for today.' : undefined}>
          {data.todaysInstalls.length > 0 && (
            <ul className="space-y-3">
              {data.todaysInstalls.map((job) => (
                <li key={job.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.customerName ?? 'Customer'}{job.propertyAddress ? ` · ${job.propertyAddress}` : ''}</p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">{formatTime(job.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Follow-ups due" href="/app/pipeline" linkLabel="Pipeline" empty={data.followUpsDue.length === 0 ? 'No overdue follow-ups.' : undefined}>
          {data.followUpsDue.length > 0 && (
            <ul className="space-y-3">
              {data.followUpsDue.map((item) => (
                <li key={item.customerId} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <Link href={`/app/customers/${item.customerId}`} className="font-medium hover:text-primary hover:underline">
                      {item.customerName}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.nextAction ?? stageLabel(item.stage)}</p>
                  </div>
                  {item.dueAt ? <span className="shrink-0 text-xs text-amber-700">{item.dueAt.toLocaleDateString()}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Proposal pipeline" href="/app/proposals" linkLabel="Proposals">
          <ul className="space-y-2">
            {data.proposalPipeline.map((stage) => (
              <li key={stage.stage} className="flex items-center justify-between gap-3 text-sm">
                <span>{stage.stage}</span>
                <span className="text-muted-foreground">{stage.count} · {formatCurrency(stage.valueCents)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Revenue forecast" href="/app/reports/financial" linkLabel="Financials" empty={data.revenueForecast.length === 0 ? 'Forecast data will appear as proposals and jobs accumulate.' : undefined}>
          {data.revenueForecast.length > 0 && (
            <div className="space-y-3">
              {data.revenueForecast.slice(0, 6).map((point) => (
                <div key={point.period}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{point.period}</span>
                    <span>{formatCurrency(point.projectedCents)} projected</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, Math.round((point.projectedCents / maxForecast) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Crew workload" href="/app/crew" linkLabel="Crew" empty={data.crewWorkload.length === 0 ? 'Add crews to track workload.' : undefined}>
          {data.crewWorkload.length > 0 && (
            <ul className="space-y-3">
              {data.crewWorkload.map((crew) => (
                <li key={crew.crewName} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{crew.crewName}</p>
                    <p className="text-sm text-muted-foreground">{crew.jobsThisWeek} jobs this week</p>
                  </div>
                  <span className="text-sm font-semibold">{crew.utilizationPercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Inventory warnings" href="/app/inventory/dashboard" linkLabel="Inventory" empty={data.inventoryWarnings.length === 0 ? 'No low-stock items right now.' : undefined}>
          {data.inventoryWarnings.length > 0 && (
            <ul className="space-y-3">
              {data.inventoryWarnings.map((item) => (
                <li key={item.itemId} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <Link href={`/app/inventory/items/${item.itemId}`} className="font-medium hover:text-primary hover:underline">
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">{item.quantityOnHand} / {item.reorderThreshold}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Rebooking opportunities" href="/app/rebooking" linkLabel="Rebooking" empty={data.rebookingOpportunities.length === 0 ? 'No pending rebooking targets.' : undefined}>
          {data.rebookingOpportunities.length > 0 && (
            <ul className="space-y-3">
              {data.rebookingOpportunities.map((item) => (
                <li key={`${item.customerId}-${item.status}`} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    {item.customerId ? (
                      <Link href={`/app/customers/${item.customerId}`} className="font-medium hover:text-primary hover:underline">
                        {item.customerName}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.customerName}</p>
                    )}
                    <p className="text-sm capitalize text-muted-foreground">{item.status.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.projectedValueCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
