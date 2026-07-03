import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getCrewMySchedule,
  getCrewMobileJobDetail,
  crewClockIn,
  crewClockOut,
  crewStartJob,
  crewCompleteJob,
  crewUploadPhoto,
  crewReportIssue,
  crewRecordCustomerNotHome,
  crewSubmitSignature,
  getCrewDashboard,
  listCrewJobsForOffice,
  listJobActivity,
} from '@yuletide/firebase';
import {
  crewClockInSchema,
  crewPhotoUploadSchema,
  crewIssueReportSchema,
  crewCustomerNotHomeSchema,
  crewSignatureSchema,
  crewScheduleQuerySchema,
} from '@clcrm/validators';
import { router, protectedProcedure, officeProcedure } from '../trpc';
import { colUpdate } from '@yuletide/firebase';

export const crew360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getCrewDashboard(ctx.auth.organizationId)),

  jobs: router({
    today: officeProcedure.input(crewScheduleQuerySchema.optional()).query(({ ctx, input }) =>
      listCrewJobsForOffice(ctx.auth.organizationId, input?.date ? new Date(input.date) : undefined),
    ),
    activity: officeProcedure.input(z.object({ jobId: z.string().min(1) })).query(({ ctx, input }) =>
      listJobActivity(ctx.auth.organizationId, input.jobId),
    ),
    detail: officeProcedure.input(z.object({ jobId: z.string().min(1) })).query(async ({ ctx, input }) => {
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

  getJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).query(({ ctx, input }) =>
    getCrewMobileJobDetail(ctx.auth.organizationId, input.jobId, ctx.auth.userId),
  ),

  clockIn: protectedProcedure.input(crewClockInSchema).mutation(({ ctx, input }) =>
    crewClockIn(
      ctx.auth.organizationId,
      ctx.auth.userId,
      ctx.auth.email,
      {
        jobId: input.jobId,
        clockIn: new Date(input.clockIn),
        latitude: input.latitude,
        longitude: input.longitude,
      },
    ),
  ),

  clockOut: protectedProcedure.input(z.object({ entryId: z.string().min(1) })).mutation(({ ctx, input }) =>
    crewClockOut(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.entryId),
  ),

  startJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).mutation(({ ctx, input }) =>
    crewStartJob(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId),
  ),

  completeJob: protectedProcedure.input(z.object({ jobId: z.string().min(1) })).mutation(({ ctx, input }) =>
    crewCompleteJob(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId),
  ),

  uploadPhoto: protectedProcedure.input(crewPhotoUploadSchema).mutation(({ ctx, input }) =>
    crewUploadPhoto(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
  ),

  reportIssue: protectedProcedure.input(crewIssueReportSchema).mutation(({ ctx, input }) =>
    crewReportIssue(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
  ),

  customerNotHome: protectedProcedure.input(crewCustomerNotHomeSchema).mutation(({ ctx, input }) =>
    crewRecordCustomerNotHome(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input.jobId, input.notes),
  ),

  submitSignature: protectedProcedure.input(crewSignatureSchema).mutation(({ ctx, input }) =>
    crewSubmitSignature(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email, input),
  ),

  updatePushToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ ctx, input }) =>
      colUpdate('users', 'users', ctx.auth.userId, { pushToken: input.token }).catch(() =>
        colUpdate(ctx.auth.organizationId, 'users', ctx.auth.userId, { pushToken: input.token }),
      ),
    ),
});
