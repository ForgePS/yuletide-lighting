import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createServiceIssue360,
  deleteServiceIssue360,
  getServiceIssue360,
  listServiceIssues360,
  updateServiceIssue360,
  updateServiceIssueStatus360,
} from '@yuletide/firebase';
import {
  serviceIssueInputSchema,
  serviceIssueListFiltersSchema,
  serviceIssueStatusUpdateSchema,
  updateServiceIssueInputSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure } from '../trpc';

export const serviceIssues360Router = router({
  list: officeProcedure.input(serviceIssueListFiltersSchema.optional()).query(({ ctx, input }) =>
    listServiceIssues360(ctx.auth.organizationId, {
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      status: input?.status,
      priority: input?.priority,
      customerId: input?.customerId,
      jobId: input?.jobId,
      warranty: input?.warranty,
    }),
  ),

  getById: officeProcedure.input(z.object({ issueId: z.string() })).query(async ({ ctx, input }) => {
    const issue = await getServiceIssue360(ctx.auth.organizationId, input.issueId);
    if (!issue) throw new TRPCError({ code: 'NOT_FOUND', message: 'Service issue not found' });
    return issue;
  }),

  create: officeProcedure.input(serviceIssueInputSchema).mutation(({ ctx, input }) =>
    createServiceIssue360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  update: officeProcedure
    .input(z.object({ issueId: z.string(), data: updateServiceIssueInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const issue = await updateServiceIssue360(ctx.auth.organizationId, input.issueId, input.data, ctx.auth.userId);
      if (!issue) throw new TRPCError({ code: 'NOT_FOUND', message: 'Service issue not found' });
      return issue;
    }),

  updateStatus: officeProcedure.input(serviceIssueStatusUpdateSchema).mutation(async ({ ctx, input }) => {
    const issue = await updateServiceIssueStatus360(ctx.auth.organizationId, input.issueId, input, ctx.auth.userId);
    if (!issue) throw new TRPCError({ code: 'NOT_FOUND', message: 'Service issue not found' });
    return issue;
  }),

  delete: adminProcedure.input(z.object({ issueId: z.string() })).mutation(({ ctx, input }) =>
    deleteServiceIssue360(ctx.auth.organizationId, input.issueId),
  ),
});
