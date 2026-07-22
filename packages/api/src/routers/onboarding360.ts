import { z } from 'zod';
import {
  getOnboardingState,
  updateOnboardingStep,
  completeOnboarding,
} from '@yuletide/firebase';
import { router, officeProcedure } from '../trpc';

const onboardingStepSchema = z.enum([
  'company',
  'season',
  'products',
  'invite_team',
  'payments',
  'complete',
]);

export const onboarding360Router = router({
  state: officeProcedure.query(({ ctx }) => getOnboardingState(ctx.auth.organizationId)),

  updateStep: officeProcedure
    .input(z.object({ step: onboardingStepSchema }))
    .mutation(({ ctx, input }) => updateOnboardingStep(ctx.auth.organizationId, input.step)),

  complete: officeProcedure.mutation(({ ctx }) => completeOnboarding(ctx.auth.organizationId)),
});
