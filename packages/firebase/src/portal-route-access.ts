/**
 * Portal Phase 2 S5 — canonical route authorization.
 * Composes P2-S2 session + P2-S1 permissions + P2-S4 ownership. Fail closed.
 * ENVIRONMENT=EMULATOR for automated evidence.
 */
import type { PortalAction, PortalFeatureKey } from '@clcrm/types';
import {
  asPortalAuth,
  requirePortalAuthorized,
  PortalAccessDeniedError,
  PortalActionNotPermittedError,
  PortalFeatureNotEnabledError,
  type PortalAuthInput,
  type PortalAuthorizedContext,
} from './portal360';
import {
  getPortalResourceScope,
  requirePortalOwnedRecord,
  PortalResourceNotFoundError,
} from './portal-ownership';
import { colGet } from './firestore';
import { PORTAL_PUBLIC_MESSAGES } from './portal-security-config';

export type PortalRouteClass =
  | 'PUBLIC_ENTRY'
  | 'PORTAL_AUTHENTICATED'
  | 'PORTAL_FEATURE_PROTECTED'
  | 'PORTAL_RESOURCE_PROTECTED'
  | 'PORTAL_ADMINISTRATION';

export type PortalRouteDenialReason =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'PORTAL_UNAVAILABLE'
  | 'FEATURE_DISABLED'
  | 'ACTION_DENIED'
  | 'RESOURCE_NOT_FOUND';

export type PortalRouteAccess =
  | { allowed: true; authorized: PortalAuthorizedContext }
  | { allowed: false; reason: PortalRouteDenialReason; publicMessage: string };

export type PortalRouteDefinition = {
  /** Path suffix after /portal/[token]/ — '' for home. */
  segment: string;
  class: PortalRouteClass;
  feature?: PortalFeatureKey;
  action: PortalAction;
  resourceType?: string;
};

/** Canonical feature ↔ route matrix (P2-S5). Unknown segments fail closed. */
export const PORTAL_ROUTE_DEFINITIONS: PortalRouteDefinition[] = [
  { segment: '', class: 'PORTAL_AUTHENTICATED', feature: 'dashboard', action: 'view' },
  { segment: 'schedule', class: 'PORTAL_FEATURE_PROTECTED', feature: 'scheduling', action: 'view' },
  {
    segment: 'schedule-request',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'scheduling',
    action: 'request',
  },
  {
    segment: 'service-request',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'service_requests',
    action: 'view',
  },
  { segment: 'messages', class: 'PORTAL_FEATURE_PROTECTED', feature: 'messaging', action: 'view' },
  {
    segment: 'notifications',
    class: 'PORTAL_AUTHENTICATED',
    feature: 'dashboard',
    action: 'view',
  },
  { segment: 'contacts', class: 'PORTAL_AUTHENTICATED', feature: 'dashboard', action: 'view' },
  { segment: 'sign', class: 'PORTAL_FEATURE_PROTECTED', feature: 'e_sign', action: 'view' },
  { segment: 'billing', class: 'PORTAL_FEATURE_PROTECTED', feature: 'billing', action: 'view' },
  { segment: 'proposals', class: 'PORTAL_FEATURE_PROTECTED', feature: 'proposals', action: 'view' },
  {
    segment: 'agreements',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'agreements',
    action: 'view',
  },
  {
    segment: 'properties',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'properties',
    action: 'view',
  },
  { segment: 'mockups', class: 'PORTAL_FEATURE_PROTECTED', feature: 'mockups', action: 'view' },
  {
    segment: 'documents',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'documents',
    action: 'view',
  },
  {
    segment: 'jobs',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'install_tracking',
    action: 'view',
  },
  {
    segment: 'jobs/[jobId]',
    class: 'PORTAL_RESOURCE_PROTECTED',
    feature: 'install_tracking',
    action: 'view',
    resourceType: 'job',
  },
  { segment: 'takedowns', class: 'PORTAL_FEATURE_PROTECTED', feature: 'takedowns', action: 'view' },
  { segment: 'storage', class: 'PORTAL_FEATURE_PROTECTED', feature: 'storage', action: 'view' },
  {
    segment: 'consultations',
    class: 'PORTAL_FEATURE_PROTECTED',
    feature: 'consultations',
    action: 'view',
  },
  { segment: 'reviews', class: 'PORTAL_FEATURE_PROTECTED', feature: 'reviews', action: 'view' },
  { segment: 'rebook', class: 'PORTAL_FEATURE_PROTECTED', feature: 'rebooking', action: 'view' },
];

export const PORTAL_PUBLIC_ENTRY_ROUTES = [
  '/portal',
  '/portal/login',
  '/portal/access',
  '/portal/invite',
] as const;

export function resolvePortalRouteDefinition(pathname: string): PortalRouteDefinition | null {
  // /portal/login, /portal/access/x, /portal/invite/x — public
  if (
    pathname === '/portal' ||
    pathname === '/portal/login' ||
    pathname.startsWith('/portal/access/') ||
    pathname.startsWith('/portal/invite/')
  ) {
    return null; // public entry — caller should not require auth
  }

  // /portal/{token}/...
  const parts = pathname.split('/').filter(Boolean);
  // ['portal', token, ...rest]
  if (parts[0] !== 'portal' || parts.length < 2) return null;
  const rest = parts.slice(2);
  if (rest.length === 0) {
    return PORTAL_ROUTE_DEFINITIONS.find((d) => d.segment === '') ?? null;
  }
  if (rest[0] === 'jobs' && rest.length >= 2) {
    return PORTAL_ROUTE_DEFINITIONS.find((d) => d.segment === 'jobs/[jobId]') ?? null;
  }
  const segment = rest[0]!;
  return PORTAL_ROUTE_DEFINITIONS.find((d) => d.segment === segment) ?? null;
}

function publicMessageFor(reason: PortalRouteDenialReason): string {
  switch (reason) {
    case 'AUTH_REQUIRED':
    case 'SESSION_EXPIRED':
      return 'Your portal session has expired. Please verify your access again.';
    case 'FEATURE_DISABLED':
    case 'ACTION_DENIED':
      return 'This portal section is not available.';
    case 'RESOURCE_NOT_FOUND':
      return 'The requested item could not be found.';
    case 'PORTAL_UNAVAILABLE':
    default:
      return PORTAL_PUBLIC_MESSAGES.accessUnavailable;
  }
}

/**
 * Canonical portal route authorization (P2-S5).
 * Never trusts client-supplied organizationId/customerId/role.
 */
export async function requirePortalRouteAccess(args: {
  auth: string | PortalAuthInput;
  feature?: PortalFeatureKey;
  action?: PortalAction;
  resource?: { type: string; id: string };
}): Promise<PortalRouteAccess> {
  const feature = args.feature ?? 'dashboard';
  const action = args.action ?? 'view';
  try {
    const authorized = await requirePortalAuthorized({
      ...asPortalAuth(args.auth),
      feature,
      action,
    });

    if (args.resource?.id && args.resource.type) {
      const collection =
        args.resource.type === 'job'
          ? 'jobs'
          : args.resource.type === 'document'
            ? 'customerDocuments'
            : args.resource.type === 'invoice'
              ? 'invoices'
              : args.resource.type === 'proposal'
                ? 'proposals'
                : args.resource.type === 'agreement'
                  ? 'multiYearAgreements'
                  : args.resource.type === 'property'
                    ? 'properties'
                    : null;
      if (!collection) {
        return {
          allowed: false,
          reason: 'RESOURCE_NOT_FOUND',
          publicMessage: publicMessageFor('RESOURCE_NOT_FOUND'),
        };
      }
      const scope = getPortalResourceScope(authorized);
      const record = await colGet<{ id: string; customerId?: string; organizationId?: string }>(
        scope.organizationId,
        collection,
        args.resource.id,
      );
      try {
        requirePortalOwnedRecord({
          authorized,
          record,
          resourceType: args.resource.type,
        });
      } catch (err) {
        if (err instanceof PortalResourceNotFoundError) {
          return {
            allowed: false,
            reason: 'RESOURCE_NOT_FOUND',
            publicMessage: publicMessageFor('RESOURCE_NOT_FOUND'),
          };
        }
        throw err;
      }
    }

    return { allowed: true, authorized };
  } catch (err) {
    if (err instanceof PortalFeatureNotEnabledError) {
      return {
        allowed: false,
        reason: 'FEATURE_DISABLED',
        publicMessage: publicMessageFor('FEATURE_DISABLED'),
      };
    }
    if (err instanceof PortalActionNotPermittedError) {
      return {
        allowed: false,
        reason: 'ACTION_DENIED',
        publicMessage: publicMessageFor('ACTION_DENIED'),
      };
    }
    if (err instanceof PortalAccessDeniedError) {
      return {
        allowed: false,
        reason: 'PORTAL_UNAVAILABLE',
        publicMessage: publicMessageFor('PORTAL_UNAVAILABLE'),
      };
    }
    return {
      allowed: false,
      reason: 'AUTH_REQUIRED',
      publicMessage: publicMessageFor('AUTH_REQUIRED'),
    };
  }
}

/** Map pathname + auth to route access. Unknown protected segments deny. */
export async function authorizePortalPath(args: {
  pathname: string;
  auth: string | PortalAuthInput;
  resourceId?: string;
}): Promise<PortalRouteAccess | { allowed: true; public: true }> {
  if (
    args.pathname === '/portal' ||
    args.pathname === '/portal/login' ||
    args.pathname.startsWith('/portal/access/') ||
    args.pathname.startsWith('/portal/invite/')
  ) {
    return { allowed: true, public: true };
  }

  const def = resolvePortalRouteDefinition(args.pathname);
  if (!def) {
    return {
      allowed: false,
      reason: 'RESOURCE_NOT_FOUND',
      publicMessage: publicMessageFor('RESOURCE_NOT_FOUND'),
    };
  }

  const resource =
    def.class === 'PORTAL_RESOURCE_PROTECTED' && def.resourceType && args.resourceId
      ? { type: def.resourceType, id: args.resourceId }
      : undefined;

  return requirePortalRouteAccess({
    auth: args.auth,
    feature: def.feature,
    action: def.action,
    resource,
  });
}
