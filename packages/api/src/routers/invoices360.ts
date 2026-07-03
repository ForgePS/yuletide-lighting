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
  generateStatementSchema,
  aiCollectionsQuerySchema,
  updateInvoiceStatusSchema,
  reportFilterSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure, publicProcedure } from '../trpc';
import { colUpdate } from '@yuletide/firebase';

const invoiceFilterInput = reportFilterSchema.optional();

export const invoices360Router = router({
  dashboard: officeProcedure.input(invoiceFilterInput).query(({ ctx, input }) =>
    getInvoiceDashboard(ctx.auth.organizationId, input ?? {}),
  ),

  analytics: officeProcedure.input(invoiceFilterInput).query(({ ctx, input }) =>
    getInvoiceAnalytics(ctx.auth.organizationId, input ?? {}),
  ),

  forecasts: officeProcedure.query(({ ctx }) => getCashFlowForecasts(ctx.auth.organizationId)),

  pipeline: officeProcedure.query(({ ctx }) => getInvoicePipeline(ctx.auth.organizationId)),

  aging: officeProcedure.query(({ ctx }) => getAgingReport(ctx.auth.organizationId)),

  aiQuery: officeProcedure.input(aiCollectionsQuerySchema).query(({ ctx, input }) =>
    aiCollectionsQuery(ctx.auth.organizationId, input.question),
  ),

  processReminders: officeProcedure.mutation(({ ctx }) =>
    processInvoiceReminders(ctx.auth.organizationId),
  ),

  list: officeProcedure.query(({ ctx }) => listInvoices360(ctx.auth.organizationId)),

  getById: officeProcedure.input(z.object({ invoiceId: z.string() })).query(async ({ ctx, input }) => {
    const invoice = await getInvoice360(ctx.auth.organizationId, input.invoiceId);
    if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
    return invoice;
  }),

  create: officeProcedure.input(createInvoice360Schema).mutation(({ ctx, input }) =>
    createInvoice360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  createFromProposal: officeProcedure.input(createFromProposal360Schema).mutation(({ ctx, input }) =>
    createInvoiceFromProposal360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  send: officeProcedure.input(z.object({ invoiceId: z.string() })).mutation(({ ctx, input }) =>
    sendInvoice360(ctx.auth.organizationId, input.invoiceId, ctx.auth.userId),
  ),

  updateStatus: officeProcedure.input(updateInvoiceStatusSchema).mutation(({ ctx, input }) =>
    colUpdate(ctx.auth.organizationId, 'invoices', input.invoiceId, { status: input.status, updatedBy: ctx.auth.userId }).then(() =>
      getInvoice360(ctx.auth.organizationId, input.invoiceId),
    ),
  ),

  update: officeProcedure
    .input(z.object({ invoiceId: z.string(), data: updateInvoice360Schema }))
    .mutation(({ ctx, input }) => updateInvoice360(ctx.auth.organizationId, input.invoiceId, input.data, ctx.auth.userId)),

  delete: adminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(({ ctx, input }) => deleteInvoice360(ctx.auth.organizationId, input.invoiceId, ctx.auth.userId)),

  shift2026PaymentsTo2025: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(false) }).optional())
    .mutation(({ ctx, input }) =>
      shift2026PaymentsTo2025(ctx.auth.organizationId, input?.dryRun ?? false),
    ),

  payments: router({
    listAll: officeProcedure.query(({ ctx }) => listAllPayments(ctx.auth.organizationId)),
    list: officeProcedure.input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoicePayments(ctx.auth.organizationId, input.invoiceId),
    ),
    record: officeProcedure.input(recordPaymentSchema).mutation(({ ctx, input }) =>
      recordInvoicePayment360(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  activity: router({
    list: officeProcedure.input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoiceActivity(ctx.auth.organizationId, input.invoiceId),
    ),
  }),

  reminders: router({
    list: officeProcedure.input(z.object({ invoiceId: z.string() })).query(({ ctx, input }) =>
      listInvoiceReminders(ctx.auth.organizationId, input.invoiceId),
    ),
    control: officeProcedure.input(reminderControlSchema).mutation(({ ctx, input }) =>
      controlReminders360(ctx.auth.organizationId, input.invoiceId, input.action, {
        channel: input.channel,
        stage: input.stage,
        userId: ctx.auth.userId,
        userName: ctx.auth.email,
      }),
    ),
    templates: router({
      list: officeProcedure.query(({ ctx }) => listReminderTemplates(ctx.auth.organizationId)),
      create: officeProcedure.input(createReminderTemplateSchema).mutation(({ ctx, input }) =>
        createReminderTemplate(ctx.auth.organizationId, { ...input, isActive: true } as never, ctx.auth.userId),
      ),
    }),
  }),

  disputes: router({
    list: officeProcedure.query(({ ctx }) => listDisputes360(ctx.auth.organizationId)),
    create: officeProcedure.input(createDisputeSchema).mutation(({ ctx, input }) =>
      createDispute360(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateDisputeSchema).mutation(({ ctx, input }) =>
      updateDispute360(ctx.auth.organizationId, input.invoiceId, input.disputeId, input.status, input.resolution, ctx.auth.userId),
    ),
  }),

  collections: router({
    list: officeProcedure.query(({ ctx }) => listCollectionsQueue(ctx.auth.organizationId)),
  }),

  customers: router({
    balance: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      getCustomerBalance(ctx.auth.organizationId, input.customerId),
    ),
    statement: officeProcedure.input(generateStatementSchema).mutation(({ ctx, input }) =>
      generateCustomerStatement(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const result = await getInvoiceByToken360(input.token);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
    recordView: publicProcedure.input(z.object({ token: z.string() })).mutation(({ input }) =>
      recordInvoiceView(input.token),
    ),
  }),
});
