import { z } from 'zod';

export const dashboardRoleSchema = z.enum(['owner', 'sales_manager', 'operations_manager', 'crew_leader', 'office_staff']);
export const widgetTypeSchema = z.enum(['kpi', 'line_chart', 'bar_chart', 'pie_chart', 'heatmap', 'leaderboard', 'table']);
export const forecastHorizonSchema = z.enum(['30', '90', '180', '365']).transform(Number);
export const scheduledReportFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly']);

export const aiAnalyticsQuerySchema = z.object({
  question: z.string().min(3).max(500),
});

export const createCustomDashboardSchema = z.object({
  name: z.string().min(1).max(200),
  role: dashboardRoleSchema.default('owner'),
  widgetIds: z.array(z.string()).default([]),
});

export const createScheduledReportSchema = z.object({
  name: z.string().min(1).max(200),
  reportType: z.string().min(1),
  frequency: scheduledReportFrequencySchema,
  deliveryMethod: z.enum(['email', 'pdf', 'csv', 'excel']),
  recipients: z.array(z.string().email()).default([]),
});

export const exportReportSchema = z.object({
  reportType: z.enum(['executive', 'sales', 'financial', 'customers', 'operations', 'inventory', 'crews']),
  format: z.enum(['pdf', 'csv', 'excel', 'json']).default('csv'),
  year: z.number().int().min(2020).max(2100).optional().nullable(),
});

export const reportFilterSchema = z.object({
  year: z.number().int().min(2020).max(2100).optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  salespersonId: z.string().optional(),
  crewId: z.string().optional(),
  customerType: z.enum(['residential', 'commercial', 'hoa', 'municipal', 'church', 'school']).optional(),
  jobType: z
    .enum(['installation', 'takedown', 'service_call', 'repair', 'warranty', 'permanent_lighting_install'])
    .optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
