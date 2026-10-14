import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { UserRole } from '@clcrm/validators';
import type {
  PermissionAction,
  PermissionMatrix,
  PermissionResource,
  SettingsRole,
} from '@clcrm/types';
import { hasPermission, hasAdminCapability, hasOfficeCapability } from '@clcrm/types';

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
  /** Server-derived from organization record — do not trust client flags alone. */
  isDemoTenant: boolean;
};

export type Context = {
  auth: AuthContext | null;
  /**
   * Raw `__portal_session` cookie value (portal-only).
   * Never used as staff auth. Prefer over magic token when present (P2-S2).
   */
  portalSessionToken?: string | null;
  ip?: string | null;
  userAgent?: string | null;
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
  // Portal session cookie must never satisfy staff CRM procedures.
  if (ctx.auth.subscriptionLocked) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'SUBSCRIPTION_LOCKED' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/**
 * Public portal procedures: staff `__session` auth is ignored for authorization.
 * Scope comes from magic token and/or `__portal_session` only (P2-S2).
 */
export const portalPublicProcedure = t.procedure.use(({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      auth: null,
      portalSessionToken: ctx.portalSessionToken ?? null,
    },
  });
});

/** Authenticated but allowed when subscription is locked (billing pages). */
export const authProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // YL-S3 capability (settings.edit). Prefer permissionProcedure('settings', 'edit') for new code (YL-S5).
  if (!hasAdminCapability(ctx.auth)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const officeProcedure = protectedProcedure.use(({ ctx, next }) => {
  // YL-S3 desk capability. Prefer resource-scoped permissionProcedure (YL-S5 / BACKLOG-012).
  if (!hasOfficeCapability(ctx.auth)) {
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

/**
 * Gate a procedure behind an organization enabled module (Creator entitlements).
 * Fail closed: missing org, missing config, empty entitlements, unknown/disabled module → FORBIDDEN.
 */
export function requireModule(moduleKey: string) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.auth) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    if (!ctx.auth.organizationId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'MODULE_NOT_ENABLED: missing organization context',
      });
    }

    const { getOrganization, evaluateModuleEntitlement } = await import('@yuletide/firebase');
    let org: Awaited<ReturnType<typeof getOrganization>>;
    try {
      org = await getOrganization(ctx.auth.organizationId);
    } catch {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'MODULE_NOT_ENABLED: organization lookup failed',
      });
    }

    const gate = evaluateModuleEntitlement(org, moduleKey);
    if (!gate.allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `MODULE_NOT_ENABLED: ${gate.reason}`,
      });
    }

    return next({ ctx: { ...ctx, auth: ctx.auth } });
  });
}

export const moduleProcedure = (moduleKey: string) =>
  protectedProcedure.use(requireModule(moduleKey));
