import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  approveTimeClockEntry360,
  clockIn360,
  clockOut360,
  createTimeClockEntry360,
  getTimeClockEntry360,
  listTimeClockEntries360,
  updateTimeClockEntry360,
} from '@yuletide/firebase';
import {
  clockInInputSchema,
  timeClockEntryInputSchema,
  timeClockListFiltersSchema,
  updateTimeClockEntryInputSchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

export const timeClock360Router = router({
  list: officeProcedure.input(timeClockListFiltersSchema.optional()).query(({ ctx, input }) =>
    listTimeClockEntries360(ctx.auth.organizationId, {
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      status: input?.status,
      userId: input?.userId,
      startDate: input?.startDate,
      endDate: input?.endDate,
    }),
  ),

  getById: officeProcedure.input(z.object({ entryId: z.string() })).query(async ({ ctx, input }) => {
    const entry = await getTimeClockEntry360(ctx.auth.organizationId, input.entryId);
    if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' });
    return entry;
  }),

  create: officeProcedure.input(timeClockEntryInputSchema).mutation(({ ctx, input }) =>
    createTimeClockEntry360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  update: officeProcedure
    .input(z.object({ entryId: z.string(), data: updateTimeClockEntryInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const entry = await updateTimeClockEntry360(ctx.auth.organizationId, input.entryId, input.data, ctx.auth.userId);
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' });
      return entry;
    }),

  clockIn: officeProcedure.input(clockInInputSchema).mutation(({ ctx, input }) =>
    clockIn360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  clockOut: officeProcedure
    .input(z.object({ entryId: z.string(), endLocation: z.string().optional(), breakMinutes: z.number().int().min(0).optional() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await clockOut360(
        ctx.auth.organizationId,
        input.entryId,
        { endLocation: input.endLocation, breakMinutes: input.breakMinutes },
        ctx.auth.userId,
      );
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' });
      return entry;
    }),

  approve: officeProcedure.input(z.object({ entryId: z.string() })).mutation(async ({ ctx, input }) => {
    const entry = await approveTimeClockEntry360(ctx.auth.organizationId, input.entryId, ctx.auth.userId);
    if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' });
    return entry;
  }),
});
