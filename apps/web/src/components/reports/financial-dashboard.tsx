'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { formatCurrency, formatPercent } from '@/lib/report-utils';
import {
  KpiGrid,
  BarList,
  ExportButton,
  ReportsLoading,
  ReportsError,
  DataTable,
} from './reports-widgets';

const CUSTOMER_TYPES = [
  { value: '', label: 'All customer types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'church', label: 'Church' },
  { value: 'school', label: 'School' },
] as const;

const JOB_TYPES = [
  { value: '', label: 'All job types' },
  { value: 'installation', label: 'Installation' },
  { value: 'takedown', label: 'Takedown' },
  { value: 'service_call', label: 'Service call' },
  { value: 'repair', label: 'Repair' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'permanent_lighting_install', label: 'Permanent lighting' },
] as const;

function RevenueForecastChart({
  items,
}: {
  items: Array<{ period: string; bookedCents: number; projectedCents: number }>;
}) {
  const max = Math.max(...items.flatMap((i) => [i.bookedCents, i.projectedCents]), 1);
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded bg-primary" /> Booked (collected)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded bg-primary/30" /> Projected
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.period}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{item.period}</span>
              <span className="text-muted-foreground">
                {formatCurrency(item.bookedCents)} / {formatCurrency(item.projectedCents)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(item.bookedCents / max) * 100}%` }}
                />
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary/30"
                  style={{ width: `${(item.projectedCents / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProposalConversionCards({
  data,
}: {
  data: {
    created: number;
    sent: number;
    viewed: number;
    approved: number;
    conversionRatePercent: number;
  };
}) {
  const cards = [
    { label: 'Created', value: String(data.created) },
    { label: 'Sent', value: String(data.sent) },
    { label: 'Viewed', value: String(data.viewed) },
    { label: 'Approved', value: String(data.approved) },
    { label: 'Conversion', value: formatPercent(data.conversionRatePercent) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-xl font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function CrewProfitabilityTable({
  rows,
}: {
  rows: Array<{
    crewName: string;
    revenueCents: number;
    revenuePerDayCents: number;
    jobsCompleted: number;
    marginEstimatePercent: number;
  }>;
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No crew revenue data for the selected filters.</p>;
  }
  return (
    <DataTable
      headers={['Crew', 'Revenue', 'Rev / day', 'Jobs', 'Est. margin']}
      rows={rows.map((r) => [
        r.crewName,
        formatCurrency(r.revenueCents),
        formatCurrency(r.revenuePerDayCents),
        String(r.jobsCompleted),
        formatPercent(r.marginEstimatePercent),
      ])}
    />
  );
}

function OutstandingInvoicesPanel({
  invoices,
  aging,
}: {
  invoices: Array<{
    invoiceNumber: string;
    customerName: string;
    balanceDueCents: number;
    daysOverdue: number;
  }>;
  aging?: {
    outstandingBalanceCents: number;
    overdueInvoicesCents: number;
    collectionRatePercent: number;
    agingBuckets: Array<{ bucket: string; balanceCents: number }>;
  };
}) {
  return (
    <div className="space-y-4">
      {aging && (
        <KpiGrid
          cards={[
            { label: 'Outstanding balance', value: formatCurrency(aging.outstandingBalanceCents) },
            { label: 'Overdue', value: formatCurrency(aging.overdueInvoicesCents) },
            { label: 'Collection rate', value: formatPercent(aging.collectionRatePercent) },
          ]}
        />
      )}
      {aging && aging.agingBuckets.length > 0 && (
        <BarList
          items={aging.agingBuckets.map((b) => ({ bucket: b.bucket, balanceCents: b.balanceCents }))}
          labelKey="bucket"
          valueKey="balanceCents"
        />
      )}
      {!invoices.length ? (
        <p className="text-sm text-muted-foreground">No outstanding invoices.</p>
      ) : (
        <DataTable
          headers={['Invoice', 'Customer', 'Balance', 'Days overdue']}
          rows={invoices.map((i) => [
            i.invoiceNumber,
            i.customerName,
            formatCurrency(i.balanceDueCents),
            i.daysOverdue > 0 ? String(i.daysOverdue) : 'Current',
          ])}
        />
      )}
    </div>
  );
}

export function FinancialDashboardPage() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const [customerType, setCustomerType] = useState('');
  const [jobType, setJobType] = useState('');
  const [crewId, setCrewId] = useState('');

  const queryInput = useMemo(
    () => ({
      ...filterInput,
      ...(customerType ? { customerType: customerType as Exclude<(typeof CUSTOMER_TYPES)[number]['value'], ''> } : {}),
      ...(jobType ? { jobType: jobType as Exclude<(typeof JOB_TYPES)[number]['value'], ''> } : {}),
      ...(crewId ? { crewId } : {}),
    }),
    [filterInput, customerType, jobType, crewId],
  );

  const { data: financial, isLoading, isError, refetch } = trpc.reports360.financial.useQuery(queryInput, {
    staleTime: 120_000,
  });
  const { data: receivables } = trpc.reports360.receivables.useQuery();
  const { data: crews } = trpc.schedule360.crews.list.useQuery();

  if (isLoading) return <ReportsLoading message="Loading financial dashboard..." />;
  if (isError || !financial) {
    return <ReportsError message="Could not load financial dashboard." onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Customer type</label>
            <select className="input mt-1 min-w-[160px]" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
              {CUSTOMER_TYPES.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Job type</label>
            <select className="input mt-1 min-w-[160px]" value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {JOB_TYPES.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Crew</label>
            <select className="input mt-1 min-w-[160px]" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
              <option value="">All crews</option>
              {crews?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton reportType="financial" format="excel" />
          <ExportButton reportType="financial" format="pdf" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Season financial intelligence · {yearLabel}
        {(customerType || jobType || crewId) && ' · filtered view'}
      </p>

      <KpiGrid
        cards={[
          { label: 'Booked revenue', value: formatCurrency(financial.bookedRevenueCents) },
          { label: 'Projected revenue', value: formatCurrency(financial.projectedRevenueCents) },
          { label: 'Collected revenue', value: formatCurrency(financial.revenueCents) },
          { label: 'Proposal conversion', value: formatPercent(financial.proposalConversionRatePercent) },
          { label: 'Avg job value', value: formatCurrency(financial.averageJobValueCents) },
          { label: 'Gross margin (est.)', value: formatPercent(financial.grossMarginEstimatePercent) },
          { label: 'Crew rev / day', value: formatCurrency(financial.crewRevenuePerDayCents) },
          { label: 'Deposits collected', value: formatCurrency(financial.depositsCollectedCents) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Revenue by segment</h2>
          <div className="mt-4">
            <BarList
              items={financial.revenueByCustomerType.map((r) => ({
                type: r.type,
                revenueCents: r.revenueCents,
              }))}
              labelKey="type"
              valueKey="revenueCents"
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Booked vs projected revenue</h2>
          <div className="mt-4">
            <RevenueForecastChart items={financial.revenueForecast} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Proposal conversion funnel</h2>
        <div className="mt-4">
          <ProposalConversionCards data={financial.proposalConversion} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Profit & loss (estimate)</h2>
          <div className="mt-4">
            <BarList
              items={financial.profitAndLoss.map((p) => ({ category: p.category, amountCents: p.amountCents }))}
              labelKey="category"
              valueKey="amountCents"
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Material cost est. {formatCurrency(financial.materialCostEstimateCents)} · Net est.{' '}
            {formatCurrency(financial.netProfitCents)}
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Crew profitability</h2>
          <div className="mt-4">
            <CrewProfitabilityTable rows={financial.crewProfitability} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Outstanding invoices</h2>
        <div className="mt-4">
          <OutstandingInvoicesPanel invoices={financial.outstandingInvoices} aging={receivables ?? undefined} />
        </div>
      </div>
    </div>
  );
}
