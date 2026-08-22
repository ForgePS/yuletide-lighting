import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getCrewMySchedule,
  getCrewMobileJobDetail,
  crewClockIn,
  crewClockOut,
  getCrewActiveClockIn,
  crewStartJob,
  crewCompleteJob,
  crewUploadPhoto,
  crewReportIssue,
  crewRecordCustomerNotHome,
  crewRecordMaterialUsage,
  crewSubmitSignature,
  getCrewDashboard,
  listCrewJobsForOffice,
  listJobActivity,
  assertCrewAssignedToJob,
} from '@yuletide/firebase';
import {
  crewClockInSchema,
  crewPhotoUploadSchema,
  crewIssueReportSchema,
  crewCustomerNotHomeSchema,
  crewMaterialUsageSchema,
  crewSignatureSchema,
  crewScheduleQuerySchema,
} from '@clcrm/validators';
import { router, protectedProcedure, permissionProcedure } from '../trpc';
import { colUpdate } from '@yuletide/firebase';

function mapCrewFieldError(err: unknown): never {
  const message = err instanceof Error ? err.message : 'Crew operation failed';
  if (message === 'Job not found' || message === 'Time entry not found') {
    throw new TRPCError({ code: 'NOT_FOUND', message });
  }
  if (message === 'Not assigned to this job') {
    throw new TRPCError({ code: 'FORBIDDEN', message });
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
}

async function runCrewMutation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    mapCrewFieldError(err);
  }
}

export const crew360Router = router({
  dashboard: permissionProcedure('jobs', 'view').query(({ ctx }) =>
    getCrewDashboard(ctx.auth.organizationId),
  ),

  jobs: router({
    today: permissionProcedure('jobs', 'view')
      .input(crewScheduleQuerySchema.optional())
      .query(({ ctx, input }) =>
        listCrewJobsForOffice(ctx.auth.organizationId, input?.date ? new Date(input.date) : undefined),
      ),
    activity: permissionProcedure('jobs', 'view')
      .input(z.object({ jobId: z.string().min(1) }))
      .query(({ ctx, input }) => listJobActivity(ctx.auth.organizationId, input.jobId)),
    detail: permissionProcedure('jobs', 'view')
      .input(z.object({ jobId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const detail = await getCrewMobileJobDetail(ctx.auth.organizationId, input.jobId, ctx.auth.userId);
        if (!detail) throw new TRPCError({ code: 'NOT_FOUND' });
        return detail;
      }),
  }),
});

/** Mobile-compatible crew router (procedure path: crew.*) */
export const crewMobileRouter = router({
  mySchedule: protectedProcedure.input(crewScheduleQuerySchema.optional()).query(({ ctx, input }) =>
    getCrewMySchedule(
      ctx.auth.organizationId,
      ctx.auth.userId,
      input?.date ? new Date(input.date) : undefined,
    ),
  ),

  getJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).query(async ({ ctx, input }) => {
    await runCrewMutation(() =>
      assertCrewAssignedToJob(ctx.auth.organizationId, ctx.auth.userId, input.jobId),
    );
    return getCrewMobileJobDetail(ctx.auth.organizationId, input.jobId, ctx.auth.userId);
  }),

  clockIn: protectedProcedure.input(crewClockInSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewClockIn(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, {
        jobId: input.jobId,
        clockIn: new Date(input.clockIn),
        latitude: input.latitude,
        longitude: input.longitude,
      }),
    ),
  ),

  clockOut: protectedProcedure.input(z.object({ entryId: z.string().min(1) })).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewClockOut(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.entryId),
    ),
  ),

  getActiveClockIn: protectedProcedure.query(({ ctx }) =>
    getCrewActiveClockIn(ctx.auth.organizationId, ctx.auth.userId),
  ),

  startJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewStartJob(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId),
    ),
  ),

  completeJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewCompleteJob(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId),
    ),
  ),

  uploadPhoto: protectedProcedure.input(crewPhotoUploadSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewUploadPhoto(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
    ),
  ),

  reportIssue: protectedProcedure.input(crewIssueReportSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewReportIssue(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
    ),
  ),

  customerNotHome: protectedProcedure.input(crewCustomerNotHomeSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewRecordCustomerNotHome(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId, input.notes),
    ),
  ),

  recordMaterialUsage: protectedProcedure.input(crewMaterialUsageSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewRecordMaterialUsage(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
    ),
  ),

  submitSignature: protectedProcedure.input(crewSignatureSchema).mutation(({ ctx, input }) =>
    runCrewMutation(() =>
      crewSubmitSignature(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
    ),
  ),

  updatePushToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ ctx, input }) =>
      colUpdate('users', 'users', ctx.auth.userId, { pushToken: input.token }).catch(() =>
        colUpdate(ctx.auth.organizationId, 'users', ctx.auth.userId, { pushToken: input.token }),
      ),
    ),
});
