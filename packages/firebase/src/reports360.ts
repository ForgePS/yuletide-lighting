import type {
  CrewPerformanceAnalytics,
  CustomerAnalytics,
  CustomDashboard,
  ExecutiveKpis,
  FinancialAnalytics,
  ForecastHorizon,
  ForecastResult,
  GeographicAnalytics,
  InventoryReportAnalytics,
  OperationsAnalytics,
  ReceivablesAnalytics,
  RevenueAnalytics,
  SalesAnalytics,
  ScheduledReport,
  SeasonalAnalytics,
  SeasonalCommandCenter,
} from '@clcrm/types';
import {
  aiAnalyticsQuery,
  DEFAULT_SCHEDULED_REPORTS,
  ROLE_DASHBOARD_WIDGETS,
  SEASONAL_PHASES,
} from '@clcrm/types';
import type { ReportFilterInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colGet, colList } from './firestore';
import { getInvoiceDashboard, getAgingReport, listInvoices360 } from './invoices360';
import { getInventoryDashboard, getInventoryAnalytics, listInventoryItems360, listLowStockInventory360 } from './inventory360';
import { getScheduleDashboard, getScheduleAnalytics, ensureCrews, listCalendarEvents, listCrewProfiles } from './schedule360';
import { listMockups360 } from './mockups360';
import { getStorageDashboard } from './storage360';
import { listServiceIssues360 } from './service-issues';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

export type ReportFilters = Pick<
  ReportFilterInput,
  'year' | 'startDate' | 'endDate' | 'crewId' | 'salespersonId' | 'customerType' | 'jobType'
>;

function inDateRange(date: Date | null | undefined, filters: ReportFilters) {
  if (!date) return filters.startDate == null && filters.endDate == null;
  if (filters.startDate && date < filters.startDate) return false;
  if (filters.endDate && date > filters.endDate) return false;
  return true;
}

function inReportPeriod(date: Date | null | undefined, filters: ReportFilters) {
  if (!inYear(date, filters.year)) return false;
  return inDateRange(date, filters);
}

function invoicePaidDate(inv: { paidAt?: Date | null; updatedAt?: Date; createdAt?: Date }) {
  return inv.paidAt ?? inv.updatedAt ?? inv.createdAt ?? null;
}

function inYear(date: Date | null | undefined, year?: number | null) {
  if (year == null || year === undefined) return true;
  if (!date) return false;
  return date.getFullYear() === year;
}

function yearStart(year: number) {
  return new Date(year, 0, 1);
}

function yearEnd(year: number) {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function filterPaidInvoices<T extends { amountPaidCents: number; paidAt?: Date | null; updatedAt?: Date; createdAt?: Date }>(
  invoices: T[],
  year?: number | null,
) {
  return invoices.filter((i) => i.amountPaidCents > 0 && inYear(invoicePaidDate(i), year));
}

function monthlyRevenueTrend(invoices: ReturnType<typeof filterPaidInvoices>, year?: number | null) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (year != null) {
    return months.map((period, idx) => ({
      period,
      revenueCents: invoices
        .filter((i) => invoicePaidDate(i)?.getMonth() === idx)
        .reduce((s, i) => s + i.amountPaidCents, 0),
    }));
  }
  const total = invoices.reduce((s, i) => s + i.amountPaidCents, 0);
  return months.map((period) => ({
    period,
    revenueCents: Math.round(total / 12),
  }));
}

function seasonMonthsRevenue(invoices: ReturnType<typeof filterPaidInvoices>, year: number) {
  const seasonMonths = [7, 8, 9, 10, 11]; // Aug–Dec
  return invoices
    .filter((i) => {
      const d = invoicePaidDate(i);
      return d && d.getFullYear() === year && seasonMonths.includes(d.getMonth());
    })
    .reduce((s, i) => s + i.amountPaidCents, 0);
}

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function seasonStart() {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 7, 1);
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekEnd(d = new Date()) {
  const end = new Date(weekStart(d));
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function currentSeasonPhaseLabel(month = new Date().getMonth()) {
  if (month === 7) return 'Lead Generation';
  if (month === 8) return 'Proposal Season';
  if (month === 9) return 'Installation Ramp-Up';
  if (month === 10) return 'Peak Production';
  if (month === 0) return 'Takedown Operations';
  if (month === 1) return 'Storage Operations';
  return 'Off-season Planning';
}

function commandCenterSalesSnapshot(
  proposals: { status: string; subtotalCents?: number; viewCount?: number; createdAt?: Date }[],
  filters: ReportFilters,
): Pick<SalesAnalytics, 'proposalsSent' | 'conversionRatePercent' | 'funnel'> {
  const { year = null } = filters;
  const scoped = year != null ? proposals.filter((p) => inYear(p.createdAt, year)) : proposals;
  const approved = scoped.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const sent = scoped.filter((p) => ['sent', 'viewed', 'accepted', 'approved', 'declined'].includes(p.status));
  return {
    proposalsSent: sent.length,
    conversionRatePercent: sent.length ? Math.round((approved.length / sent.length) * 100) : 0,
    funnel: [
      { stage: 'Lead', count: scoped.length + 10, valueCents: 0 },
      { stage: 'Consultation', count: scoped.length, valueCents: scoped.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Proposal', count: sent.length, valueCents: sent.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Approval', count: approved.length, valueCents: approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Scheduled', count: approved.length, valueCents: approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Completed', count: Math.floor(approved.length * 0.8), valueCents: Math.round(approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) * 0.8) },
    ],
  };
}

function commandCenterFinancialSnapshot(
  proposals: { status: string; subtotalCents?: number; createdAt?: Date }[],
  jobs: { stage: string; subtotalCents?: number }[],
  conversionRatePercent: number,
  filters: ReportFilters,
) {
  const scopedProposals = filters.year != null
    ? proposals.filter((p) => inYear(p.createdAt, filters.year))
    : proposals;
  const approvedProposals = scopedProposals.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const bookedRevenueCents = approvedProposals.reduce((s, p) => s + (p.subtotalCents ?? 0), 0);
  const sentProposals = scopedProposals.filter((p) =>
    ['sent', 'viewed', 'accepted', 'approved', 'declined', 'rejected'].includes(p.status),
  );
  const pipelineProposals = sentProposals.filter((p) => !['accepted', 'approved', 'declined', 'rejected'].includes(p.status));
  const pipelineJobs = jobs.filter((j) => ['scheduled', 'inventory_reserved', 'deposit_paid'].includes(j.stage));
  const pipelineValueCents =
    pipelineProposals.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) +
    pipelineJobs.reduce((s, j) => s + (j.subtotalCents ?? 0), 0);
  const projectedRevenueCents = bookedRevenueCents + Math.round(pipelineValueCents * (conversionRatePercent / 100));
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const revenueForecast = months.map((period, idx) => ({
    period,
    bookedCents: 0,
    projectedCents: Math.max(0, Math.round((projectedRevenueCents / months.length) * (1 - idx * 0.05))),
  }));
  return { bookedRevenueCents, projectedRevenueCents, revenueForecast };
}

export async function getSeasonalCommandCenter(orgId: string, filters: ReportFilters = {}): Promise<SeasonalCommandCenter> {
  const now = new Date();
  const weekStartDate = weekStart(now);
  const weekEndDate = weekEnd(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    customers,
    proposals,
    jobs,
    events,
    invoices,
    lowStock,
    serviceIssues,
    crewsRaw,
    rebookingRecords,
  ] = await Promise.all([
    colList<{
      id: string;
      firstName?: string;
      lastName?: string;
      pipelineStage?: string;
      createdAt?: Date;
      nextActionDue?: Date;
      nextAction?: string | null;
    }>(orgId, 'customers'),
    colList<{ status: string; subtotalCents?: number; viewCount?: number; createdAt?: Date }>(orgId, 'proposals'),
    colList<{ stage: string; subtotalCents?: number }>(orgId, 'jobs'),
    listCalendarEvents(orgId, undefined, undefined, { readOnly: true }),
    colList<{ balanceDueCents?: number }>(orgId, 'invoices'),
    listLowStockInventory360(orgId),
    listServiceIssues360(orgId, { pageSize: 25 }),
    listCrewProfiles(orgId),
    colList<{ customerId?: string; customerName?: string; status: string; projectedValueCents?: number }>(orgId, 'rebookingRecords'),
  ]);

  const sales = commandCenterSalesSnapshot(proposals, filters);
  const financial = commandCenterFinancialSnapshot(proposals, jobs, sales.conversionRatePercent, filters);
  const outstandingInvoicesCents = invoices.reduce((s, i) => s + (i.balanceDueCents ?? 0), 0);
  const rebookingContacted = rebookingRecords.filter((r) => r.status !== 'not_sent').length;
  const rebookingConverted = rebookingRecords.filter((r) => ['rebooked', 'upgrade_requested'].includes(r.status)).length;
  const rebookingRatePercent = rebookingContacted
    ? Math.round((rebookingConverted / rebookingContacted) * 100)
    : 0;

  const weekEvents = events.filter((e) => e.startAt >= weekStartDate && e.startAt <= weekEndDate);
  const awaitingApproval = proposals.filter((p) => ['sent', 'viewed', 'ready_to_send', 'customer_questions'].includes(p.status)).length;

  return {
    currentSeasonPhase: currentSeasonPhaseLabel(),
    kpis: {
      newLeadsThisWeek: customers.filter((c) => c.createdAt && c.createdAt >= weekStartDate && c.createdAt <= weekEndDate).length,
      proposalsSent: sales.proposalsSent,
      proposalsAwaitingApproval: awaitingApproval,
      bookedRevenueCents: financial.bookedRevenueCents,
      projectedRevenueCents: financial.projectedRevenueCents,
      installsScheduledThisWeek: weekEvents.filter((e) => e.category === 'installation').length,
      removalsScheduledThisWeek: weekEvents.filter((e) => e.category === 'takedown').length,
      rebookingRatePercent,
      lowStockAlerts: lowStock.length,
      openServiceCalls: serviceIssues.summary.openIssues,
      outstandingInvoicesCents,
    },
    todaysInstalls: events
      .filter((e) => e.category === 'installation' && e.startAt >= todayStart && e.startAt <= todayEnd)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        customerName: e.customerName ?? null,
        propertyAddress: e.propertyAddress ?? null,
      })),
    followUpsDue: customers
      .filter((c) => c.nextActionDue && c.nextActionDue <= now)
      .sort((a, b) => (a.nextActionDue?.getTime() ?? 0) - (b.nextActionDue?.getTime() ?? 0))
      .slice(0, 8)
      .map((c) => ({
        customerId: c.id,
        customerName: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer',
        stage: c.pipelineStage ?? 'unknown',
        nextAction: c.nextAction ?? null,
        dueAt: c.nextActionDue ?? null,
      })),
    proposalPipeline: sales.funnel,
    revenueForecast: financial.revenueForecast,
    crewWorkload: crewsRaw.map((crew) => ({
      crewName: crew.name,
      jobsThisWeek: weekEvents.filter((e) => e.crewId === crew.id).length,
      utilizationPercent: crew.utilizationPercent,
    })),
    inventoryWarnings: lowStock.slice(0, 8).map((item) => ({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      quantityOnHand: item.available,
      reorderThreshold: item.reorderLevel,
    })),
    rebookingOpportunities: rebookingRecords
      .filter((r) => ['not_sent', 'sent', 'opened'].includes(r.status))
      .slice(0, 8)
      .map((r) => ({
        customerId: String(r.customerId ?? ''),
        customerName: String(r.customerName ?? 'Customer'),
        projectedValueCents: Number(r.projectedValueCents ?? 0),
        status: r.status,
      })),
  };
}

export async function getExecutiveDashboard(orgId: string, filters: ReportFilters = {}): Promise<ExecutiveKpis> {
  const { year = null } = filters;
  const [customers, proposals, jobs, invoiceKpis, scheduleKpis] = await Promise.all([
    colList<{ id: string; createdAt?: Date }>(orgId, 'customers'),
    colList<{ status: string; subtotalCents?: number; acceptedAt?: Date; createdAt?: Date; approvedAt?: Date }>(orgId, 'proposals'),
    colList<{ stage: string; subtotalCents?: number; completionDate?: Date; createdAt?: Date }>(orgId, 'jobs'),
    getInvoiceDashboard(orgId, filters),
    getScheduleDashboard(orgId),
  ]);

  const invoices = await listInvoices360(orgId);
  const paidInvoices = filterPaidInvoices(invoices, year);
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.amountPaidCents, 0);
  const now = new Date();
  const monthStartDate = year != null ? new Date(year, now.getMonth(), 1) : monthStart();
  const monthEndDate = year != null ? new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999) : now;
  const revenueThisMonth = paidInvoices
    .filter((i) => {
      const d = invoicePaidDate(i);
      return d && d >= monthStartDate && d <= (year != null ? monthEndDate : now);
    })
    .reduce((s, i) => s + i.amountPaidCents, 0);
  const revenueThisSeason = year != null
    ? seasonMonthsRevenue(paidInvoices, year)
    : paidInvoices.filter((i) => i.paidAt && i.paidAt >= seasonStart()).reduce((s, i) => s + i.amountPaidCents, 0);

  const scopedProposals = year != null
    ? proposals.filter((p) => inYear(p.createdAt, year))
    : proposals;
  const accepted = scopedProposals.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const grossProfit = Math.round(totalRevenue * 0.55);
  const scopedJobs = year != null
    ? jobs.filter((j) => inYear(j.completionDate ?? j.createdAt, year))
    : jobs;
  const completedJobs = scopedJobs.filter((j) => j.stage === 'complete' || j.stage === 'installed').length;
  const scopedCustomers = year != null
    ? customers.filter((c) => inYear(c.createdAt, year))
    : customers;

  return {
    totalRevenueCents: totalRevenue,
    revenueThisMonthCents: revenueThisMonth,
    revenueThisSeasonCents: revenueThisSeason,
    grossProfitCents: grossProfit,
    grossMarginPercent: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
    activeCustomers: year != null ? scopedCustomers.length : customers.length,
    jobsScheduled: scheduleKpis.jobsScheduledToday + scopedJobs.filter((j) => j.stage === 'scheduled').length,
    jobsCompleted: completedJobs,
    proposalConversionRatePercent: scopedProposals.length ? Math.round((accepted.length / scopedProposals.length) * 100) : 0,
    averageSaleValueCents: accepted.length ? Math.round(accepted.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) / accepted.length) : 0,
    outstandingReceivablesCents: invoiceKpis.totalReceivablesCents,
    customerRetentionRatePercent: customers.length > 0 ? Math.min(100, Math.round((returningCustomerCount(customers) / customers.length) * 100)) : 0,
  };
}

function returningCustomerCount(customers: Array<{ createdAt?: Date }>) {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  return customers.filter((c) => c.createdAt && c.createdAt < yearAgo).length;
}

export async function getRevenueAnalytics(orgId: string, filters: ReportFilters = {}): Promise<RevenueAnalytics> {
  const { year = null } = filters;
  const invoices = await listInvoices360(orgId);
  const proposals = await colList<{ status: string; subtotalCents?: number; salespersonName?: string; createdAt?: Date; acceptedAt?: Date; approvedAt?: Date }>(orgId, 'proposals');
  const jobs = await colList<{ subtotalCents?: number; createdAt?: Date }>(orgId, 'jobs');
  const crews = await ensureCrews(orgId);
  const events = await listCalendarEvents(orgId);

  const now = new Date();
  const paidInvoices = filterPaidInvoices(invoices, year);
  const paid = (since?: Date, until?: Date) => paidInvoices.filter((i) => {
    const d = invoicePaidDate(i);
    if (!d) return false;
    if (since && d < since) return false;
    if (until && d > until) return false;
    return true;
  });

  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStartDate = year != null ? new Date(year, now.getMonth(), 1) : monthStart();
  const seasonStartDate = year != null ? new Date(year, 7, 1) : seasonStart();

  const scopedProposals = year != null
    ? proposals.filter((p) => (p.status === 'accepted' || p.status === 'approved') && inYear(p.acceptedAt ?? p.approvedAt ?? p.createdAt, year))
    : proposals.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const totalPaid = paidInvoices.reduce((s, i) => s + i.amountPaidCents, 0);

  return {
    dailyRevenueCents: year != null ? 0 : paid(dayAgo).reduce((s, i) => s + i.amountPaidCents, 0),
    weeklyRevenueCents: year != null ? 0 : paid(weekAgo).reduce((s, i) => s + i.amountPaidCents, 0),
    monthlyRevenueCents: paid(year != null ? monthStartDate : monthStartDate, year != null ? new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999) : now).reduce((s, i) => s + i.amountPaidCents, 0),
    seasonalRevenueCents: year != null
      ? seasonMonthsRevenue(paidInvoices, year)
      : paid(seasonStartDate).reduce((s, i) => s + i.amountPaidCents, 0),
    annualRevenueCents: year != null ? totalPaid : paid().reduce((s, i) => s + i.amountPaidCents, 0),
    revenueTrend: monthlyRevenueTrend(paidInvoices, year),
    revenueByService: [
      { category: 'roofline_lighting', label: 'Roofline Lighting', revenueCents: Math.round(totalPaid * 0.45) },
      { category: 'tree_wrapping', label: 'Tree Wrapping', revenueCents: Math.round(totalPaid * 0.2) },
      { category: 'garland', label: 'Garland', revenueCents: Math.round(totalPaid * 0.1) },
      { category: 'commercial_installs', label: 'Commercial Installs', revenueCents: Math.round(totalPaid * 0.15) },
      { category: 'service_calls', label: 'Service Calls', revenueCents: Math.round(totalPaid * 0.05) },
      { category: 'storage', label: 'Storage', revenueCents: Math.round(totalPaid * 0.05) },
    ],
    revenueBySalesperson: aggregateByField(scopedProposals, 'salespersonName', 'subtotalCents').map(([name, cents, count]) => ({
      name: name || 'Unassigned', revenueCents: cents, proposalCount: count,
    })),
    revenueByCrew: crews.map((c) => {
      const crewEvents = events.filter((e) => {
        if (e.crewId !== c.id) return false;
        if (year == null) return true;
        const d = e.startAt ?? e.createdAt;
        return inYear(d, year);
      });
      return {
        crewName: c.name,
        revenueCents: crewEvents.reduce((s, e) => s + e.estimatedRevenueCents, 0),
        jobCount: crewEvents.length,
      };
    }),
    revenueByCustomerType: [
      { type: 'Residential', revenueCents: Math.round(totalPaid * 0.75), count: jobs.length },
      { type: 'Commercial', revenueCents: Math.round(totalPaid * 0.2), count: Math.ceil(jobs.length * 0.15) },
      { type: 'HOA', revenueCents: Math.round(totalPaid * 0.05), count: Math.ceil(jobs.length * 0.05) },
    ],
  };
}

function aggregateByField<T extends Record<string, unknown>>(items: T[], field: keyof T, centsField: keyof T) {
  const map = new Map<string, { cents: number; count: number }>();
  for (const item of items) {
    const key = String(item[field] ?? 'Unknown');
    const cur = map.get(key) ?? { cents: 0, count: 0 };
    cur.cents += Number(item[centsField] ?? 0);
    cur.count++;
    map.set(key, cur);
  }
  return [...map.entries()].map(([name, v]) => [name, v.cents, v.count] as const);
}

export async function getSalesAnalytics(orgId: string, filters: ReportFilters = {}): Promise<SalesAnalytics> {
  const { year = null } = filters;
  const proposals = await colList<{ status: string; subtotalCents?: number; viewCount?: number; createdAt?: Date; acceptedAt?: Date; approvedAt?: Date }>(orgId, 'proposals');
  const scoped = year != null ? proposals.filter((p) => inYear(p.createdAt, year)) : proposals;
  const approved = scoped.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const rejected = scoped.filter((p) => p.status === 'declined' || p.status === 'rejected');
  const sent = scoped.filter((p) => ['sent', 'viewed', 'accepted', 'approved', 'declined'].includes(p.status));

  const closeTimes = approved.filter((p) => (p.acceptedAt ?? p.approvedAt) && p.createdAt).map((p) =>
    ((p.acceptedAt ?? p.approvedAt)!.getTime() - p.createdAt!.getTime()) / 86400000,
  );

  return {
    proposalsCreated: scoped.length,
    proposalsSent: sent.length,
    proposalsViewed: scoped.filter((p) => (p.viewCount ?? 0) > 0 || p.status === 'viewed').length,
    proposalsApproved: approved.length,
    proposalsRejected: rejected.length,
    conversionRatePercent: sent.length ? Math.round((approved.length / sent.length) * 100) : 0,
    averageCloseTimeDays: closeTimes.length ? Math.round(closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length) : 0,
    averageProposalValueCents: scoped.length ? Math.round(scoped.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) / scoped.length) : 0,
    revenueWonCents: approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0),
    revenueLostCents: rejected.reduce((s, p) => s + (p.subtotalCents ?? 0), 0),
    funnel: [
      { stage: 'Lead', count: scoped.length + 10, valueCents: 0 },
      { stage: 'Consultation', count: scoped.length, valueCents: scoped.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Proposal', count: sent.length, valueCents: sent.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Approval', count: approved.length, valueCents: approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Scheduled', count: approved.length, valueCents: approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) },
      { stage: 'Completed', count: Math.floor(approved.length * 0.8), valueCents: Math.round(approved.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) * 0.8) },
    ],
  };
}

export async function getCustomerAnalytics(orgId: string, filters: ReportFilters = {}): Promise<CustomerAnalytics> {
  const { year = null } = filters;
  const customers = await colList<{ id: string; firstName?: string; lastName?: string; createdAt?: Date }>(orgId, 'customers');
  const invoices = await listInvoices360(orgId);
  const paidInvoices = filterPaidInvoices(invoices, year);

  const byCustomer = new Map<string, { name: string; revenue: number; jobs: number }>();
  for (const inv of paidInvoices) {
    if (!inv.customerId) continue;
    const cur = byCustomer.get(inv.customerId) ?? {
      name: inv.customerName ?? 'Customer',
      revenue: 0,
      jobs: 0,
    };
    cur.revenue += inv.amountPaidCents;
    cur.jobs++;
    byCustomer.set(inv.customerId, cur);
  }

  const topCustomers = [...byCustomer.entries()]
    .map(([customerId, v]) => ({ customerId, name: v.name, revenueCents: v.revenue, jobCount: v.jobs }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);

  const newCustomers = year != null
    ? customers.filter((c) => inYear(c.createdAt, year)).length
    : customers.filter((c) => c.createdAt && c.createdAt >= new Date(new Date().setFullYear(new Date().getFullYear() - 1))).length;
  const returning = year != null
    ? customers.filter((c) => c.createdAt && c.createdAt < yearStart(year)).length
    : customers.length - newCustomers;

  return {
    totalCustomers: year != null ? customers.filter((c) => inYear(c.createdAt, year) || byCustomer.has(c.id)).length : customers.length,
    newCustomers,
    returningCustomers: returning,
    retentionRatePercent: customers.length ? Math.round((returning / customers.length) * 100) : 0,
    churnRatePercent: customers.length ? Math.round((newCustomers / customers.length) * 10) : 0,
    averageLifetimeValueCents: topCustomers.length ? Math.round(topCustomers.reduce((s, c) => s + c.revenueCents, 0) / topCustomers.length) : 0,
    averageSpendCents: paidInvoices.length ? Math.round(paidInvoices.reduce((s, i) => s + i.amountPaidCents, 0) / Math.max(byCustomer.size, 1)) : 0,
    topCustomers,
    mostProfitable: topCustomers.map((c) => ({ ...c, profitCents: Math.round(c.revenueCents * 0.55), marginPercent: 55 })),
    atRiskCustomers: topCustomers.filter((c) => c.jobCount === 1).map((c) => ({
      customerId: c.customerId,
      name: c.name,
      reason: 'Single job — no repeat business',
      daysSinceContact: 90,
    })),
  };
}

export async function getGeographicAnalytics(orgId: string, filters: ReportFilters = {}): Promise<GeographicAnalytics> {
  const { year = null } = filters;
  const properties = await colList<{ postalCode?: string; city?: string; state?: string }>(orgId, 'properties');
  const invoices = filterPaidInvoices(await listInvoices360(orgId), year);
  const totalRev = invoices.reduce((s, i) => s + i.amountPaidCents, 0);

  const byZip = new Map<string, { revenue: number; count: number }>();
  const byCity = new Map<string, { revenue: number; count: number }>();

  for (const prop of properties) {
    const zip = prop.postalCode ?? 'Unknown';
    const city = prop.city ?? 'Unknown';
    const rev = Math.round(totalRev / Math.max(properties.length, 1));
    const z = byZip.get(zip) ?? { revenue: 0, count: 0 };
    z.count++;
    z.revenue += rev;
    byZip.set(zip, z);
    const c = byCity.get(city) ?? { revenue: 0, count: 0 };
    c.count++;
    c.revenue += rev;
    byCity.set(city, c);
  }

  return {
    byZipCode: [...byZip.entries()].map(([zip, v]) => ({ zip, revenueCents: v.revenue, customerCount: v.count })).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 15),
    byCity: [...byCity.entries()].map(([city, v]) => ({ city, revenueCents: v.revenue, customerCount: v.count })).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10),
    heatMapPoints: [...byZip.entries()].slice(0, 20).map(([zip, v]) => ({ zip, intensity: v.revenue })),
  };
}

export async function getOperationsAnalytics(orgId: string, filters: ReportFilters = {}): Promise<OperationsAnalytics> {
  const { year = null } = filters;
  const [jobs, schedule] = await Promise.all([
    colList<{ stage: string; completionDate?: Date; createdAt?: Date }>(orgId, 'jobs'),
    getScheduleAnalytics(orgId),
  ]);

  const scoped = year != null
    ? jobs.filter((j) => inYear(j.completionDate ?? j.createdAt, year))
    : jobs;
  const completed = scoped.filter((j) => j.stage === 'complete' || j.stage === 'installed').length;
  const scheduled = scoped.filter((j) => j.stage === 'scheduled').length;

  return {
    jobsScheduled: scheduled,
    jobsCompleted: completed,
    jobsDelayed: Math.floor(scheduled * 0.05),
    jobsRescheduled: Math.floor(scheduled * 0.08),
    serviceCallsOpen: scoped.filter((j) => j.stage === 'scheduled' && String(j.stage).includes('service')).length,
    completionRatePercent: scoped.length ? Math.round((completed / scoped.length) * 100) : 0,
    onTimeRatePercent: schedule.onTimeArrivalPercent,
    callbackRatePercent: 3,
    warrantyRatePercent: 2,
  };
}

export async function getCrewPerformanceAnalytics(orgId: string, filters: ReportFilters = {}): Promise<CrewPerformanceAnalytics> {
  const { year = null } = filters;
  const crews = await ensureCrews(orgId);
  const events = await listCalendarEvents(orgId);
  const schedule = await getScheduleAnalytics(orgId);

  const crewData = crews.map((crew) => {
    const crewEvents = events.filter((e) => {
      if (e.crewId !== crew.id) return false;
      if (year == null) return true;
      return inYear(e.startAt ?? e.createdAt, year);
    });
    const completed = crewEvents.filter((e) => e.dispatchStatus === 'completed').length;
    const revenue = crewEvents.reduce((s, e) => s + e.estimatedRevenueCents, 0);
    const hours = crew.scheduledHoursWeek;
    return {
      crewId: crew.id,
      crewName: crew.name,
      jobsCompleted: completed,
      laborHours: hours,
      revenueProducedCents: revenue,
      productivityScore: crew.utilizationPercent,
      avgInstallHours: completed ? Math.round((hours / completed) * 10) / 10 : 0,
      satisfactionScore: 4.5,
    };
  });

  const sorted = [...crewData].sort((a, b) => b.revenueProducedCents - a.revenueProducedCents);

  return {
    crews: crewData,
    leaderboard: sorted.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      name: c.crewName,
      metric: 'Revenue',
      value: c.revenueProducedCents,
    })),
    labor: {
      totalHours: crewData.reduce((s, c) => s + c.laborHours, 0),
      overtimeHours: Math.round(crewData.reduce((s, c) => s + c.laborHours, 0) * 0.08),
      laborCostCents: crewData.reduce((s, c) => s + c.laborHours, 0) * 3500,
      revenuePerLaborHourCents: schedule.revenuePerDayCents > 0 ? Math.round(schedule.revenuePerDayCents / Math.max(crewData.reduce((s, c) => s + c.laborHours, 0), 1)) : 0,
      utilizationRatePercent: schedule.capacityUtilizationPercent,
      efficiencyRatePercent: schedule.scheduleEfficiencyPercent,
    },
  };
}

export async function getInventoryReportAnalytics(orgId: string): Promise<InventoryReportAnalytics> {
  const [dashboard, analytics, items] = await Promise.all([
    getInventoryDashboard(orgId),
    getInventoryAnalytics(orgId),
    listInventoryItems360(orgId),
  ]);

  return {
    inventoryValueCents: dashboard.totalInventoryValueCents,
    inventoryTurnover: dashboard.inventoryTurnover,
    reorderAlerts: dashboard.reorderAlerts,
    topUsedItems: items.slice(0, 10).map((i) => ({ sku: i.sku, name: i.name, quantityUsed: i.quantityOnHand })),
    slowMovingItems: items.filter((i) => i.quantityOnHand > i.reorderLevel * 2).slice(0, 5).map((i) => ({ sku: i.sku, name: i.name, daysSinceMovement: 60 })),
    damagedValueCents: dashboard.damagedInventoryValueCents,
    seasonalConsumption: analytics.seasonalConsumption?.map((t) => ({ month: t.category, quantity: t.quantity })) ?? [],
  };
}

export async function getFinancialAnalytics(orgId: string, filters: ReportFilters = {}): Promise<FinancialAnalytics> {
  const { year = null, crewId, customerType, jobType, salespersonId } = filters;

  const [
    invoices,
    proposals,
    jobs,
    customers,
    rebookingRecords,
    sales,
    invoiceKpis,
    crewPerf,
    inventory,
    storageDash,
    schedule,
  ] = await Promise.all([
    listInvoices360(orgId),
    colList<{
      status: string;
      subtotalCents?: number;
      customerId?: string;
      salespersonId?: string;
      viewCount?: number;
      createdAt?: Date;
      acceptedAt?: Date;
      approvedAt?: Date;
    }>(orgId, 'proposals'),
    colList<{
      stage: string;
      subtotalCents?: number;
      customerId?: string;
      crewId?: string;
      jobType?: string;
      completionDate?: Date;
      createdAt?: Date;
    }>(orgId, 'jobs'),
    colList<{ id: string; customerType?: string; createdAt?: Date }>(orgId, 'customers'),
    colList<{ status: string; bookedValueCents?: number; createdAt?: Date }>(orgId, 'rebookingRecords'),
    getSalesAnalytics(orgId, filters),
    getInvoiceDashboard(orgId, filters),
    getCrewPerformanceAnalytics(orgId, filters),
    getInventoryDashboard(orgId),
    getStorageDashboard(orgId),
    getScheduleDashboard(orgId),
  ]);

  const customerTypeMap = new Map(customers.map((c) => [c.id, c.customerType ?? 'residential']));
  const commercialTypes = new Set(['commercial', 'hoa', 'municipal', 'church', 'school']);

  function matchesCustomer(customerId?: string | null) {
    if (!customerType || !customerId) return customerType == null;
    return customerTypeMap.get(customerId) === customerType;
  }

  function matchesJob(job: { customerId?: string; crewId?: string; jobType?: string; completionDate?: Date; createdAt?: Date }) {
    if (crewId && job.crewId !== crewId) return false;
    if (jobType && job.jobType !== jobType) return false;
    if (customerType && !matchesCustomer(job.customerId)) return false;
    if (!inReportPeriod(job.completionDate ?? job.createdAt, filters)) return false;
    return true;
  }

  const scopedProposals = proposals.filter((p) => {
    if (salespersonId && p.salespersonId !== salespersonId) return false;
    if (customerType && !matchesCustomer(p.customerId)) return false;
    return inReportPeriod(p.createdAt, filters);
  });

  const approvedProposals = scopedProposals.filter((p) => p.status === 'accepted' || p.status === 'approved');
  const sentProposals = scopedProposals.filter((p) =>
    ['sent', 'viewed', 'accepted', 'approved', 'declined', 'rejected'].includes(p.status),
  );
  const viewedProposals = scopedProposals.filter((p) => (p.viewCount ?? 0) > 0 || p.status === 'viewed');

  const bookedRevenueCents = approvedProposals.reduce((s, p) => s + (p.subtotalCents ?? 0), 0);
  const pipelineProposals = sentProposals.filter((p) => !['accepted', 'approved', 'declined', 'rejected'].includes(p.status));
  const pipelineJobs = jobs
    .filter(matchesJob)
    .filter((j) => ['scheduled', 'inventory_reserved', 'deposit_paid'].includes(j.stage));
  const pipelineValueCents =
    pipelineProposals.reduce((s, p) => s + (p.subtotalCents ?? 0), 0) +
    pipelineJobs.reduce((s, j) => s + (j.subtotalCents ?? 0), 0);
  const projectedRevenueCents = bookedRevenueCents + Math.round(pipelineValueCents * (sales.conversionRatePercent / 100));

  const scopedJobs = jobs.filter(matchesJob);
  const completedJobs = scopedJobs.filter((j) => ['complete', 'installed', 'removed', 'review_requested'].includes(j.stage));
  const averageJobValueCents = completedJobs.length
    ? Math.round(completedJobs.reduce((s, j) => s + (j.subtotalCents ?? 0), 0) / completedJobs.length)
    : approvedProposals.length
      ? Math.round(bookedRevenueCents / approvedProposals.length)
      : 0;

  const paidInvoices = filterPaidInvoices(invoices, year).filter((i) => {
    if (customerType && !matchesCustomer(i.customerId)) return false;
    return inDateRange(invoicePaidDate(i), filters);
  });

  const revenueCents = paidInvoices.reduce((s, i) => s + i.amountPaidCents, 0);

  let residentialRevenueCents = 0;
  let commercialRevenueCents = 0;
  for (const inv of paidInvoices) {
    const type = customerTypeMap.get(inv.customerId ?? '') ?? 'residential';
    if (commercialTypes.has(type)) commercialRevenueCents += inv.amountPaidCents;
    else residentialRevenueCents += inv.amountPaidCents;
  }

  const rebookingRevenueCents = rebookingRecords
    .filter((r) => r.status === 'rebooked' && inReportPeriod(r.createdAt, filters))
    .reduce((s, r) => s + (r.bookedValueCents ?? 0), 0);

  const storageRevenueCents = storageDash.totalStorageFeesCents;

  const depositsCollectedCents = invoices
    .filter((i) => {
      if (customerType && !matchesCustomer(i.customerId)) return false;
      return inReportPeriod(i.paidAt ?? i.updatedAt ?? i.createdAt, filters);
    })
    .reduce((s, i) => s + Math.min(i.amountPaidCents, i.depositCents ?? 0), 0);

  const materialCostEstimateCents = Math.max(
    Math.round(inventory.totalInventoryValueCents * 0.35),
    Math.round(revenueCents * 0.32),
  );
  const laborCostCents = crewPerf.labor.laborCostCents;
  const expensesCents = materialCostEstimateCents + laborCostCents + Math.round(revenueCents * 0.12);
  const grossProfitCents = revenueCents - materialCostEstimateCents - laborCostCents;
  const grossMarginEstimatePercent = revenueCents > 0 ? Math.round((grossProfitCents / revenueCents) * 100) : 0;
  const netProfitCents = revenueCents - expensesCents;

  const seasonDays = year != null ? 120 : Math.max(1, Math.ceil((Date.now() - seasonStart().getTime()) / 86400000));
  const crewRevenuePerDayCents = Math.round(
    crewPerf.crews.reduce((s, c) => s + c.revenueProducedCents, 0) / Math.max(seasonDays, 1),
  );

  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const revenueForecast = months.map((period, idx) => {
    const monthIndex = [7, 8, 9, 10, 11, 0][idx]!;
    const monthBooked = paidInvoices
      .filter((i) => invoicePaidDate(i)?.getMonth() === monthIndex)
      .reduce((s, i) => s + i.amountPaidCents, 0);
    const monthProjected = Math.round(
      monthBooked + (bookedRevenueCents / Math.max(months.length, 1)) * (1 - idx * 0.08) +
        pipelineValueCents / months.length,
    );
    return { period, bookedCents: monthBooked, projectedCents: Math.max(monthBooked, monthProjected) };
  });

  const crewProfitability = crewPerf.crews
    .filter((c) => !crewId || c.crewId === crewId)
    .map((c) => ({
      crewName: c.crewName,
      revenueCents: c.revenueProducedCents,
      revenuePerDayCents: Math.round(c.revenueProducedCents / Math.max(seasonDays, 1)),
      jobsCompleted: c.jobsCompleted,
      marginEstimatePercent: c.revenueProducedCents > 0 ? Math.min(75, grossMarginEstimatePercent + 5) : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const outstandingInvoices = invoices
    .filter((i) => i.balanceDueCents > 0)
    .filter((i) => !customerType || matchesCustomer(i.customerId))
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.balanceDueCents - a.balanceDueCents)
    .slice(0, 12)
    .map((i) => ({
      invoiceNumber: i.invoiceNumber,
      customerName: i.customerName ?? 'Customer',
      balanceDueCents: i.balanceDueCents,
      daysOverdue: i.daysOverdue,
    }));

  const selectedYear = year ?? new Date().getFullYear();

  return {
    revenueCents,
    expensesCents,
    grossProfitCents,
    netProfitCents,
    cashFlowCents: revenueCents - expensesCents,
    outstandingInvoicesCents: invoiceKpis.totalReceivablesCents,
    depositsCollectedCents,
    profitAndLoss: [
      { category: 'Revenue', amountCents: revenueCents },
      { category: 'Materials (est.)', amountCents: materialCostEstimateCents },
      { category: 'Labor (est.)', amountCents: laborCostCents },
      { category: 'Overhead (est.)', amountCents: Math.round(revenueCents * 0.12) },
      { category: 'Net profit (est.)', amountCents: netProfitCents },
    ],
    revenueBySeason: year != null
      ? [{ season: String(selectedYear), revenueCents }]
      : [
          { season: String(selectedYear - 1), revenueCents: Math.round(revenueCents * 0.85) },
          { season: String(selectedYear), revenueCents },
        ],
    bookedRevenueCents,
    projectedRevenueCents,
    proposalConversionRatePercent: sales.conversionRatePercent,
    averageJobValueCents,
    residentialRevenueCents,
    commercialRevenueCents,
    rebookingRevenueCents,
    storageRevenueCents,
    crewRevenuePerDayCents,
    materialCostEstimateCents,
    grossMarginEstimatePercent,
    revenueForecast,
    proposalConversion: {
      created: sales.proposalsCreated,
      sent: sales.proposalsSent,
      viewed: sales.proposalsViewed,
      approved: sales.proposalsApproved,
      conversionRatePercent: sales.conversionRatePercent,
    },
    crewProfitability,
    outstandingInvoices,
    revenueByCustomerType: [
      { type: 'Residential', revenueCents: residentialRevenueCents },
      { type: 'Commercial', revenueCents: commercialRevenueCents },
      { type: 'Rebooking', revenueCents: rebookingRevenueCents },
      { type: 'Storage', revenueCents: storageRevenueCents },
    ],
  };
}

export async function getReceivablesAnalytics(orgId: string): Promise<ReceivablesAnalytics> {
  const [invoiceKpis, aging] = await Promise.all([
    getInvoiceDashboard(orgId),
    getAgingReport(orgId),
  ]);

  return {
    outstandingBalanceCents: invoiceKpis.totalReceivablesCents,
    currentInvoicesCents: invoiceKpis.currentBalanceCents,
    overdueInvoicesCents: invoiceKpis.overdueBalanceCents,
    collectionRatePercent: invoiceKpis.collectionRatePercent,
    agingBuckets: aging.map((b) => ({ bucket: b.label, count: b.invoiceCount, balanceCents: b.balanceDueCents })),
  };
}

export async function getSeasonalAnalytics(orgId: string, filters: ReportFilters = {}): Promise<SeasonalAnalytics> {
  const sales = await getSalesAnalytics(orgId, filters);
  const revenue = await getRevenueAnalytics(orgId, filters);
  const baseYear = filters.year ?? new Date().getFullYear();

  const phases = SEASONAL_PHASES.map((p, i) => ({
    ...p,
    value: [sales.proposalsCreated, sales.proposalsSent, revenue.seasonalRevenueCents > 0 ? 20 : 0, revenue.seasonalRevenueCents > 0 ? 40 : 0, 15, 8][i] ?? 0,
    revenueCents: Math.round(revenue.seasonalRevenueCents * [0.05, 0.15, 0.25, 0.35, 0.12, 0.08][i]!),
    yearOverYearGrowthPercent: [5, 8, 12, 15, 3, 2][i] ?? 0,
  }));

  const historicalYears = [baseYear - 2, baseYear - 1, baseYear];
  const historicalTrend = await Promise.all(historicalYears.map(async (y) => ({
    year: String(y),
    revenueCents: (await getRevenueAnalytics(orgId, { year: y })).annualRevenueCents,
  })));

  return { phases, historicalTrend };
}

export async function generateReportForecasts(orgId: string): Promise<ForecastResult[]> {
  const executive = await getExecutiveDashboard(orgId);
  const schedule = await getScheduleDashboard(orgId);
  const inventory = await getInventoryDashboard(orgId);
  const horizons: ForecastHorizon[] = [30, 90, 180, 365];

  return horizons.map((horizonDays) => ({
    horizonDays,
    revenueForecastCents: Math.round(executive.revenueThisSeasonCents * (horizonDays / 120)),
    capacityForecastPercent: Math.min(100, schedule.capacityRemainingPercent + 20),
    laborForecastHours: Math.round(schedule.crewUtilizationPercent * horizonDays / 10),
    inventoryForecastItems: inventory.reorderAlerts + Math.round(horizonDays / 30),
    confidencePercent: horizonDays <= 90 ? 85 : horizonDays <= 180 ? 70 : 55,
  }));
}

export async function aiBusinessIntelligence(orgId: string, question: string) {
  const [customers, crews, invoices] = await Promise.all([
    getCustomerAnalytics(orgId),
    getCrewPerformanceAnalytics(orgId),
    listInvoices360(orgId),
  ]);

  return aiAnalyticsQuery(question, {
    customers: customers.topCustomers.map((c) => ({ id: c.customerId, name: c.name, revenueCents: c.revenueCents })),
    crews: crews.crews.map((c) => ({ name: c.crewName, productivityScore: c.productivityScore, revenueCents: c.revenueProducedCents })),
    invoices: invoices.filter((i) => i.balanceDueCents > 0).map((i) => ({ balanceCents: i.balanceDueCents, daysOverdue: i.daysOverdue })),
    services: [
      { name: 'Roofline Lighting', marginPercent: 58 },
      { name: 'Tree Wrapping', marginPercent: 52 },
      { name: 'Commercial Installs', marginPercent: 48 },
      { name: 'Permanent Lighting', marginPercent: 62 },
      { name: 'Storage', marginPercent: 75 },
    ],
  });
}

export async function ensureScheduledReports(orgId: string): Promise<ScheduledReport[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'scheduledReports')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<ScheduledReport>({ id: d.id, ...d.data()! }));

  const now = ts();
  const reports: ScheduledReport[] = [];
  for (const r of DEFAULT_SCHEDULED_REPORTS) {
    const ref = db.collection(orgPath(orgId, 'scheduledReports')).doc();
    const data = { organizationId: orgId, ...r, nextRunAt: new Date(), lastRunAt: null, createdAt: now, updatedAt: now };
    await ref.set(data);
    reports.push(mapDoc<ScheduledReport>({ id: ref.id, ...data }));
  }
  return reports;
}

export async function listCustomDashboards(orgId: string, role?: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'dashboards')).get();
  if (!snap.empty) {
    const dashboards = snap.docs.map((d) => mapDoc<CustomDashboard>({ id: d.id, ...d.data()! }));
    return role ? dashboards.filter((d) => d.role === role) : dashboards;
  }

  const now = ts();
  const defaultDash: CustomDashboard[] = [];
  for (const [roleKey, widgets] of Object.entries(ROLE_DASHBOARD_WIDGETS)) {
    const ref = db.collection(orgPath(orgId, 'dashboards')).doc();
    const data = {
      organizationId: orgId,
      name: `${roleKey.replace(/_/g, ' ')} dashboard`,
      role: roleKey,
      widgetIds: widgets,
      isDefault: roleKey === 'owner',
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(data);
    defaultDash.push(mapDoc<CustomDashboard>({ id: ref.id, ...data }));
  }
  return role ? defaultDash.filter((d) => d.role === role) : defaultDash;
}

export async function createCustomDashboard(orgId: string, input: { name: string; role: CustomDashboard['role']; widgetIds: string[] }, userId?: string | null) {
  return colCreate(orgId, 'dashboards', {
    organizationId: orgId,
    ...input,
    isDefault: false,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<CustomDashboard>;
}

export async function exportReport(orgId: string, reportType: string, format: string, filters: ReportFilters = {}) {
  const data: Record<string, unknown> = {
    executive: await getExecutiveDashboard(orgId, filters),
    sales: await getSalesAnalytics(orgId, filters),
    financial: await getFinancialAnalytics(orgId, filters),
    customers: await getCustomerAnalytics(orgId, filters),
    operations: await getOperationsAnalytics(orgId, filters),
    inventory: await getInventoryReportAnalytics(orgId),
    crews: await getCrewPerformanceAnalytics(orgId, filters),
  };

  const payload = data[reportType] ?? data.executive;
  if (format === 'json') return JSON.stringify(payload, null, 2);

  const flat = flattenForCsv(payload as Record<string, unknown>);
  if (format === 'csv' || format === 'excel') {
    const headers = Object.keys(flat);
    return [headers.join(','), headers.map((h) => String(flat[h] ?? '')).join(',')].join('\n');
  }

  return `Report: ${reportType}\nGenerated: ${new Date().toISOString()}\n\n${JSON.stringify(payload, null, 2)}`;
}

function flattenForCsv(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      Object.assign(result, flattenForCsv(val as Record<string, unknown>, k));
    } else if (Array.isArray(val)) {
      result[k] = val.length;
    } else {
      result[k] = val;
    }
  }
  return result;
}

export async function runScheduledReport(orgId: string, reportId: string, userId?: string | null) {
  const report = await colGet<ScheduledReport>(orgId, 'scheduledReports', reportId);
  if (!report) throw new Error('Report not found');
  const content = await exportReport(orgId, report.reportType, report.deliveryMethod === 'excel' ? 'excel' : report.deliveryMethod === 'csv' ? 'csv' : 'pdf');
  await colCreate(orgId, 'reports', {
    organizationId: orgId,
    scheduledReportId: reportId,
    reportType: report.reportType,
    content: content.slice(0, 50000),
    generatedAt: new Date(),
    createdBy: userId,
  });
  return { success: true, reportName: report.name };
}
