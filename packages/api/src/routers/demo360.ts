import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, permissionProcedure } from '../trpc';
import {
  getOrganization,
  getDemoTourFixtures,
  kickoffDemoTenantSeed,
  isDemoOrganization,
  resetYuletideDemoTenant,
  seedYuletideDemoTenant,
} from '@yuletide/firebase';

export const demo360Router = router({
  context: protectedProcedure.query(async ({ ctx }) => {
    const org = await getOrganization(ctx.auth.organizationId);
    const isDemoTenant = isDemoOrganization(org);
    if (isDemoTenant) {
      kickoffDemoTenantSeed(ctx.auth.organizationId, ctx.auth.userId);
    }
    return {
      isDemoTenant,
      isDemoMode: isDemoTenant,
      companyName: org?.companyName ?? null,
      slug: org?.slug ?? null,
    };
  }),

  fixtures: protectedProcedure.query(async ({ ctx }) => {
    const org = await getOrganization(ctx.auth.organizationId);
    if (!isDemoOrganization(org)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Demo fixtures are only available in the demo tenant' });
    }
    try {
      return await getDemoTourFixtures(ctx.auth.organizationId);
    } catch (err) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: err instanceof Error ? err.message : 'Demo fixtures unavailable',
      });
    }
  }),

  seed: permissionProcedure('settings', 'edit').mutation(async ({ ctx }) => {
    try {
      return await seedYuletideDemoTenant(ctx.auth.organizationId, ctx.auth.userId);
    } catch (err) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: err instanceof Error ? err.message : 'Demo seed failed',
      });
    }
  }),

  reset: permissionProcedure('settings', 'edit').mutation(async ({ ctx }) => {
    try {
      return await resetYuletideDemoTenant(ctx.auth.organizationId, ctx.auth.userId);
    } catch (err) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: err instanceof Error ? err.message : 'Demo reset failed',
      });
    }
  }),
});
