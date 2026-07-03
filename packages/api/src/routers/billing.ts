import { TRPCError } from '@trpc/server';
import { router, authProcedure } from '../trpc';
import { getOrganization } from '@yuletide/firebase';
import { getOrgSubscriptionState, listSubscriptionPayments } from '@yuletide/firebase';

export const billingRouter = router({
  status: authProcedure.query(async ({ ctx }) => {
    const org = await getOrganization(ctx.auth.organizationId);
    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }
    return getOrgSubscriptionState(org);
  }),

  payments: authProcedure.query(({ ctx }) => {
    if (!['owner', 'admin'].includes(ctx.auth.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    return listSubscriptionPayments(ctx.auth.organizationId);
  }),
});
