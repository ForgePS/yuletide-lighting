import { z } from 'zod';
import {
  dismissTourProgress,
  listTourProgress,
  saveTourProgress,
} from '@yuletide/firebase';
import { router, protectedProcedure } from '../trpc';

const tourProgressModeSchema = z.enum(['guided', 'autoplay', 'self-guided', 'onboarding']);
const tourProgressStatusSchema = z.enum(['not-started', 'in-progress', 'completed', 'dismissed']);

const saveTourProgressSchema = z.object({
  tourId: z.string().min(1),
  tourVersion: z.number().int().positive(),
  status: tourProgressStatusSchema,
  currentStep: z.number().int().min(0),
  mode: tourProgressModeSchema,
});

export const tours360Router = router({
  list: protectedProcedure.query(({ ctx }) => listTourProgress(ctx.auth.userId)),

  save: protectedProcedure.input(saveTourProgressSchema).mutation(({ ctx, input }) =>
    saveTourProgress(ctx.auth.userId, input),
  ),

  dismiss: protectedProcedure
    .input(z.object({ tourId: z.string().min(1) }))
    .mutation(({ ctx, input }) => dismissTourProgress(ctx.auth.userId, input.tourId)),
});
