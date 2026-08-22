import { z } from 'zod';
import { crmUiConfigUpdateSchema } from '@clcrm/validators';
import { getCrmUiConfig, getResolvedCrmNav, updateCrmUiConfig } from '@yuletide/firebase';
import { router, permissionProcedure, protectedProcedure } from '../trpc';

export const crmUiConfigRouter = router({
  get: permissionProcedure('settings', 'view').query(({ ctx }) => getCrmUiConfig(ctx.auth.organizationId)),

  /** YL-S18: any authenticated staff — fail-closed module/permission filtered nav. */
  resolvedNav: protectedProcedure.query(({ ctx }) =>
    getResolvedCrmNav(ctx.auth.organizationId, ctx.auth.permissions),
  ),

  update: permissionProcedure('settings', 'edit')
    .input(crmUiConfigUpdateSchema)
    .mutation(({ ctx, input }) =>
      updateCrmUiConfig(ctx.auth.organizationId, {
        navItems: input.navItems as Awaited<ReturnType<typeof getCrmUiConfig>>['navItems'],
        labelOverrides: input.labelOverrides,
        theme: input.theme,
        customFields: input.customFields,
      }),
    ),

  upsertCustomField: permissionProcedure('settings', 'edit')
    .input(crmUiConfigUpdateSchema.shape.customFields.element)
    .mutation(async ({ ctx, input }) => {
      const current = await getCrmUiConfig(ctx.auth.organizationId);
      const idx = current.customFields.findIndex((f) => f.id === input.id);
      const customFields = [...current.customFields];
      if (idx >= 0) customFields[idx] = input;
      else customFields.push(input);
      return updateCrmUiConfig(ctx.auth.organizationId, {
        ...current,
        customFields,
      });
    }),

  deleteCustomField: permissionProcedure('settings', 'edit')
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const current = await getCrmUiConfig(ctx.auth.organizationId);
      return updateCrmUiConfig(ctx.auth.organizationId, {
        ...current,
        customFields: current.customFields.filter((f) => f.id !== input.id),
      });
    }),
});
