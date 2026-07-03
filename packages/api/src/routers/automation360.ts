import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getAutomationDashboard,
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule360,
  toggleAutomationRule,
  listAutomationRuns,
  fireAutomationTrigger,
} from '@yuletide/firebase';
import { createAutomationRuleSchema, updateAutomationRuleSchema, automation360TriggerSchema } from '@clcrm/validators';
import { router, officeProcedure, adminProcedure } from '../trpc';

export const automation360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getAutomationDashboard(ctx.auth.organizationId)),

  rules: router({
    list: officeProcedure.query(({ ctx }) => listAutomationRules(ctx.auth.organizationId)),
    create: adminProcedure.input(createAutomationRuleSchema).mutation(({ ctx, input }) =>
      createAutomationRule(
        ctx.auth.organizationId,
        {
          name: input.name,
          trigger: input.trigger,
          description: input.description ?? null,
          conditions: input.conditions,
          actions: input.actions,
          active: input.active,
        },
        ctx.auth.userId,
      ),
    ),
    update: adminProcedure.input(updateAutomationRuleSchema).mutation(async ({ ctx, input }) => {
      const { ruleId, ...data } = input;
      const result = await updateAutomationRule360(ctx.auth.organizationId, ruleId, data, ctx.auth.userId);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
      return result;
    }),
    toggle: adminProcedure
      .input(z.object({ ruleId: z.string().min(1), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const result = await toggleAutomationRule(
          ctx.auth.organizationId,
          input.ruleId,
          input.active,
          ctx.auth.userId,
        );
        if (!result) throw new TRPCError({ code: 'NOT_FOUND' });
        return result;
      }),
  }),

  runs: router({
    list: officeProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
      .query(({ ctx, input }) => listAutomationRuns(ctx.auth.organizationId, input?.limit ?? 50)),
  }),

  testTrigger: adminProcedure
    .input(
      z.object({
        trigger: automation360TriggerSchema,
        customerId: z.string().min(1),
        vars: z.record(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      fireAutomationTrigger(
        ctx.auth.organizationId,
        input.trigger,
        { customerId: input.customerId, vars: input.vars },
        ctx.auth.userId,
      ),
    ),
});
