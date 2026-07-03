'use client';

import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { formatCurrency, formatPercent } from '@/lib/report-utils';
import { KpiGrid, BarList, FunnelChart, ExportButton, ReportsLoading, ReportsError, DataTable } from './reports-widgets';

export function ExecutiveDashboardPage() {
  const { filterInput, year, yearLabel } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.executive.useQuery(filterInput, { staleTime: 120_000, refetchInterval: 5 * 60_000 });
  const { data: revenue } = trpc.reports360.revenue.useQuery(filterInput);

  if (isLoading) return <ReportsLoading message="Loading executive dashboard..." />;
  if (isError || !data) return <ReportsError message="Could not load executive dashboard." onRetry={() => refetch()} />;

  const cards = [
    { label: year != null ? `${yearLabel} revenue` : 'Total revenue', value: formatCurrency(data.totalRevenueCents) },
    { label: year != null ? `${yearLabel} · this month` : 'Revenue this month', value: formatCurrency(data.revenueThisMonthCents) },
    { label: year != null ? `${yearLabel} · Aug–Dec` : 'Revenue this season', value: formatCurrency(data.revenueThisSeasonCents) },
    { label: 'Gross profit', value: formatCurrency(data.grossProfitCents) },
    { label: 'Gross margin', value: formatPercent(data.grossMarginPercent) },
    { label: 'Active customers', value: String(data.activeCustomers) },
    { label: 'Jobs scheduled', value: String(data.jobsScheduled) },
    { label: 'Jobs completed', value: String(data.jobsCompleted) },
    { label: 'Proposal conversion', value: formatPercent(data.proposalConversionRatePercent) },
    { label: 'Average sale value', value: formatCurrency(data.averageSaleValueCents) },
    { label: 'Outstanding receivables', value: formatCurrency(data.outstandingReceivablesCents) },
    { label: 'Customer retention', value: formatPercent(data.customerRetentionRatePercent) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Real-time KPIs · auto-refreshes every 30s</p>
        <div className="flex gap-2">
          <ExportButton reportType="executive" format="csv" />
          <ExportButton reportType="executive" format="pdf" />
        </div>
      </div>
      <KpiGrid cards={cards} />
      {revenue && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-semibold">Revenue trend</h2>
            <div className="mt-4"><BarList items={revenue.revenueTrend} labelKey="period" valueKey="revenueCents" /></div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold">Revenue by service</h2>
            <div className="mt-4"><BarList items={revenue.revenueByService.map((s) => ({ label: s.label, revenueCents: s.revenueCents }))} labelKey="label" valueKey="revenueCents" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RevenueAnalyticsPage() {
  const { filterInput, year, yearLabel } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.revenue.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load revenue analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <KpiGrid cards={[
        { label: year != null ? `${yearLabel} · today` : 'Daily revenue', value: formatCurrency(data.dailyRevenueCents) },
        { label: year != null ? `${yearLabel} · this week` : 'Weekly revenue', value: formatCurrency(data.weeklyRevenueCents) },
        { label: year != null ? `${yearLabel} · this month` : 'Monthly revenue', value: formatCurrency(data.monthlyRevenueCents) },
        { label: year != null ? `${yearLabel} · Aug–Dec` : 'Seasonal revenue', value: formatCurrency(data.seasonalRevenueCents) },
        { label: year != null ? `${yearLabel} total` : 'Annual revenue', value: formatCurrency(data.annualRevenueCents) },
      ]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Revenue trend</h2>
          <div className="mt-4"><BarList items={data.revenueTrend} labelKey="period" valueKey="revenueCents" /></div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Revenue by service</h2>
          <div className="mt-4"><BarList items={data.revenueByService.map((s) => ({ label: s.label, revenueCents: s.revenueCents }))} labelKey="label" valueKey="revenueCents" /></div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Revenue by salesperson</h2>
          <div className="mt-4"><BarList items={data.revenueBySalesperson.map((s) => ({ name: s.name, revenueCents: s.revenueCents }))} labelKey="name" valueKey="revenueCents" /></div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Revenue by crew</h2>
          <div className="mt-4"><BarList items={data.revenueByCrew.map((c) => ({ name: c.crewName, revenueCents: c.revenueCents }))} labelKey="name" valueKey="revenueCents" /></div>
        </div>
      </div>
    </div>
  );
}

export function SalesAnalyticsPage() {
  const { filterInput } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.sales.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load sales analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <div className="flex justify-end"><ExportButton reportType="sales" format="excel" /></div>
      <KpiGrid cards={[
        { label: 'Proposals created', value: String(data.proposalsCreated) },
        { label: 'Proposals sent', value: String(data.proposalsSent) },
        { label: 'Proposals viewed', value: String(data.proposalsViewed) },
        { label: 'Proposals approved', value: String(data.proposalsApproved) },
        { label: 'Conversion rate', value: formatPercent(data.conversionRatePercent) },
        { label: 'Avg close time', value: `${data.averageCloseTimeDays} days` },
        { label: 'Avg proposal value', value: formatCurrency(data.averageProposalValueCents) },
        { label: 'Revenue won', value: formatCurrency(data.revenueWonCents) },
        { label: 'Revenue lost', value: formatCurrency(data.revenueLostCents) },
      ]} />
      <div className="card p-6">
        <h2 className="font-semibold">Sales funnel</h2>
        <div className="mt-6"><FunnelChart stages={data.funnel} /></div>
      </div>
    </div>
  );
}

export function CustomerAnalyticsPage() {
  const { filterInput } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.customers.useQuery(filterInput);
  const { data: geo } = trpc.reports360.geographic.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load customer analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <KpiGrid cards={[
        { label: 'Total customers', value: String(data.totalCustomers) },
        { label: 'New customers', value: String(data.newCustomers) },
        { label: 'Returning customers', value: String(data.returningCustomers) },
        { label: 'Retention rate', value: formatPercent(data.retentionRatePercent) },
        { label: 'Churn rate', value: formatPercent(data.churnRatePercent) },
        { label: 'Avg lifetime value', value: formatCurrency(data.averageLifetimeValueCents) },
        { label: 'Avg spend', value: formatCurrency(data.averageSpendCents) },
      ]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Top customers</h2>
          <div className="mt-4">
            <DataTable
              headers={['Customer', 'Revenue', 'Jobs']}
              rows={data.topCustomers.map((c) => [c.name, formatCurrency(c.revenueCents), String(c.jobCount)])}
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">At-risk customers</h2>
          <div className="mt-4">
            {data.atRiskCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No at-risk customers identified.</p>
            ) : (
              <DataTable
                headers={['Customer', 'Reason', 'Days since contact']}
                rows={data.atRiskCustomers.map((c) => [c.name, c.reason, String(c.daysSinceContact)])}
              />
            )}
          </div>
        </div>
      </div>
      {geo && (
        <div className="card p-6">
          <h2 className="font-semibold">Geographic revenue</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">By ZIP code</h3>
              <div className="mt-2"><BarList items={geo.byZipCode.map((z) => ({ zip: z.zip, revenueCents: z.revenueCents }))} labelKey="zip" valueKey="revenueCents" /></div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">By city</h3>
              <div className="mt-2"><BarList items={geo.byCity.map((c) => ({ city: c.city, revenueCents: c.revenueCents }))} labelKey="city" valueKey="revenueCents" /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OperationsAnalyticsPage() {
  const { filterInput } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.operations.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load operations analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <ExportButton reportType="operations" format="csv" />
      <KpiGrid cards={[
        { label: 'Jobs scheduled', value: String(data.jobsScheduled) },
        { label: 'Jobs completed', value: String(data.jobsCompleted) },
        { label: 'Jobs delayed', value: String(data.jobsDelayed) },
        { label: 'Jobs rescheduled', value: String(data.jobsRescheduled) },
        { label: 'Service calls open', value: String(data.serviceCallsOpen) },
        { label: 'Completion rate', value: formatPercent(data.completionRatePercent) },
        { label: 'On-time rate', value: formatPercent(data.onTimeRatePercent) },
        { label: 'Callback rate', value: formatPercent(data.callbackRatePercent) },
        { label: 'Warranty rate', value: formatPercent(data.warrantyRatePercent) },
      ]} />
    </div>
  );
}

export function CrewPerformancePage() {
  const { filterInput } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.crews.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load crew analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <KpiGrid cards={[
        { label: 'Total labor hours', value: String(data.labor.totalHours) },
        { label: 'Overtime hours', value: String(data.labor.overtimeHours) },
        { label: 'Labor cost', value: formatCurrency(data.labor.laborCostCents) },
        { label: 'Revenue per labor hour', value: formatCurrency(data.labor.revenuePerLaborHourCents) },
        { label: 'Utilization rate', value: formatPercent(data.labor.utilizationRatePercent) },
        { label: 'Efficiency rate', value: formatPercent(data.labor.efficiencyRatePercent) },
      ]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Crew performance</h2>
          <div className="mt-4">
            <DataTable
              headers={['Crew', 'Jobs', 'Revenue', 'Productivity']}
              rows={data.crews.map((c) => [c.crewName, String(c.jobsCompleted), formatCurrency(c.revenueProducedCents), formatPercent(c.productivityScore)])}
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Leaderboard</h2>
          <div className="mt-4">
            <DataTable
              headers={['Rank', 'Name', 'Metric', 'Value']}
              rows={data.leaderboard.map((l) => [String(l.rank), l.name, l.metric, formatCurrency(l.value)])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryAnalyticsPage() {
  const { data, isLoading, isError, refetch } = trpc.reports360.inventory.useQuery();
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load inventory analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <KpiGrid cards={[
        { label: 'Inventory value', value: formatCurrency(data.inventoryValueCents) },
        { label: 'Inventory turnover', value: String(data.inventoryTurnover) },
        { label: 'Reorder alerts', value: String(data.reorderAlerts) },
        { label: 'Damaged value', value: formatCurrency(data.damagedValueCents) },
      ]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Top used items</h2>
          <div className="mt-4">
            <DataTable
              headers={['SKU', 'Name', 'Qty used']}
              rows={data.topUsedItems.map((i) => [i.sku, i.name, String(i.quantityUsed)])}
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Slow moving inventory</h2>
          <div className="mt-4">
            <DataTable
              headers={['SKU', 'Name', 'Days idle']}
              rows={data.slowMovingItems.map((i) => [i.sku, i.name, String(i.daysSinceMovement)])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeasonalAnalyticsPage() {
  const { filterInput } = useAnalyticsYear();
  const { data, isLoading, isError, refetch } = trpc.reports360.seasonal.useQuery(filterInput);
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load seasonal analytics." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="font-semibold">Seasonal phases</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.phases.map((p) => (
            <div key={p.phase} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">{p.month}</p>
              <p className="font-medium">{p.label}</p>
              <p className="mt-2 text-lg font-semibold">{p.value} {p.metric}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(p.revenueCents)} · YoY {formatPercent(p.yearOverYearGrowthPercent)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold">Historical trend</h2>
        <div className="mt-4"><BarList items={data.historicalTrend.map((t) => ({ year: t.year, revenueCents: t.revenueCents }))} labelKey="year" valueKey="revenueCents" /></div>
      </div>
    </div>
  );
}

export function ForecastEnginePage() {
  const { data, isLoading, isError, refetch } = trpc.reports360.forecasts.useQuery();
  if (isLoading) return <ReportsLoading />;
  if (isError || !data) return <ReportsError message="Could not load forecasts." onRetry={() => refetch()} />;

  const labels: Record<number, string> = { 30: '30 Days', 90: '90 Days', 180: '6 Months', 365: '1 Year' };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((f) => (
        <div key={f.horizonDays} className="card p-6">
          <p className="text-sm font-medium">{labels[f.horizonDays] ?? `${f.horizonDays} days`}</p>
          <p className="mt-2 text-xs text-muted-foreground">Confidence {formatPercent(f.confidencePercent)}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Revenue</dt><dd className="font-medium">{formatCurrency(f.revenueForecastCents)}</dd></div>
            <div className="flex justify-between"><dt>Capacity</dt><dd className="font-medium">{formatPercent(f.capacityForecastPercent)}</dd></div>
            <div className="flex justify-between"><dt>Labor hours</dt><dd className="font-medium">{f.laborForecastHours}h</dd></div>
            <div className="flex justify-between"><dt>Inventory items</dt><dd className="font-medium">{f.inventoryForecastItems}</dd></div>
          </dl>
        </div>
      ))}
    </div>
  );
}
