import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listInvoices360,
  getInvoice360,
  createInvoice360,
  createInvoiceFromProposal360,
  sendInvoice360,
  updateInvoice360,
  deleteInvoice360,
  recordInvoicePayment360,
  listInvoicePayments,
  listInvoiceActivity,
  listInvoiceReminders,
  controlReminders360,
  listReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  createDispute360,
  updateDispute360,
  listDisputes360,
  listCollectionsQueue,
  getAgingReport,
  getInvoiceDashboard,
  getCashFlowForecasts,
  getInvoiceAnalytics,
  getCustomerBalance,
  generateCustomerStatement,
  getInvoiceByToken360,
  recordInvoiceView,
  aiCollectionsQuery,
  listAllPayments,
  getInvoicePipeline,
  processInvoiceReminders,
  shift2026PaymentsTo2025,
} from '@yuletide/firebase';
import {
  createInvoice360Schema,
  updateInvoice360Schema,
  createFromProposal360Schema,
  recordPaymentSchema,
  createDisputeSchema,
  updateDisputeSchema,
  reminderControlSchema,
  createReminderTemplateSchema,
  updateReminderTemplateSchema,
  generateStatementSchema,
  aiCollectionsQuerySchema,
  updateInvoiceStatusSchema,
  reportFilterSchema,
  publicAccessTokenSchema,
} from '@clcrm/validators';
import { router, publicProcedure, permissionProcedure } from '../trpc';
import { colUpdate } from '@yuletide/firebase';

const invoiceFilterInput = reportFilterSchema.optional();

export const invoices360Router = router({
  dashboard: permissionProcedure('invoices', 'view').input(invoiceFilterInput).query(({ ctx, input }) =>
    getInvoiceDashboard(ctx.auth.organizationId, input ?? {}),
  ),

  analytics: permissionProcedure('invoices', 'view').input(invoiceFilterInput).query(({ ctx, input }) =>
    getInvoiceAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  forecasts: permissionProcedure('invoices', 'view').query(({ ctx }) => getCashFlowForecasts(ctx.auth.organizationId)),

  pipeline: permissionProcedure('invoices', 'view').query(({ ctx }) => getInvoicePipeline(ctx.auth.organizationId)),

  aging: permissionProcedure('invoices', 'view').query(({ ctx }) => getAgingReport(ctx.auth.organizationId)),

  aiQuery: permissionProcedure('invoices', 'view').input(aiCollectionsQuerySchema).query(({ ctx, input }) =>
    aiCollectionsQuery(ctx.auth.organizationId, input.question),
  ),

  processReminders: permissionProcedure('invoices', 'edit').mutation(({ ctx }) =>
    processInvoiceReminders(ctx.auth.organizationId),
  ),

  list: permissionProcedure('invoices', 'view').query(({ ctx }) => listInvoices360(ctx.auth.organizationId)),

  getById: permissionProcedure('invoices', 'view').input(z.object({ invoiceId: z.string() })).query(async ({ ctx, input }) => {
    const invoice = await getInvoice360(ctx.auth.organizationId, input.invoiceId);
    if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
    return invoice;
  }),

  create: permissionProcedure('invoices', 'create').input(createInvoice360Schema).mutation(({ ctx, input }) =>
    createInvoice360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  createFromProposal: permissionProcedure('invoices', 'create').input(createFromProposal360Schema).mutation(({ ctx, input }) =>
    createInvoiceFromProposal360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  send: permissionProcedure('invoices', 'edit').input(z.object({ invoiceId: z.string() })).mutation(({ ctx, input }) =>
    sendInvoice360(ctx.auth.organizationId, input.invoiceId, ctx.auth.userId),
  ),

  updateStatus: permissionProcedure('invoices', 'edit').input(updateInvoiceStatusSchema).mutation(({ ctx, input }) =>
    colUpdate(ctx.auth.organizationId, 'invoices', input.invoiceId, { status: input.status, updatedBy: ctx.auth.userId }).then(() =>
      getInvoice360(ctx.auth.organizationId, input.invoiceId),
    ),
  ),

  update: permissionProcedure('invoices', 'edit')
    .input(z.object({ invoiceId: z.string(), data: updateInvoice360Schema }))
    .mutation(({ ctx, input }) => updateInvoice360(ctx.auth.organizationId, input.invoiceId, input.data, ctx.auth.userId)),

  delete: permissionProcedure('invoices', 'delete')
    .input(z.object({ invoiceId: z.string() }))
    .mutation(({ ctx, input }) => deleteInvoice360(ctx.auth.organizationId, input.invoiceId, ctx.auth.userId)),

  shift2026PaymentsTo2025: permissionProcedure('settings', 'edit')
    .input(z.object({ dryRun: z.boolean().default(false) }).optional())
    .mutation(({ ctx, input }) =>
      shift2026PaymentsTo2025(ctx.auth.organizationId, input?.dryRun ?? false),
    ),

  payments: router({
    listAll: permissionProcedure('invoices', 'view').query(({ ctx }) => listAllPayments(ctx.auth.organizationId)),
    list: permissionProcedure('invoices', 'view').input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoicePayments(ctx.auth.organizationId, input.invoiceId),
    ),
    record: permissionProcedure('invoices', 'edit').input(recordPaymentSchema).mutation(({ ctx, input }) =>
      recordInvoicePayment360(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  activity: router({
    list: permissionProcedure('invoices', 'view').input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoiceActivity(ctx.auth.organizationId, input.invoiceId),
    ),
  }),

  reminders: router({
    list: permissionProcedure('invoices', 'view').input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoiceReminders(ctx.auth.organizationId, input.invoiceId),
    ),
    control: permissionProcedure('invoices', 'edit').input(reminderControlSchema).mutation(({ ctx, input }) =>
      controlReminders360(ctx.auth.organizationId, input.invoiceId, input.action, {
        channel: input.channel,
        stage: input.stage,
        userId: ctx.auth.userId,
        userName: ctx.auth.email,
      }),
    ),
    templates: router({
      list: permissionProcedure('invoices', 'view').query(({ ctx }) => listReminderTemplates(ctx.auth.organizationId)),
      create: permissionProcedure('invoices', 'create').input(createReminderTemplateSchema).mutation(({ ctx, input }) =>
        createReminderTemplate(ctx.auth.organizationId, { ...input, isActive: true } as never, ctx.auth.userId),
      ),
      update: permissionProcedure('invoices', 'edit')
        .input(z.object({ templateId: z.string(), data: updateReminderTemplateSchema.extend({ isActive: z.boolean().optional() }) }))
        .mutation(({ ctx, input }) =>
          updateReminderTemplate(ctx.auth.organizationId, input.templateId, input.data, ctx.auth.userId),
        ),
    }),
  }),

  disputes: router({
    list: permissionProcedure('invoices', 'view').query(({ ctx }) => listDisputes360(ctx.auth.organizationId)),
    create: permissionProcedure('invoices', 'create').input(createDisputeSchema).mutation(({ ctx, input }) =>
      createDispute360(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    update: permissionProcedure('invoices', 'edit').input(updateDisputeSchema).mutation(({ ctx, input }) =>
      updateDispute360(ctx.auth.organizationId, input.invoiceId, input.disputeId, input.status, input.resolution, ctx.auth.userId),
    ),
  }),

  collections: router({
    list: permissionProcedure('invoices', 'view').query(({ ctx }) => listCollectionsQueue(ctx.auth.organizationId)),
  }),

  customers: router({
    balance: permissionProcedure('invoices', 'view').input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      getCustomerBalance(ctx.auth.organizationId, input.customerId),
    ),
    statement: permissionProcedure('invoices', 'export').input(generateStatementSchema).mutation(({ ctx, input }) =>
      generateCustomerStatement(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: publicAccessTokenSchema })).query(async ({ input }) => {
      const result = await getInvoiceByToken360(input.token);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
    recordView: publicProcedure.input(z.object({ token: publicAccessTokenSchema })).mutation(({ input }) =>
      recordInvoiceView(input.token),
    ),
  }),

  rotatePublicToken: permissionProcedure('invoices', 'edit')
    .input(z.object({ invoiceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { rotateRecordPublicToken } = await import('@yuletide/firebase');
      const result = await rotateRecordPublicToken(
        ctx.auth.organizationId,
        'invoices',
        input.invoiceId,
        ctx.auth.userId,
      );
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
});
