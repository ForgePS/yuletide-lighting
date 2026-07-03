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
import { router, officeProcedure, protectedProcedure } from '../trpc';
import { colCreate } from '@yuletide/firebase';

const reportInput = reportFilterSchema.optional();

export const reports360Router = router({
  executive: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getExecutiveDashboard(ctx.auth.organizationId, input ?? {}),
  ),

  revenue: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getRevenueAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  sales: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getSalesAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  customers: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getCustomerAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  geographic: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getGeographicAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  operations: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getOperationsAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  crews: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getCrewPerformanceAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  inventory: officeProcedure.query(({ ctx }) => getInventoryReportAnalytics(ctx.auth.organizationId)),

  financial: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getFinancialAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  receivables: officeProcedure.query(({ ctx }) => getReceivablesAnalytics(ctx.auth.organizationId)),

  seasonal: officeProcedure.input(reportInput).query(({ ctx, input }) =>
    getSeasonalAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  commandCenter: protectedProcedure.input(reportInput).query(({ ctx, input }) =>
    getSeasonalCommandCenter(ctx.auth.organizationId, input ?? {}),
  ),

  forecasts: officeProcedure.query(({ ctx }) => generateReportForecasts(ctx.auth.organizationId)),

  aiQuery: officeProcedure.input(aiAnalyticsQuerySchema).query(({ ctx, input }) =>
    aiBusinessIntelligence(ctx.auth.organizationId, input.question),
  ),

  scheduledReports: officeProcedure.query(({ ctx }) => ensureScheduledReports(ctx.auth.organizationId)),

  createScheduledReport: officeProcedure.input(createScheduledReportSchema).mutation(({ ctx, input }) =>
    colCreate(ctx.auth.organizationId, 'scheduledReports', {
      organizationId: ctx.auth.organizationId,
      ...input,
      isActive: true,
      nextRunAt: new Date(),
      lastRunAt: null,
      createdBy: ctx.auth.userId,
    }),
  ),

  runScheduledReport: officeProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(({ ctx, input }) => runScheduledReport(ctx.auth.organizationId, input.reportId, ctx.auth.userId)),

  customDashboards: officeProcedure
    .input(z.object({ role: dashboardRoleSchema.optional() }).optional())
    .query(({ ctx, input }) => listCustomDashboards(ctx.auth.organizationId, input?.role)),

  createDashboard: officeProcedure.input(createCustomDashboardSchema).mutation(({ ctx, input }) =>
    createCustomDashboard(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  export: officeProcedure.input(exportReportSchema).query(async ({ ctx, input }) => {
    const content = await exportReport(ctx.auth.organizationId, input.reportType, input.format, { year: input.year ?? null });
    if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Export failed' });
    return { content, format: input.format, reportType: input.reportType };
  }),
});
