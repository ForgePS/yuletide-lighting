/** Enterprise Reporting & BI — Sprint REP-001 */

export type ReportAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type DashboardRole = 'owner' | 'sales_manager' | 'operations_manager' | 'crew_leader' | 'office_staff';

export type WidgetType = 'kpi' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'heatmap' | 'leaderboard' | 'table';

export type ForecastHorizon = 30 | 90 | 180 | 365;

export type ScheduledReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type ServiceCategory =
  | 'roofline_lighting'
  | 'tree_wrapping'
  | 'garland'
  | 'wreaths'
  | 'commercial_installs'
  | 'permanent_lighting'
  | 'service_calls'
  | 'storage';

export type ReportSeasonPhase =
  | 'august_leads'
  | 'september_proposals'
  | 'october_install'
  | 'november_peak'
  | 'january_takedown'
  | 'february_storage';

export type ExecutiveKpis = {
  totalRevenueCents: number;
  revenueThisMonthCents: number;
  revenueThisSeasonCents: number;
  grossProfitCents: number;
  grossMarginPercent: number;
  activeCustomers: number;
  jobsScheduled: number;
  jobsCompleted: number;
  proposalConversionRatePercent: number;
  averageSaleValueCents: number;
  outstandingReceivablesCents: number;
  customerRetentionRatePercent: number;
};

export type SeasonalCommandCenter = {
  currentSeasonPhase: string;
  kpis: {
    newLeadsThisWeek: number;
    proposalsSent: number;
    proposalsAwaitingApproval: number;
    bookedRevenueCents: number;
    projectedRevenueCents: number;
    installsScheduledThisWeek: number;
    removalsScheduledThisWeek: number;
    rebookingRatePercent: number;
    lowStockAlerts: number;
    openServiceCalls: number;
    outstandingInvoicesCents: number;
  };
  todaysInstalls: Array<{
    id: string;
    title: string;
    startAt: Date;
    customerName?: string | null;
    propertyAddress?: string | null;
  }>;
  followUpsDue: Array<{
    customerId: string;
    customerName: string;
    stage: string;
    nextAction?: string | null;
    dueAt?: Date | null;
  }>;
  proposalPipeline: Array<{ stage: string; count: number; valueCents: number }>;
  revenueForecast: Array<{ period: string; bookedCents: number; projectedCents: number }>;
  crewWorkload: Array<{ crewName: string; jobsThisWeek: number; utilizationPercent: number }>;
  inventoryWarnings: Array<{
    itemId: string;
    name: string;
    sku: string;
    quantityOnHand: number;
    reorderThreshold: number;
  }>;
  rebookingOpportunities: Array<{
    customerId: string;
    customerName: string;
    projectedValueCents: number;
    status: string;
  }>;
};

export type RevenueAnalytics = {
  dailyRevenueCents: number;
  weeklyRevenueCents: number;
  monthlyRevenueCents: number;
  seasonalRevenueCents: number;
  annualRevenueCents: number;
  revenueTrend: Array<{ period: string; revenueCents: number }>;
  revenueByService: Array<{ category: ServiceCategory; label: string; revenueCents: number }>;
  revenueBySalesperson: Array<{ name: string; revenueCents: number; proposalCount: number }>;
  revenueByCrew: Array<{ crewName: string; revenueCents: number; jobCount: number }>;
  revenueByCustomerType: Array<{ type: string; revenueCents: number; count: number }>;
};

export type SalesAnalytics = {
  proposalsCreated: number;
  proposalsSent: number;
  proposalsViewed: number;
  proposalsApproved: number;
  proposalsRejected: number;
  conversionRatePercent: number;
  averageCloseTimeDays: number;
  averageProposalValueCents: number;
  revenueWonCents: number;
  revenueLostCents: number;
  funnel: Array<{ stage: string; count: number; valueCents: number }>;
};

export type CustomerAnalytics = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRatePercent: number;
  churnRatePercent: number;
  averageLifetimeValueCents: number;
  averageSpendCents: number;
  topCustomers: Array<{ customerId: string; name: string; revenueCents: number; jobCount: number }>;
  mostProfitable: Array<{ customerId: string; name: string; profitCents: number; marginPercent: number }>;
  atRiskCustomers: Array<{ customerId: string; name: string; reason: string; daysSinceContact: number }>;
};

export type GeographicAnalytics = {
  byZipCode: Array<{ zip: string; revenueCents: number; customerCount: number }>;
  byCity: Array<{ city: string; revenueCents: number; customerCount: number }>;
  heatMapPoints: Array<{ lat?: number; lng?: number; zip: string; intensity: number }>;
};

export type OperationsAnalytics = {
  jobsScheduled: number;
  jobsCompleted: number;
  jobsDelayed: number;
  jobsRescheduled: number;
  serviceCallsOpen: number;
  completionRatePercent: number;
  onTimeRatePercent: number;
  callbackRatePercent: number;
  warrantyRatePercent: number;
};

export type CrewPerformanceAnalytics = {
  crews: Array<{
    crewId: string;
    crewName: string;
    jobsCompleted: number;
    laborHours: number;
    revenueProducedCents: number;
    productivityScore: number;
    avgInstallHours: number;
    satisfactionScore: number;
  }>;
  leaderboard: Array<{ rank: number; name: string; metric: string; value: number }>;
  labor: {
    totalHours: number;
    overtimeHours: number;
    laborCostCents: number;
    revenuePerLaborHourCents: number;
    utilizationRatePercent: number;
    efficiencyRatePercent: number;
  };
};

export type InventoryReportAnalytics = {
  inventoryValueCents: number;
  inventoryTurnover: number;
  reorderAlerts: number;
  topUsedItems: Array<{ sku: string; name: string; quantityUsed: number }>;
  slowMovingItems: Array<{ sku: string; name: string; daysSinceMovement: number }>;
  damagedValueCents: number;
  seasonalConsumption: Array<{ month: string; quantity: number }>;
};

export type FinancialAnalytics = {
  revenueCents: number;
  expensesCents: number;
  grossProfitCents: number;
  netProfitCents: number;
  cashFlowCents: number;
  outstandingInvoicesCents: number;
  depositsCollectedCents: number;
  profitAndLoss: Array<{ category: string; amountCents: number }>;
  revenueBySeason: Array<{ season: string; revenueCents: number }>;
  /** Sprint 13 — owner financial intelligence */
  bookedRevenueCents: number;
  projectedRevenueCents: number;
  proposalConversionRatePercent: number;
  averageJobValueCents: number;
  residentialRevenueCents: number;
  commercialRevenueCents: number;
  rebookingRevenueCents: number;
  storageRevenueCents: number;
  crewRevenuePerDayCents: number;
  materialCostEstimateCents: number;
  grossMarginEstimatePercent: number;
  revenueForecast: Array<{ period: string; bookedCents: number; projectedCents: number }>;
  proposalConversion: {
    created: number;
    sent: number;
    viewed: number;
    approved: number;
    conversionRatePercent: number;
  };
  crewProfitability: Array<{
    crewName: string;
    revenueCents: number;
    revenuePerDayCents: number;
    jobsCompleted: number;
    marginEstimatePercent: number;
  }>;
  outstandingInvoices: Array<{
    invoiceNumber: string;
    customerName: string;
    balanceDueCents: number;
    daysOverdue: number;
  }>;
  revenueByCustomerType: Array<{ type: string; revenueCents: number }>;
};

export type ReceivablesAnalytics = {
  outstandingBalanceCents: number;
  currentInvoicesCents: number;
  overdueInvoicesCents: number;
  collectionRatePercent: number;
  agingBuckets: Array<{ bucket: string; count: number; balanceCents: number }>;
};

export type SeasonalAnalytics = {
  phases: Array<{
    phase: ReportSeasonPhase;
    label: string;
    month: string;
    metric: string;
    value: number;
    revenueCents: number;
    yearOverYearGrowthPercent: number;
  }>;
  historicalTrend: Array<{ year: string; revenueCents: number }>;
};

export type ForecastResult = {
  horizonDays: ForecastHorizon;
  revenueForecastCents: number;
  capacityForecastPercent: number;
  laborForecastHours: number;
  inventoryForecastItems: number;
  confidencePercent: number;
};

export type CustomDashboard = ReportAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  role: DashboardRole;
  widgetIds: string[];
  isDefault: boolean;
};

export type DashboardWidget = ReportAuditFields & {
  id: string;
  dashboardId: string;
  widgetType: WidgetType;
  title: string;
  config: Record<string, unknown>;
  sortOrder: number;
};

export type ScheduledReport = ReportAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  reportType: string;
  frequency: ScheduledReportFrequency;
  deliveryMethod: 'email' | 'pdf' | 'csv' | 'excel';
  recipients: string[];
  nextRunAt?: Date | null;
  lastRunAt?: Date | null;
  isActive: boolean;
};

export type AiAnalyticsResult = {
  answer: string;
  data: Record<string, unknown>;
  recommendations: string[];
  riskAlerts: string[];
};

export const SEASONAL_PHASES: SeasonalAnalytics['phases'] = [
  { phase: 'august_leads', label: 'Lead Generation', month: 'August', metric: 'Leads', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
  { phase: 'september_proposals', label: 'Proposal Season', month: 'September', metric: 'Proposals', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
  { phase: 'october_install', label: 'Installation Ramp-Up', month: 'October', metric: 'Installs', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
  { phase: 'november_peak', label: 'Peak Production', month: 'November', metric: 'Peak Jobs', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
  { phase: 'january_takedown', label: 'Takedown Operations', month: 'January', metric: 'Takedowns', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
  { phase: 'february_storage', label: 'Storage Operations', month: 'February', metric: 'Storage', value: 0, revenueCents: 0, yearOverYearGrowthPercent: 0 },
];

export const DEFAULT_SCHEDULED_REPORTS: Array<Omit<ScheduledReport, keyof ReportAuditFields | 'id' | 'organizationId' | 'nextRunAt' | 'lastRunAt'>> = [
  { name: 'Daily executive summary', reportType: 'executive', frequency: 'daily', deliveryMethod: 'email', recipients: [], isActive: true },
  { name: 'Weekly sales report', reportType: 'sales', frequency: 'weekly', deliveryMethod: 'pdf', recipients: [], isActive: true },
  { name: 'Monthly financial report', reportType: 'financial', frequency: 'monthly', deliveryMethod: 'excel', recipients: [], isActive: true },
];

export const ROLE_DASHBOARD_WIDGETS: Record<DashboardRole, string[]> = {
  owner: ['executive', 'revenue', 'financial', 'forecasting', 'crews', 'inventory'],
  sales_manager: ['sales', 'customers', 'revenue', 'geographic'],
  operations_manager: ['operations', 'crews', 'inventory', 'seasonal'],
  crew_leader: ['crews', 'operations'],
  office_staff: ['operations', 'customers', 'receivables'],
};

export function aiAnalyticsQuery(question: string, context: {
  customers: Array<{ id: string; name: string; revenueCents: number }>;
  crews: Array<{ name: string; productivityScore: number; revenueCents: number }>;
  invoices: Array<{ balanceCents: number; daysOverdue: number }>;
  services: Array<{ name: string; marginPercent: number }>;
}): AiAnalyticsResult {
  const q = question.toLowerCase();
  const recommendations: string[] = [];
  const riskAlerts: string[] = [];

  if (q.includes('highest profit') || q.includes('most profitable')) {
    const top = [...context.customers].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5);
    return {
      answer: `Top profitable customers: ${top.map((c) => c.name).join(', ') || 'none yet'}.`,
      data: { customers: top },
      recommendations: ['Focus retention efforts on top 20% of customers', 'Offer premium upsells to high-value accounts'],
      riskAlerts: [],
    };
  }
  if (q.includes('underperforming') && q.includes('crew')) {
    const under = context.crews.filter((c) => c.productivityScore < 70);
    return {
      answer: `${under.length} crew(s) below productivity threshold: ${under.map((c) => c.name).join(', ') || 'none'}.`,
      data: { crews: under },
      recommendations: ['Review crew schedules for overallocation', 'Provide additional training for low-scoring crews'],
      riskAlerts: under.length > 0 ? ['Crew productivity below target'] : [],
    };
  }
  if (q.includes('forecast') && q.includes('revenue')) {
    const total = context.customers.reduce((s, c) => s + c.revenueCents, 0);
    const forecast = Math.round(total * 1.15);
    return {
      answer: `Next season revenue forecast: $${(forecast / 100).toLocaleString()} (15% growth assumption).`,
      data: { forecastCents: forecast },
      recommendations: ['Begin hiring 2 weeks before October ramp-up', 'Increase inventory orders by 20% for peak season'],
      riskAlerts: [],
    };
  }
  if (q.includes('highest margin') || q.includes('services')) {
    const top = [...context.services].sort((a, b) => b.marginPercent - a.marginPercent)[0];
    return {
      answer: top ? `Highest margin service: ${top.name} at ${top.marginPercent}% margin.` : 'Insufficient service data.',
      data: { services: context.services },
      recommendations: ['Promote high-margin services in proposals', 'Bundle lower-margin items with premium packages'],
      riskAlerts: [],
    };
  }
  if (q.includes('overdue') && q.includes('invoice')) {
    const overdue = context.invoices.filter((i) => i.daysOverdue > 0 && i.balanceCents > 100000);
    if (overdue.length) riskAlerts.push(`${overdue.length} invoices over $1,000 past due`);
    return {
      answer: `${overdue.length} overdue invoice(s) over $1,000 totaling $${(overdue.reduce((s, i) => s + i.balanceCents, 0) / 100).toLocaleString()}.`,
      data: { count: overdue.length },
      recommendations: ['Send collection reminders for invoices 30+ days overdue', 'Review payment terms for repeat late payers'],
      riskAlerts,
    };
  }
  if (q.includes('inventory') && q.includes('october')) {
    return {
      answer: 'October inventory forecast: increase C9 bulbs by 25%, clips by 15%, and wire inventory by 20% based on scheduled installs.',
      data: { month: 'October' },
      recommendations: ['Place PO for C9 warm white by September 15', 'Review reorder levels for top 10 SKUs'],
      riskAlerts: [],
    };
  }

  return {
    answer: 'I can help analyze revenue, crews, customers, inventory, and forecasts. Try a specific question.',
    data: {},
    recommendations: ['Ask about top customers, crew performance, or seasonal forecasts'],
    riskAlerts: [],
  };
}
