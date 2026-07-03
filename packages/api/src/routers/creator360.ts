import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  applyCreatorSubscriptionPreset,
  extendCreatorOrganizationTrial,
  getCreatorDashboard,
  getCreatorOrganizationDetail,
  getCreatorOrgModules,
  getPlatformSettings,
  listCreatorOrganizations,
  listCreatorRecentPayments,
  listCreatorSubscriptions,
  listCreatorUsers,
  listPlatformAuditLogs,
  listPlatformCreatorAccounts,
  lockCreatorOrganization,
  provisionCreatorOrganization,
  runCreatorHealthChecks,
  unlockCreatorOrganization,
  updateCreatorOrganizationSubscription,
  updateCreatorOrgModules,
  updatePlatformSettings,
} from '@yuletide/firebase';
import {
  creatorExtendTrialSchema,
  creatorOrgListSchema,
  creatorOrgModulesSchema,
  creatorProvisionOrgSchema,
  creatorSubscriptionListSchema,
  creatorSubscriptionPresetSchema,
  creatorUpdateOrgSubscriptionSchema,
  creatorUserListSchema,
  platformSettingsSchema,
} from '@clcrm/validators';
import { router, creatorProcedure, authProcedure } from '../trpc';

export const creator360Router = router({
  checkAccess: authProcedure.query(({ ctx }) => ({ allowed: ctx.auth.isPlatformCreator })),

  dashboard: creatorProcedure.query(() => getCreatorDashboard()),

  subscriptions: router({
    list: creatorProcedure.input(creatorSubscriptionListSchema).query(({ input }) => listCreatorSubscriptions(input)),
    applyPreset: creatorProcedure.input(creatorSubscriptionPresetSchema).mutation(({ ctx, input }) =>
      applyCreatorSubscriptionPreset(input, { userId: ctx.auth.userId, email: ctx.auth.email }),
    ),
  }),

  organizations: router({
    list: creatorProcedure.input(creatorOrgListSchema).query(({ input }) => listCreatorOrganizations(input)),
    get: creatorProcedure.input(z.object({ organizationId: z.string().min(1) })).query(async ({ input }) => {
      const org = await getCreatorOrganizationDetail(input.organizationId);
      if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
      return org;
    }),
    updateSubscription: creatorProcedure.input(creatorUpdateOrgSubscriptionSchema).mutation(({ ctx, input }) => {
      const { organizationId, note, ...fields } = input;
      return updateCreatorOrganizationSubscription({ organizationId, ...fields, note }, {
        userId: ctx.auth.userId,
        email: ctx.auth.email,
      });
    }),
    extendTrial: creatorProcedure.input(creatorExtendTrialSchema).mutation(({ ctx, input }) =>
      extendCreatorOrganizationTrial(input, { userId: ctx.auth.userId, email: ctx.auth.email }),
    ),
    lock: creatorProcedure.input(z.object({ organizationId: z.string().min(1), note: z.string().optional() })).mutation(({ ctx, input }) =>
      lockCreatorOrganization(input.organizationId, { userId: ctx.auth.userId, email: ctx.auth.email }, input.note),
    ),
    unlock: creatorProcedure.input(z.object({ organizationId: z.string().min(1), note: z.string().optional() })).mutation(({ ctx, input }) =>
      unlockCreatorOrganization(input.organizationId, { userId: ctx.auth.userId, email: ctx.auth.email }, input.note),
    ),
  }),

  users: router({
    list: creatorProcedure.input(creatorUserListSchema).query(({ input }) => listCreatorUsers(input)),
  }),

  billing: router({
    recentPayments: creatorProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional()).query(({ input }) =>
      listCreatorRecentPayments(input?.limit ?? 40),
    ),
  }),

  audit: router({
    list: creatorProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional()).query(({ input }) =>
      listPlatformAuditLogs(input?.limit ?? 50),
    ),
  }),

  settings: router({
    get: creatorProcedure.query(() => getPlatformSettings()),
    update: creatorProcedure.input(platformSettingsSchema).mutation(({ ctx, input }) =>
      updatePlatformSettings({
        ...input,
        platformLogoUrl: input.platformLogoUrl ?? null,
        marketingUrl: input.marketingUrl ?? null,
        hostingUrl: input.hostingUrl ?? null,
        docsUrl: input.docsUrl ?? null,
        announcementBanner: input.announcementBanner ?? null,
      }, { userId: ctx.auth.userId, email: ctx.auth.email }),
    ),
  }),

  modules: router({
    get: creatorProcedure.input(z.object({ organizationId: z.string().min(1) })).query(async ({ input }) => {
      const modules = await getCreatorOrgModules(input.organizationId);
      if (!modules) throw new TRPCError({ code: 'NOT_FOUND' });
      return modules;
    }),
    update: creatorProcedure.input(creatorOrgModulesSchema).mutation(({ ctx, input }) =>
      updateCreatorOrgModules(input, { userId: ctx.auth.userId, email: ctx.auth.email }),
    ),
  }),

  provision: creatorProcedure.input(creatorProvisionOrgSchema).mutation(({ ctx, input }) =>
    provisionCreatorOrganization(input, { userId: ctx.auth.userId, email: ctx.auth.email }),
  ),

  operations: router({
    healthChecks: creatorProcedure.query(() => runCreatorHealthChecks()),
    creators: creatorProcedure.query(() => listPlatformCreatorAccounts()),
  }),
});
