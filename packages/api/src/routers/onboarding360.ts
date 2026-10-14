import { z } from 'zod';
import {
  completeOnboarding,
  dismissOnboarding,
  getOnboardingState,
  reopenOnboarding,
  skipOnboardingStep,
  updateOnboardingStep,
} from '@yuletide/firebase';
import { COMPANY_SETUP_STEP_IDS } from '@clcrm/types';
import { router, permissionProcedure } from '../trpc';

const onboardingStepSchema = z.enum(COMPANY_SETUP_STEP_IDS);

export const onboarding360Router = router({
  state: permissionProcedure('settings', 'view').query(({ ctx }) =>
    getOnboardingState(ctx.auth.organizationId),
  ),

  updateStep: permissionProcedure('settings', 'edit')
    .input(z.object({ step: onboardingStepSchema }))
    .mutation(({ ctx, input }) => updateOnboardingStep(ctx.auth.organizationId, input.step)),

  skipStep: permissionProcedure('settings', 'edit')
    .input(z.object({ step: onboardingStepSchema }))
    .mutation(({ ctx, input }) => skipOnboardingStep(ctx.auth.organizationId, input.step)),

  dismiss: permissionProcedure('settings', 'edit').mutation(({ ctx }) =>
    dismissOnboarding(ctx.auth.organizationId),
  ),

  reopen: permissionProcedure('settings', 'edit').mutation(({ ctx }) =>
    reopenOnboarding(ctx.auth.organizationId),
  ),

  complete: permissionProcedure('settings', 'edit').mutation(({ ctx }) =>
    completeOnboarding(ctx.auth.organizationId),
  ),
});
