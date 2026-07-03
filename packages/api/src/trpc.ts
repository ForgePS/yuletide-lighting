import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { UserRole } from '@clcrm/validators';

export type AuthContext = {
  organizationId: string;
  firebaseUid: string;
  userId: string;
  role: UserRole;
  email: string;
  subscriptionLocked: boolean;
  isPlatformCreator: boolean;
};

export type Context = {
  auth: AuthContext | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  if (ctx.auth.subscriptionLocked) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'SUBSCRIPTION_LOCKED' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/** Authenticated but allowed when subscription is locked (billing pages). */
export const authProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['owner', 'admin'].includes(ctx.auth.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const officeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['owner', 'admin', 'office'].includes(ctx.auth.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Office access required' });
  }
  return next({ ctx });
});

/** Platform creator console — bypasses subscription lock. */
export const creatorProcedure = authProcedure.use(({ ctx, next }) => {
  if (!ctx.auth.isPlatformCreator) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Creator console access required' });
  }
  return next({ ctx });
});
