/**
 * YL-S3 — Server-side permission helpers for tRPC / route handlers.
 */
import { TRPCError } from '@trpc/server';
import type { PermissionAction, PermissionKey, PermissionResource } from '@clcrm/types';
import {
  can,
  hasAdminCapability,
  hasOfficeCapability,
  permissionKey,
  type AuthCapabilityInput,
} from '@clcrm/types';
import type { AuthContext } from './trpc';

export function authCan(
  auth: AuthContext | AuthCapabilityInput | null | undefined,
  resourceOrKey: PermissionResource | PermissionKey,
  action?: PermissionAction,
): boolean {
  if (!auth) return false;
  return can(auth.permissions, resourceOrKey, action);
}

export function assertAuthCan(
  auth: AuthContext | null | undefined,
  resourceOrKey: PermissionResource | PermissionKey,
  action?: PermissionAction,
): asserts auth is AuthContext {
  if (!auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  if (!authCan(auth, resourceOrKey, action)) {
    const key =
      action != null
        ? permissionKey(resourceOrKey as PermissionResource, action)
        : String(resourceOrKey);
    throw new TRPCError({ code: 'FORBIDDEN', message: `Missing permission: ${key}` });
  }
}

export { can, hasAdminCapability, hasOfficeCapability, permissionKey };
