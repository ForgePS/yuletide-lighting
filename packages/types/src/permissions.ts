/**
 * YL-S3 — Centralized permission registry + capability helpers.
 *
 * Namespaced keys (e.g. `customers.view`) map onto the existing PermissionMatrix.
 * Prefer these helpers over `auth.role === 'admin'` in application code.
 */

import type { PermissionAction, PermissionMatrix, PermissionResource, SettingsRole } from './settings';
import { hasPermission, SYSTEM_ROLES } from './settings';

export type PermissionKey = `${PermissionResource}.${PermissionAction}`;

export const PERMISSION_RESOURCES: PermissionResource[] = [
  'customers',
  'mockups',
  'proposals',
  'jobs',
  'invoices',
  'inventory',
  'reports',
  'settings',
  'sign_tracker',
];

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'approve',
  'archive',
  'restore',
  'manage',
];

/** Flat registry of every resource.action key (documentation + validation). */
export const PERMISSION_REGISTRY: PermissionKey[] = PERMISSION_RESOURCES.flatMap((resource) =>
  PERMISSION_ACTIONS.map((action) => `${resource}.${action}` as PermissionKey),
);

export function permissionKey(resource: PermissionResource, action: PermissionAction): PermissionKey {
  return `${resource}.${action}`;
}

export function parsePermissionKey(key: string): { resource: PermissionResource; action: PermissionAction } | null {
  const [resource, action] = key.split('.');
  if (!resource || !action) return null;
  if (!(PERMISSION_RESOURCES as string[]).includes(resource)) return null;
  if (!(PERMISSION_ACTIONS as string[]).includes(action)) return null;
  return { resource: resource as PermissionResource, action: action as PermissionAction };
}

export function can(
  permissions: PermissionMatrix | null | undefined,
  resourceOrKey: PermissionResource | PermissionKey,
  action?: PermissionAction,
): boolean {
  if (!permissions) return false;
  if (action) {
    return hasPermission(permissions, resourceOrKey as PermissionResource, action);
  }
  const parsed = parsePermissionKey(String(resourceOrKey));
  if (!parsed) return false;
  return hasPermission(permissions, parsed.resource, parsed.action);
}

export function listRolePermissionKeys(slug: SettingsRole): PermissionKey[] {
  const role = SYSTEM_ROLES.find((r) => r.slug === slug);
  if (!role) return [];
  return PERMISSION_REGISTRY.filter((key) => can(role.permissions, key));
}

/**
 * Field-scoped settings roles that must not use desk/office CRM procedures.
 * Mirrors prior legacy mapping where these became `crew` and failed officeProcedure.
 */
export const FIELD_ONLY_SETTINGS_ROLES: SettingsRole[] = [
  'installer',
  'crew_leader',
  'warehouse_staff',
];

export type AuthCapabilityInput = {
  settingsRole: SettingsRole;
  permissions: PermissionMatrix;
};

/** Admin console / settings write capability (replaces owner|admin legacy check). */
export function hasAdminCapability(auth: AuthCapabilityInput): boolean {
  if (auth.settingsRole === 'read_only') return false;
  return can(auth.permissions, 'settings', 'edit');
}

/**
 * Desk/office CRM capability (replaces owner|admin|office legacy check).
 * Excludes field-only roles and read_only even if they have view bits.
 */
export function hasOfficeCapability(auth: AuthCapabilityInput): boolean {
  if (auth.settingsRole === 'read_only') return false;
  if (FIELD_ONLY_SETTINGS_ROLES.includes(auth.settingsRole)) return false;
  return PERMISSION_RESOURCES.some((resource) => can(auth.permissions, resource, 'view'));
}

export function getSystemRolePermissions(slug: SettingsRole): PermissionMatrix | null {
  return SYSTEM_ROLES.find((r) => r.slug === slug)?.permissions ?? null;
}
