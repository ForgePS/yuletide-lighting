import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getPortalDashboard,
  submitPortalServiceRequest,
  submitPortalRebookRequest,
  enableCustomerPortal,
  getPortalRebookInfo,
  submitPortalMessage,
} from '@yuletide/firebase';
import { router, officeProcedure, publicProcedure } from '../trpc';

export const portal360Router = router({
  public: router({
    dashboard: publicProcedure.input(z.object({ token: z.string().min(8) })).query(async ({ input }) => {
      const data = await getPortalDashboard(input.token);
      if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal access not found or disabled.' });
      return data;
    }),

    submitServiceRequest: publicProcedure
      .input(
        z.object({
          token: z.string().min(8),
          title: z.string().min(1).max(200),
          description: z.string().max(5000).optional(),
          category: z.string().optional(),
          propertyId: z.string().optional(),
        }),
      )
      .mutation(({ input }) =>
        submitPortalServiceRequest(input.token, {
          title: input.title,
          description: input.description,
          category: input.category,
          propertyId: input.propertyId,
        }),
      ),

    submitRebook: publicProcedure
      .input(
        z.object({
          token: z.string().min(8),
          notes: z.string().max(2000).optional(),
          preferredMonth: z.string().max(40).optional(),
          sameDesign: z.boolean().optional(),
          upgradeRequested: z.boolean().optional(),
        }),
      )
      .mutation(({ input }) =>
        submitPortalRebookRequest(input.token, {
          notes: input.notes,
          preferredMonth: input.preferredMonth,
          sameDesign: input.sameDesign,
          upgradeRequested: input.upgradeRequested,
        }),
      ),

    rebookInfo: publicProcedure.input(z.object({ token: z.string().min(8) })).query(({ input }) =>
      getPortalRebookInfo(input.token),
    ),

    sendMessage: publicProcedure.input(z.object({ token: z.string().min(8), body: z.string().min(1).max(5000) })).mutation(({ input }) =>
      submitPortalMessage(input.token, input.body),
    ),
  }),

  enable: officeProcedure.input(z.object({ customerId: z.string().min(1) })).mutation(({ ctx, input }) =>
    enableCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
  ),
});
