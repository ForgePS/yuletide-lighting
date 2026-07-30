import { describe, expect, it } from 'vitest';
import {
  evaluateModuleEntitlement,
  type ModuleEntitlementOrg,
} from './module-entitlement';

describe('evaluateModuleEntitlement (fail-closed)', () => {
  it('denies when moduleKey is missing or empty', () => {
    const org: ModuleEntitlementOrg = { enabledModules: ['sign_tracker'] };
    expect(evaluateModuleEntitlement(org, '')).toEqual({
      allowed: false,
      reason: 'unknown module',
    });
    expect(evaluateModuleEntitlement(org, null).allowed).toBe(false);
    expect(evaluateModuleEntitlement(org, undefined).allowed).toBe(false);
  });

  it('denies when organization is null/undefined', () => {
    expect(evaluateModuleEntitlement(null, 'sign_tracker')).toEqual({
      allowed: false,
      reason: 'organization not found',
    });
    expect(evaluateModuleEntitlement(undefined, 'jobs').allowed).toBe(false);
  });

  it('denies when enabledModules is missing or not an array', () => {
    expect(evaluateModuleEntitlement({}, 'sign_tracker')).toEqual({
      allowed: false,
      reason: 'module configuration missing',
    });
    expect(
      evaluateModuleEntitlement({ enabledModules: 'sign_tracker' as unknown as string[] }, 'sign_tracker'),
    ).toEqual({
      allowed: false,
      reason: 'module configuration missing',
    });
  });

  it('denies when enabledModules is empty or does not include the module', () => {
    expect(evaluateModuleEntitlement({ enabledModules: [] }, 'sign_tracker')).toEqual({
      allowed: false,
      reason: 'sign_tracker',
    });
    expect(evaluateModuleEntitlement({ enabledModules: ['jobs'] }, 'sign_tracker')).toEqual({
      allowed: false,
      reason: 'sign_tracker',
    });
  });

  it('allows only when the module is explicitly listed', () => {
    expect(
      evaluateModuleEntitlement({ enabledModules: ['jobs', 'sign_tracker'] }, 'sign_tracker'),
    ).toEqual({ allowed: true });
  });
});
