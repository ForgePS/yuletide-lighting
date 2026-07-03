'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { formatCurrency } from '@clcrm/ui';
import { BarList } from '@/components/reports/reports-widgets';
import { ArrowUpRight } from 'lucide-react';

export function DashboardWidgets() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const { data: revenue, isLoading: revenueLoading } = trpc.reports360.revenue.useQuery(filterInput, { staleTime: 60_000 });
  const { data: invoiceAnalytics, isLoading: invoiceLoading } = trpc.invoices360.analytics.useQuery(filterInput, { staleTime: 60_000 });

  if (revenueLoading || invoiceLoading) {
    return (
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card h-64 animate-pulse bg-muted/50" />
        <div className="card h-64 animate-pulse bg-muted/50" />
      </div>
    );
  }

  const revenueItems = (revenue?.revenueByService ?? [])
    .filter((r) => r.revenueCents > 0)
    .map((r) => ({ label: r.label, revenueCents: r.revenueCents }));

  const overdue = invoiceAnalytics?.topOverdueCustomers ?? [];
  const outstanding = invoiceAnalytics?.outstandingBalanceCents ?? 0;

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">Insights</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Revenue by service</h3>
              <p className="mt-1 text-sm text-muted-foreground">{yearLabel}</p>
            </div>
            <Link href="/app/reports/sales" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Full report
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {revenueItems.length > 0 ? (
            <div className="mt-6">
              <BarList items={revenueItems} labelKey="label" valueKey="revenueCents" format="currency" />
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No revenue data for this period.</p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Balance due</h3>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(outstanding)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Outstanding across open invoices</p>
            </div>
            <Link href="/app/invoices/collections" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Collections
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {overdue.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {overdue.slice(0, 5).map((c) => (
                <li key={c.customerId} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <Link href={`/app/customers/${c.customerId}`} className="truncate text-sm font-medium hover:text-primary hover:underline">
                    {c.customerName}
                  </Link>
                  <div className="shrink-0 text-right text-sm">
                    <span className="font-semibold text-amber-700">{formatCurrency(c.balanceCents)}</span>
                    <span className="ml-2 text-muted-foreground">{c.invoiceCount} inv.</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No overdue balances — nice work.</p>
          )}
        </div>
      </div>
    </div>
  );
}
