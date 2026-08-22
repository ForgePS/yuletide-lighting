/**
 * YL-S3 — UI capability helpers. Prefer these over role string checks in components.
 */
'use client';

import type { PermissionAction, PermissionKey, PermissionMatrix, PermissionResource } from '@clcrm/types';
import { can, hasAdminCapability, hasOfficeCapability } from '@clcrm/types';

export function userCan(
  permissions: PermissionMatrix | null | undefined,
  resourceOrKey: PermissionResource | PermissionKey,
  action?: PermissionAction,
): boolean {
  return can(permissions, resourceOrKey, action);
}

export function userIsAdmin(permissions: PermissionMatrix | null | undefined, settingsRole: string): boolean {
  if (!permissions) return false;
  return hasAdminCapability({
    settingsRole: settingsRole as never,
    permissions,
  });
}

export function userIsOffice(permissions: PermissionMatrix | null | undefined, settingsRole: string): boolean {
  if (!permissions) return false;
  return hasOfficeCapability({
    settingsRole: settingsRole as never,
    permissions,
  });
}

export { can, hasAdminCapability, hasOfficeCapability };
