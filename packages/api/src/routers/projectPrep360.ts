import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createProjectPrepItem360,
  deleteProjectPrepItem360,
  getProjectPrepItem360,
  listProjectPrepItems360,
  updateProjectPrepItem360,
  updateProjectPrepStatus360,
} from '@yuletide/firebase';
import {
  projectPrepItemInputSchema,
  projectPrepListFiltersSchema,
  projectPrepStatusUpdateSchema,
  updateProjectPrepItemInputSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure } from '../trpc';

export const projectPrep360Router = router({
  list: officeProcedure.input(projectPrepListFiltersSchema.optional()).query(({ ctx, input }) =>
    listProjectPrepItems360(ctx.auth.organizationId, {
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      status: input?.status,
      customerId: input?.customerId,
      jobId: input?.jobId,
    }),
  ),

  getById: officeProcedure.input(z.object({ prepItemId: z.string() })).query(async ({ ctx, input }) => {
    const item = await getProjectPrepItem360(ctx.auth.organizationId, input.prepItemId);
    if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prep item not found' });
    return item;
  }),

  create: officeProcedure.input(projectPrepItemInputSchema).mutation(({ ctx, input }) =>
    createProjectPrepItem360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  update: officeProcedure
    .input(z.object({ prepItemId: z.string(), data: updateProjectPrepItemInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const item = await updateProjectPrepItem360(ctx.auth.organizationId, input.prepItemId, input.data, ctx.auth.userId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prep item not found' });
      return item;
    }),

  updateStatus: officeProcedure.input(projectPrepStatusUpdateSchema).mutation(async ({ ctx, input }) => {
    const item = await updateProjectPrepStatus360(ctx.auth.organizationId, input.prepItemId, input, ctx.auth.userId);
    if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prep item not found' });
    return item;
  }),

  delete: adminProcedure.input(z.object({ prepItemId: z.string() })).mutation(({ ctx, input }) =>
    deleteProjectPrepItem360(ctx.auth.organizationId, input.prepItemId),
  ),
});
