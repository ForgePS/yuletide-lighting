import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listProposals360,
  getProposal360,
  createProposal360,
  updateProposal360,
  deleteProposal360,
  updateProposalStatus,
  sendProposal360,
  getProposalByToken,
  recordPublicApproval,
  collectDeposit,
  getProposalAnalytics,
  listProposalTemplates,
  ensureProposalTemplates,
  createProposalTemplate,
  updateProposalPackage,
  generateAiAssist,
  calculateUpsells,
  calculatePricingFromComponents,
  getAdminFirestore,
} from '@yuletide/firebase';
import {
  createProposal360Schema,
  updateProposal360Schema,
  updateProposalStatusSchema,
  publicApprovalSchema,
  createProposalTemplateSchema,
  updateProposalTemplateSchema,
  depositPaymentSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure, publicProcedure } from '../trpc';

export const proposals360Router = router({
  list: officeProcedure.query(({ ctx }) => listProposals360(ctx.auth.organizationId)),

  getById: officeProcedure.input(z.object({ proposalId: z.string() })).query(async ({ ctx, input }) => {
    const proposal = await getProposal360(ctx.auth.organizationId, input.proposalId);
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    return proposal;
  }),

  analytics: officeProcedure.query(({ ctx }) => getProposalAnalytics(ctx.auth.organizationId)),

  create: officeProcedure.input(createProposal360Schema).mutation(async ({ ctx, input }) => {
    const { packages, templateId: _t, ...rest } = input;
    return createProposal360(ctx.auth.organizationId, { ...rest, packages } as never, ctx.auth.userId);
  }),

  update: officeProcedure
    .input(z.object({ proposalId: z.string(), data: updateProposal360Schema }))
    .mutation(({ ctx, input }) => updateProposal360(ctx.auth.organizationId, input.proposalId, input.data, ctx.auth.userId)),

  delete: adminProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(({ ctx, input }) => deleteProposal360(ctx.auth.organizationId, input.proposalId)),

  updateStatus: officeProcedure.input(updateProposalStatusSchema).mutation(({ ctx, input }) =>
    updateProposalStatus(ctx.auth.organizationId, input.proposalId, input.status, ctx.auth.userId),
  ),

  send: officeProcedure.input(z.object({ proposalId: z.string() })).mutation(({ ctx, input }) =>
    sendProposal360(ctx.auth.organizationId, input.proposalId, ctx.auth.userId),
  ),

  collectDeposit: officeProcedure.input(depositPaymentSchema).mutation(({ ctx, input }) =>
    collectDeposit(ctx.auth.organizationId, input.proposalId, input.amountCents),
  ),

  upsells: officeProcedure.input(z.object({ proposalId: z.string() })).query(async ({ ctx, input }) => {
    const proposal = await getProposal360(ctx.auth.organizationId, input.proposalId);
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    return calculateUpsells(proposal, proposal.installType);
  }),

  aiAssist: officeProcedure
    .input(z.object({ proposalId: z.string(), customerName: z.string(), propertyAddress: z.string() }))
    .query(async ({ ctx, input }) => {
      const proposal = await getProposal360(ctx.auth.organizationId, input.proposalId);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      return generateAiAssist({
        customerName: input.customerName,
        propertyAddress: input.propertyAddress,
        installType: proposal.installType,
        pricing: proposal.pricing,
      });
    }),

  calculatePricing: officeProcedure
    .input(z.object({ pricing: z.record(z.number()) }))
    .query(({ input }) => calculatePricingFromComponents(input.pricing as never)),

  packages: router({
    update: officeProcedure
      .input(z.object({ proposalId: z.string(), packageId: z.string(), data: z.record(z.unknown()) }))
      .mutation(({ ctx, input }) =>
        updateProposalPackage(ctx.auth.organizationId, input.proposalId, input.packageId, input.data, ctx.auth.userId),
      ),
  }),

  templates: router({
    list: officeProcedure.query(({ ctx }) => ensureProposalTemplates(ctx.auth.organizationId)),
    create: officeProcedure.input(createProposalTemplateSchema).mutation(({ ctx, input }) =>
      createProposalTemplate(ctx.auth.organizationId, { organizationId: ctx.auth.organizationId, ...input, defaultPackages: input.defaultPackages as never[] }, ctx.auth.userId),
    ),
    update: officeProcedure
      .input(z.object({ templateId: z.string(), data: updateProposalTemplateSchema }))
      .mutation(async ({ ctx, input }) => {
        const db = getAdminFirestore();
        await db.doc(`organizations/${ctx.auth.organizationId}/proposalTemplates/${input.templateId}`).update({
          ...input.data,
          updatedAt: new Date(),
        });
        return listProposalTemplates(ctx.auth.organizationId);
      }),
  }),

  public: router({
    getByToken: publicProcedure
      .input(z.object({ token: z.string(), userAgent: z.string().optional(), device: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const result = await getProposalByToken(input.token, {
          userAgent: input.userAgent,
          device: input.device,
          ip: (ctx as { ip?: string }).ip,
        });
        if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
        return result;
      }),

    approve: publicProcedure.input(publicApprovalSchema).mutation(async ({ input }) => {
      const result = await recordPublicApproval(input.token, {
        action: input.action,
        customerName: input.customerName,
        signatureData: input.signatureData || null,
        packageId: input.packageId || null,
        agreementCode: input.agreementCode || null,
        notes: input.notes || null,
      });
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
  }),
});
