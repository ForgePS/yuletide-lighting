import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getReviewsDashboard,
  listReviewRequests360,
  sendReviewRequest360,
  triggerReviewRequestForJob,
  getPublicReviewByToken,
  submitReviewFeedback,
  listReferrals,
  createReferralCode,
  redeemReferralCode,
  markReferralRewarded,
} from '@yuletide/firebase';
import {
  sendReviewRequestSchema,
  submitReviewFeedbackSchema,
  createReferralSchema,
  redeemReferralSchema,
} from '@clcrm/validators';
import { router, officeProcedure, publicProcedure } from '../trpc';

export const reviews360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getReviewsDashboard(ctx.auth.organizationId)),

  requests: router({
    list: officeProcedure.query(({ ctx }) => listReviewRequests360(ctx.auth.organizationId)),
    send: officeProcedure.input(sendReviewRequestSchema).mutation(async ({ ctx, input }) => {
      const result = await sendReviewRequest360(
        ctx.auth.organizationId,
        {
          customerId: input.customerId,
          jobId: input.jobId,
          channel: input.channel,
          platform: input.platform,
        },
        ctx.auth.userId,
      );
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
      return result;
    }),
    triggerForJob: officeProcedure
      .input(z.object({ jobId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const result = await triggerReviewRequestForJob(
          ctx.auth.organizationId,
          input.jobId,
          ctx.auth.userId,
        );
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job or customer not found' });
        return result;
      }),
  }),

  referrals: router({
    list: officeProcedure
      .input(z.object({ customerId: z.string().optional() }).optional())
      .query(({ ctx, input }) => listReferrals(ctx.auth.organizationId, input?.customerId)),
    create: officeProcedure.input(createReferralSchema).mutation(async ({ ctx, input }) => {
      const result = await createReferralCode(
        ctx.auth.organizationId,
        input.customerId,
        input.rewardAmountCents,
        input.notes ?? null,
        ctx.auth.userId,
      );
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
      return result;
    }),
    redeem: officeProcedure.input(redeemReferralSchema).mutation(async ({ ctx, input }) => {
      const result = await redeemReferralCode(
        ctx.auth.organizationId,
        input.code,
        input.referredCustomerId,
        ctx.auth.userId,
      );
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral code not found or already used' });
      return result;
    }),
    markRewarded: officeProcedure
      .input(z.object({ referralId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const result = await markReferralRewarded(
          ctx.auth.organizationId,
          input.referralId,
          ctx.auth.userId,
        );
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Referral not found or not eligible' });
        return result;
      }),
  }),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: z.string().min(8) })).query(async ({ input }) => {
      const ctx = await getPublicReviewByToken(input.token);
      if (!ctx) throw new TRPCError({ code: 'NOT_FOUND', message: 'Review link not found' });
      return ctx;
    }),
    submitFeedback: publicProcedure.input(submitReviewFeedbackSchema).mutation(async ({ input }) => {
      const result = await submitReviewFeedback(input.token, input.rating, input.feedback ?? null);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Review link not found' });
      return result;
    }),
  }),
});
