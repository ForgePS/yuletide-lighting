import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { UserRole } from '@clcrm/validators';
import type { PermissionAction, PermissionMatrix, PermissionResource, SettingsRole } from '@clcrm/types';
import { hasPermission } from '@clcrm/types';

export type AuthContext = {
  organizationId: string;
  firebaseUid: string;
  userId: string;
  role: UserRole;
  settingsRole: SettingsRole;
  permissions: PermissionMatrix;
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
  if (ctx.auth.settingsRole === 'read_only') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Read-only role cannot perform admin actions' });
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

/** Capability-based gate using the settings permission matrix. */
export function requirePermission(resource: PermissionResource, action: PermissionAction) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.auth) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    if (ctx.auth.subscriptionLocked) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'SUBSCRIPTION_LOCKED' });
    }
    if (ctx.auth.settingsRole === 'read_only' && action !== 'view' && action !== 'export') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Read-only role cannot modify records' });
    }
    if (!hasPermission(ctx.auth.permissions, resource, action)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${resource}.${action}`,
      });
    }
    return next({ ctx: { ...ctx, auth: ctx.auth } });
  });
}

export const permissionProcedure = (resource: PermissionResource, action: PermissionAction) =>
  protectedProcedure.use(requirePermission(resource, action));

/** Gate a procedure behind an organization enabled module (Creator entitlements). */
export function requireModule(moduleKey: string) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.auth) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    try {
      const { getOrganization } = await import('@yuletide/firebase');
      const org = await getOrganization(ctx.auth.organizationId);
      const enabled = org?.enabledModules;
      if (Array.isArray(enabled) && enabled.length > 0 && !enabled.includes(moduleKey)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Module not enabled for this organization: ${moduleKey}`,
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      // If org lookup fails, allow through (fail open for ops resilience)
    }
    return next({ ctx: { ...ctx, auth: ctx.auth } });
  });
}

export const moduleProcedure = (moduleKey: string) => protectedProcedure.use(requireModule(moduleKey));
