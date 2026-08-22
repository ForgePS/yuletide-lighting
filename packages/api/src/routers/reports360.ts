import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getExecutiveDashboard,
  getRevenueAnalytics,
  getSalesAnalytics,
  getCustomerAnalytics,
  getGeographicAnalytics,
  getOperationsAnalytics,
  getCrewPerformanceAnalytics,
  getInventoryReportAnalytics,
  getFinancialAnalytics,
  getReceivablesAnalytics,
  getSeasonalAnalytics,
  getSeasonalCommandCenter,
  generateReportForecasts,
  aiBusinessIntelligence,
  ensureScheduledReports,
  listCustomDashboards,
  createCustomDashboard,
  exportReport,
  runScheduledReport,
} from '@yuletide/firebase';
import {
  aiAnalyticsQuerySchema,
  createCustomDashboardSchema,
  createScheduledReportSchema,
  exportReportSchema,
  dashboardRoleSchema,
  reportFilterSchema,
} from '@clcrm/validators';
import { router, protectedProcedure, requireModule, requirePermission } from '../trpc';
import { colCreate } from '@yuletide/firebase';

const reportInput = reportFilterSchema.optional();
const reportsModule = requireModule('reports');
/** YL-S19: module + reports RBAC (replaces officeProcedure-only / unprotected commandCenter). */
const reportsView = protectedProcedure.use(reportsModule).use(requirePermission('reports', 'view'));
const reportsCreate = protectedProcedure.use(reportsModule).use(requirePermission('reports', 'create'));
const reportsExport = protectedProcedure.use(reportsModule).use(requirePermission('reports', 'export'));

export const reports360Router = router({
  executive: reportsView.input(reportInput).query(({ ctx, input }) =>
    getExecutiveDashboard(ctx.auth.organizationId, input ?? {}),
  ),

  revenue: reportsView.input(reportInput).query(({ ctx, input }) =>
    getRevenueAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  sales: reportsView.input(reportInput).query(({ ctx, input }) =>
    getSalesAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  customers: reportsView.input(reportInput).query(({ ctx, input }) =>
    getCustomerAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  geographic: reportsView.input(reportInput).query(({ ctx, input }) =>
    getGeographicAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  operations: reportsView.input(reportInput).query(({ ctx, input }) =>
    getOperationsAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  crews: reportsView.input(reportInput).query(({ ctx, input }) =>
    getCrewPerformanceAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  inventory: reportsView.input(reportInput).query(({ ctx }) =>
    getInventoryReportAnalytics(ctx.auth.organizationId),
  ),

  financial: reportsView.input(reportInput).query(({ ctx, input }) =>
    getFinancialAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  receivables: reportsView.input(reportInput).query(({ ctx }) =>
    getReceivablesAnalytics(ctx.auth.organizationId),
  ),

  seasonal: reportsView.input(reportInput).query(({ ctx, input }) =>
    getSeasonalAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  commandCenter: reportsView.input(reportInput).query(({ ctx, input }) =>
    getSeasonalCommandCenter(ctx.auth.organizationId, input ?? {}),
  ),

  forecasts: reportsView.input(reportInput).query(({ ctx }) =>
    generateReportForecasts(ctx.auth.organizationId),
  ),

  aiQuery: reportsView.input(aiAnalyticsQuerySchema).query(({ ctx, input }) =>
    aiBusinessIntelligence(ctx.auth.organizationId, input.question),
  ),

  scheduledReports: reportsView.query(({ ctx }) => ensureScheduledReports(ctx.auth.organizationId)),

  createScheduledReport: reportsCreate.input(createScheduledReportSchema).mutation(({ ctx, input }) =>
    colCreate(ctx.auth.organizationId, 'scheduledReports', {
      organizationId: ctx.auth.organizationId,
      ...input,
      isActive: true,
      nextRunAt: new Date(),
      lastRunAt: null,
      createdBy: ctx.auth.userId,
    }),
  ),

  runScheduledReport: reportsCreate
    .input(z.object({ reportId: z.string() }))
    .mutation(({ ctx, input }) =>
      runScheduledReport(ctx.auth.organizationId, input.reportId, ctx.auth.userId),
    ),

  customDashboards: reportsView
    .input(z.object({ role: dashboardRoleSchema.optional() }).optional())
    .query(({ ctx, input }) => listCustomDashboards(ctx.auth.organizationId, input?.role)),

  createDashboard: reportsCreate.input(createCustomDashboardSchema).mutation(({ ctx, input }) =>
    createCustomDashboard(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  export: reportsExport.input(exportReportSchema).query(async ({ ctx, input }) => {
    const content = await exportReport(ctx.auth.organizationId, input.reportType, input.format, {
      year: input.year ?? null,
    });
    if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Export failed' });
    return { content, format: input.format, reportType: input.reportType };
  }),
});
