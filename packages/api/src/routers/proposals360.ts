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
  publicAccessTokenSchema,
  createProposalTemplateSchema,
  updateProposalTemplateSchema,
  depositPaymentSchema,
} from '@clcrm/validators';
import { router, publicProcedure, permissionProcedure } from '../trpc';

export const proposals360Router = router({
  list: permissionProcedure('proposals', 'view').query(({ ctx }) => listProposals360(ctx.auth.organizationId)),

  getById: permissionProcedure('proposals', 'view').input(z.object({ proposalId: z.string() })).query(async ({ ctx, input }) => {
    const proposal = await getProposal360(ctx.auth.organizationId, input.proposalId);
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    return proposal;
  }),

  analytics: permissionProcedure('proposals', 'view').query(({ ctx }) => getProposalAnalytics(ctx.auth.organizationId)),

  create: permissionProcedure('proposals', 'create').input(createProposal360Schema).mutation(async ({ ctx, input }) => {
  const { packages, templateId: _t, preferPackages, ...rest } = input;
  return createProposal360(
    ctx.auth.organizationId,
    { ...rest, packages, preferPackages } as never,
    ctx.auth.userId,
  );
  }),

  update: permissionProcedure('proposals', 'edit')
    .input(z.object({ proposalId: z.string(), data: updateProposal360Schema }))
    .mutation(({ ctx, input }) => updateProposal360(ctx.auth.organizationId, input.proposalId, input.data, ctx.auth.userId)),

  delete: permissionProcedure('proposals', 'delete')
    .input(z.object({ proposalId: z.string() }))
    .mutation(({ ctx, input }) => deleteProposal360(ctx.auth.organizationId, input.proposalId)),

  updateStatus: permissionProcedure('proposals', 'edit').input(updateProposalStatusSchema).mutation(({ ctx, input }) =>
    updateProposalStatus(ctx.auth.organizationId, input.proposalId, input.status, ctx.auth.userId),
  ),

  send: permissionProcedure('proposals', 'edit').input(z.object({ proposalId: z.string() })).mutation(({ ctx, input }) =>
    sendProposal360(ctx.auth.organizationId, input.proposalId, ctx.auth.userId),
  ),

  collectDeposit: permissionProcedure('proposals', 'edit').input(depositPaymentSchema).mutation(({ ctx, input }) =>
    collectDeposit(ctx.auth.organizationId, input.proposalId, input.amountCents),
  ),

  upsells: permissionProcedure('proposals', 'view').input(z.object({ proposalId: z.string() })).query(async ({ ctx, input }) => {
    const proposal = await getProposal360(ctx.auth.organizationId, input.proposalId);
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    return calculateUpsells(proposal, proposal.installType);
  }),

  aiAssist: permissionProcedure('proposals', 'view')
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

  calculatePricing: permissionProcedure('proposals', 'view')
    .input(z.object({ pricing: z.record(z.number()) }))
    .query(({ input }) => calculatePricingFromComponents(input.pricing as never)),

  packages: router({
    update: permissionProcedure('proposals', 'edit')
      .input(z.object({ proposalId: z.string(), packageId: z.string(), data: z.record(z.unknown()) }))
      .mutation(({ ctx, input }) =>
        updateProposalPackage(ctx.auth.organizationId, input.proposalId, input.packageId, input.data, ctx.auth.userId),
      ),
  }),

  templates: router({
    list: permissionProcedure('proposals', 'view').query(({ ctx }) => ensureProposalTemplates(ctx.auth.organizationId)),
    create: permissionProcedure('proposals', 'create').input(createProposalTemplateSchema).mutation(({ ctx, input }) =>
      createProposalTemplate(ctx.auth.organizationId, { organizationId: ctx.auth.organizationId, ...input, defaultPackages: input.defaultPackages as never[] }, ctx.auth.userId),
    ),
    update: permissionProcedure('proposals', 'edit')
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
      .input(z.object({ token: publicAccessTokenSchema, userAgent: z.string().optional(), device: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const result = await getProposalByToken(input.token, {
          userAgent: input.userAgent,
          device: input.device,
          ip: (ctx as { ip?: string }).ip,
        });
        if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
        return result;
      }),

    approve: publicProcedure.input(publicApprovalSchema).mutation(async ({ input, ctx }) => {
      const result = await recordPublicApproval(input.token, {
        action: input.action,
        customerName: input.customerName,
        signatureData: input.signatureData || null,
        packageId: input.packageId || null,
        agreementCode: input.agreementCode || null,
        notes: input.notes || null,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      });
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
  }),

  rotatePublicToken: permissionProcedure('proposals', 'edit')
    .input(z.object({ proposalId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { rotateRecordPublicToken } = await import('@yuletide/firebase');
      const result = await rotateRecordPublicToken(
        ctx.auth.organizationId,
        'proposals',
        input.proposalId,
        ctx.auth.userId,
      );
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),

  createRevision: permissionProcedure('proposals', 'create')
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { createProposalRevision360 } = await import('@yuletide/firebase');
      return createProposalRevision360(ctx.auth.organizationId, input.proposalId, ctx.auth.userId);
    }),
});
