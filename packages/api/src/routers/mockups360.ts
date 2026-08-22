import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listMockups360,
  getMockup360,
  createMockup360,
  updateMockup360,
  setMockupScale,
  runAiDetection,
  generateMaterials,
  createMockupVersion,
  listMockupVersions,
  exportMockup,
  listMockupExports,
  ensureDesignTemplates,
  ensureDecorationLibrary,
  applyDesignTemplate,
  aiDesignAssistant,
  createProposalFromMockup,
  getMockupDashboard,
  recordMockupView,
  saveMeasurements,
  listMeasurements,
  sendMockupForApproval,
  getMockupByApprovalToken,
  recordCustomerMockupApproval,
  linkMockupToProposal,
  listProposalsForMockup,
} from '@yuletide/firebase';
import {
  createMockup360Schema,
  updateMockup360Schema,
  setScaleSchema,
  createVersionSchema,
  aiDesignSchema,
  exportMockupSchema,
  createProposalFromMockupSchema,
  linkMockupProposalSchema,
  mockupCustomerApprovalSchema,
  publicAccessTokenSchema,
} from '@clcrm/validators';
import { router, publicProcedure, permissionProcedure } from '../trpc';

export const mockups360Router = router({
  dashboard: permissionProcedure('mockups', 'view').query(({ ctx }) => getMockupDashboard(ctx.auth.organizationId)),

  list: permissionProcedure('mockups', 'view').query(({ ctx }) => listMockups360(ctx.auth.organizationId)),

  getById: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).query(async ({ ctx, input }) => {
    const mockup = await getMockup360(ctx.auth.organizationId, input.mockupId);
    if (!mockup) throw new TRPCError({ code: 'NOT_FOUND' });
    return mockup;
  }),

  create: permissionProcedure('mockups', 'create').input(createMockup360Schema).mutation(({ ctx, input }) =>
    createMockup360(ctx.auth.organizationId, {
      ...input,
      optimizedImageUrl: input.optimizedImageUrl ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
    }, ctx.auth.userId),
  ),

  update: permissionProcedure('mockups', 'edit').input(updateMockup360Schema).mutation(({ ctx, input }) => {
    const { mockupId, ...data } = input;
    return updateMockup360(ctx.auth.organizationId, mockupId, data as never, ctx.auth.userId);
  }),

  recordView: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).mutation(({ ctx, input }) =>
    recordMockupView(ctx.auth.organizationId, input.mockupId),
  ),

  scale: router({
    set: permissionProcedure('mockups', 'edit').input(setScaleSchema).mutation(({ ctx, input }) =>
      setMockupScale(ctx.auth.organizationId, input.mockupId, input.knownFeet, input.pixelLength),
    ),
  }),

  ai: router({
    detect: permissionProcedure('mockups', 'edit').input(z.object({ mockupId: z.string() })).mutation(async ({ ctx, input }) => {
      try {
        return await runAiDetection(ctx.auth.organizationId, input.mockupId, ctx.auth.userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI unavailable';
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: message.startsWith('AI_') ? message : 'AI_PROVIDER_NOT_CONFIGURED',
        });
      }
    }),
    design: permissionProcedure('mockups', 'edit').input(aiDesignSchema).mutation(async ({ ctx, input }) => {
      try {
        return await aiDesignAssistant(ctx.auth.organizationId, input.style, input.mockupId, ctx.auth.userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI unavailable';
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: message.startsWith('AI_') ? message : 'AI_PROVIDER_NOT_CONFIGURED',
        });
      }
    }),
  }),

  materials: router({
    generate: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      generateMaterials(ctx.auth.organizationId, input.mockupId),
    ),
  }),

  measurements: router({
    list: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMeasurements(ctx.auth.organizationId, input.mockupId),
    ),
    save: permissionProcedure('mockups', 'edit').input(z.object({ mockupId: z.string() })).mutation(({ ctx, input }) =>
      saveMeasurements(ctx.auth.organizationId, input.mockupId, ctx.auth.userId),
    ),
  }),

  versions: router({
    list: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMockupVersions(ctx.auth.organizationId, input.mockupId),
    ),
    create: permissionProcedure('mockups', 'create').input(createVersionSchema).mutation(({ ctx, input }) =>
      createMockupVersion(ctx.auth.organizationId, input.mockupId, input.revisionNotes, ctx.auth.email, ctx.auth.userId),
    ),
  }),

  exports: router({
    list: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMockupExports(ctx.auth.organizationId, input.mockupId),
    ),
    create: permissionProcedure('mockups', 'export').input(exportMockupSchema).mutation(({ ctx, input }) =>
      exportMockup(ctx.auth.organizationId, input.mockupId, input.exportType, ctx.auth.userId),
    ),
  }),

  templates: router({
    list: permissionProcedure('mockups', 'view').query(({ ctx }) => ensureDesignTemplates(ctx.auth.organizationId)),
    applyTemplate: permissionProcedure('mockups', 'edit').input(z.object({ mockupId: z.string(), templateId: z.string() })).mutation(({ ctx, input }) =>
      applyDesignTemplate(ctx.auth.organizationId, input.mockupId, input.templateId, ctx.auth.userId),
    ),
  }),

  library: router({
    list: permissionProcedure('mockups', 'view').query(({ ctx }) => ensureDecorationLibrary(ctx.auth.organizationId)),
  }),

  proposals: router({
    createFromMockup: permissionProcedure('mockups', 'create').input(createProposalFromMockupSchema).mutation(({ ctx, input }) =>
      createProposalFromMockup(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    link: permissionProcedure('mockups', 'edit').input(linkMockupProposalSchema).mutation(({ ctx, input }) =>
      linkMockupToProposal(ctx.auth.organizationId, input.mockupId, input.proposalId, ctx.auth.userId),
    ),
    listForMockup: permissionProcedure('mockups', 'view').input(z.object({ mockupId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const mockup = await getMockup360(ctx.auth.organizationId, input.mockupId);
      if (!mockup) throw new TRPCError({ code: 'NOT_FOUND' });
      return listProposalsForMockup(ctx.auth.organizationId, mockup);
    }),
  }),

  sendForApproval: permissionProcedure('mockups', 'edit').input(z.object({ mockupId: z.string().min(1) })).mutation(({ ctx, input }) =>
    sendMockupForApproval(ctx.auth.organizationId, input.mockupId, ctx.auth.userId),
  ),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: publicAccessTokenSchema })).query(async ({ input }) => {
      const data = await getMockupByApprovalToken(input.token);
      if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
      return data;
    }),
    approve: publicProcedure.input(mockupCustomerApprovalSchema).mutation(({ input }) =>
      recordCustomerMockupApproval(input.token, {
        action: input.action,
        customerName: input.customerName,
        notes: input.notes,
      }),
    ),
  }),
});
