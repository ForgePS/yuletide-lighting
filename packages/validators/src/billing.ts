import { z } from 'zod';

export const subscriptionPlanSchema = z.enum(['monthly', 'yearly']);

export const checkoutPlanSchema = z.object({
  plan: subscriptionPlanSchema,
  promoCode: z.string().trim().min(1).max(50).optional().or(z.literal('')),
});

export const validatePromoCodeSchema = z.object({
  code: z.string().trim().min(1).max(50),
  plan: subscriptionPlanSchema.optional(),
});

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes, or underscores only'),
  percentOff: z.number().min(1).max(100).optional(),
  amountOffCents: z.number().int().min(50).optional(),
  duration: z.enum(['once', 'repeating', 'forever']).default('once'),
  durationInMonths: z.number().int().min(1).max(36).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional(),
  description: z.string().max(200).optional(),
}).refine((data) => data.percentOff || data.amountOffCents, {
  message: 'Set either percent off or amount off',
});
