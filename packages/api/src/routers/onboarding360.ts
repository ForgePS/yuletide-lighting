import { z } from 'zod';
import {
  getOnboardingState,
  updateOnboardingStep,
  completeOnboarding,
} from '@yuletide/firebase';
import { router, permissionProcedure } from '../trpc';

const onboardingStepSchema = z.enum([
  'company',
  'season',
  'products',
  'invite_team',
  'payments',
  'complete',
]);

export const onboarding360Router = router({
  state: permissionProcedure('settings', 'view').query(({ ctx }) =>
    getOnboardingState(ctx.auth.organizationId),
  ),

  updateStep: permissionProcedure('customers', 'edit')
    .input(z.object({ step: onboardingStepSchema }))
    .mutation(({ ctx, input }) => updateOnboardingStep(ctx.auth.organizationId, input.step)),

  complete: permissionProcedure('customers', 'edit').mutation(({ ctx }) =>
    completeOnboarding(ctx.auth.organizationId),
  ),
});
