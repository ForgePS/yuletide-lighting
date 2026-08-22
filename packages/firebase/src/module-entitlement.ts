/**
 * Pure fail-closed module entitlement check (Creator enabledModules).
 * Used by API requireModule middleware — missing/empty/unknown → deny.
 */
export type ModuleEntitlementOrg = {
  enabledModules?: unknown;
} | null;

export type ModuleEntitlementResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function evaluateModuleEntitlement(
  org: ModuleEntitlementOrg | undefined,
  moduleKey: string | null | undefined,
): ModuleEntitlementResult {
  if (!moduleKey || typeof moduleKey !== 'string') {
    return { allowed: false, reason: 'unknown module' };
  }
  if (!org) {
    return { allowed: false, reason: 'organization not found' };
  }
  const enabled = org.enabledModules;
  if (!Array.isArray(enabled)) {
    return { allowed: false, reason: 'module configuration missing' };
  }
  if (enabled.length === 0 || !enabled.includes(moduleKey)) {
    return { allowed: false, reason: moduleKey };
  }
  return { allowed: true };
}
