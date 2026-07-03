import { z } from 'zod';

export const reviewRequest360StatusSchema = z.enum([
  'pending',
  'sent',
  'clicked',
  'submitted',
  'internal_feedback',
]);

export const referralStatusSchema = z.enum(['issued', 'used', 'rewarded', 'expired']);

export const sendReviewRequestSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().min(1).optional(),
  channel: z.enum(['sms', 'email']).default('sms'),
  platform: z.enum(['google', 'facebook']).default('google'),
});

export const submitReviewFeedbackSchema = z.object({
  token: z.string().min(8),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional().or(z.literal('')),
});

export const createReferralSchema = z.object({
  customerId: z.string().min(1),
  rewardAmountCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const redeemReferralSchema = z.object({
  code: z.string().min(4).max(20),
  referredCustomerId: z.string().min(1),
});
