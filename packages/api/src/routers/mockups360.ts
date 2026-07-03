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
} from '@clcrm/validators';
import { router, officeProcedure, publicProcedure } from '../trpc';

export const mockups360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getMockupDashboard(ctx.auth.organizationId)),

  list: officeProcedure.query(({ ctx }) => listMockups360(ctx.auth.organizationId)),

  getById: officeProcedure.input(z.object({ mockupId: z.string() })).query(async ({ ctx, input }) => {
    const mockup = await getMockup360(ctx.auth.organizationId, input.mockupId);
    if (!mockup) throw new TRPCError({ code: 'NOT_FOUND' });
    return mockup;
  }),

  create: officeProcedure.input(createMockup360Schema).mutation(({ ctx, input }) =>
    createMockup360(ctx.auth.organizationId, {
      ...input,
      optimizedImageUrl: input.optimizedImageUrl ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
    }, ctx.auth.userId),
  ),

  update: officeProcedure.input(updateMockup360Schema).mutation(({ ctx, input }) => {
    const { mockupId, ...data } = input;
    return updateMockup360(ctx.auth.organizationId, mockupId, data as never, ctx.auth.userId);
  }),

  recordView: officeProcedure.input(z.object({ mockupId: z.string() })).mutation(({ ctx, input }) =>
    recordMockupView(ctx.auth.organizationId, input.mockupId),
  ),

  scale: router({
    set: officeProcedure.input(setScaleSchema).mutation(({ ctx, input }) =>
      setMockupScale(ctx.auth.organizationId, input.mockupId, input.knownFeet, input.pixelLength),
    ),
  }),

  ai: router({
    detect: officeProcedure.input(z.object({ mockupId: z.string() })).mutation(({ ctx, input }) =>
      runAiDetection(ctx.auth.organizationId, input.mockupId, ctx.auth.userId),
    ),
    design: officeProcedure.input(aiDesignSchema).mutation(({ ctx, input }) =>
      aiDesignAssistant(ctx.auth.organizationId, input.style, input.mockupId, ctx.auth.userId),
    ),
  }),

  materials: router({
    generate: officeProcedure.input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      generateMaterials(ctx.auth.organizationId, input.mockupId),
    ),
  }),

  measurements: router({
    list: officeProcedure.input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMeasurements(ctx.auth.organizationId, input.mockupId),
    ),
    save: officeProcedure.input(z.object({ mockupId: z.string() })).mutation(({ ctx, input }) =>
      saveMeasurements(ctx.auth.organizationId, input.mockupId, ctx.auth.userId),
    ),
  }),

  versions: router({
    list: officeProcedure.input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMockupVersions(ctx.auth.organizationId, input.mockupId),
    ),
    create: officeProcedure.input(createVersionSchema).mutation(({ ctx, input }) =>
      createMockupVersion(ctx.auth.organizationId, input.mockupId, input.revisionNotes, ctx.auth.email, ctx.auth.userId),
    ),
  }),

  exports: router({
    list: officeProcedure.input(z.object({ mockupId: z.string() })).query(({ ctx, input }) =>
      listMockupExports(ctx.auth.organizationId, input.mockupId),
    ),
    create: officeProcedure.input(exportMockupSchema).mutation(({ ctx, input }) =>
      exportMockup(ctx.auth.organizationId, input.mockupId, input.exportType, ctx.auth.userId),
    ),
  }),

  templates: router({
    list: officeProcedure.query(({ ctx }) => ensureDesignTemplates(ctx.auth.organizationId)),
    applyTemplate: officeProcedure.input(z.object({ mockupId: z.string(), templateId: z.string() })).mutation(({ ctx, input }) =>
      applyDesignTemplate(ctx.auth.organizationId, input.mockupId, input.templateId, ctx.auth.userId),
    ),
  }),

  library: router({
    list: officeProcedure.query(({ ctx }) => ensureDecorationLibrary(ctx.auth.organizationId)),
  }),

  proposals: router({
    createFromMockup: officeProcedure.input(createProposalFromMockupSchema).mutation(({ ctx, input }) =>
      createProposalFromMockup(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    link: officeProcedure.input(linkMockupProposalSchema).mutation(({ ctx, input }) =>
      linkMockupToProposal(ctx.auth.organizationId, input.mockupId, input.proposalId, ctx.auth.userId),
    ),
    listForMockup: officeProcedure.input(z.object({ mockupId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const mockup = await getMockup360(ctx.auth.organizationId, input.mockupId);
      if (!mockup) throw new TRPCError({ code: 'NOT_FOUND' });
      return listProposalsForMockup(ctx.auth.organizationId, mockup);
    }),
  }),

  sendForApproval: officeProcedure.input(z.object({ mockupId: z.string().min(1) })).mutation(({ ctx, input }) =>
    sendMockupForApproval(ctx.auth.organizationId, input.mockupId, ctx.auth.userId),
  ),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: z.string().min(8) })).query(async ({ input }) => {
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
