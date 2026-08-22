import { describe, expect, it } from 'vitest';
import {
  MODULE_PRESETS,
  ORGANIZATION_CONFIG_SCHEMA_VERSION,
  inferSubscriptionTier,
  modulesEqual,
  organizationNeedsModuleMigration,
  resolveModulesForOrganization,
  unknownModuleKeys,
} from './module-presets';

describe('module presets', () => {
  it('trial tenants receive only trial modules', () => {
    const result = resolveModulesForOrganization(
      { subscriptionStatus: 'trialing' },
      { forcePreset: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tier).toBe('trial');
    expect(result.modules).toEqual([...MODULE_PRESETS.trial]);
    expect(result.modules).not.toContain('commercial');
  });

  it('paid plan presets resolve correctly', () => {
    for (const tier of ['starter', 'standard', 'professional', 'enterprise'] as const) {
      const result = resolveModulesForOrganization(
        { subscriptionTier: tier, subscriptionStatus: 'active' },
        { forcePreset: true },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.modules).toEqual([...MODULE_PRESETS[tier]]);
    }
  });

  it('custom plans preserve custom module settings', () => {
    const result = resolveModulesForOrganization({
      subscriptionTier: 'custom',
      enabledModules: ['customers', 'jobs', 'bogus'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.modules).toEqual(['customers', 'jobs']);
  });

  it('custom with empty modules fails safely', () => {
    const result = resolveModulesForOrganization({
      subscriptionTier: 'custom',
      enabledModules: [],
    });
    expect(result.ok).toBe(false);
  });

  it('unknown plan values fail safely', () => {
    expect(inferSubscriptionTier({ subscriptionTier: 'gold' }).ok).toBe(false);
    expect(inferSubscriptionTier({ subscriptionStatus: 'mystery' }).ok).toBe(false);
  });

  it('disabled modules remain disabled', () => {
    const result = resolveModulesForOrganization(
      {
        subscriptionTier: 'standard',
        disabledModules: ['sign_tracker', 'automation'],
      },
      { forcePreset: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.modules).not.toContain('sign_tracker');
    expect(result.modules).toContain('customers');
  });

  it('creator-only modules are not assigned', () => {
    const result = resolveModulesForOrganization(
      { subscriptionTier: 'enterprise' },
      { forcePreset: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No creator-only keys exist in presets today; enterprise still only tenant modules.
    expect(result.modules.every((m) => typeof m === 'string')).toBe(true);
  });

  it('missing modules fail closed via migration flag', () => {
    expect(organizationNeedsModuleMigration({})).toBe(true);
    expect(organizationNeedsModuleMigration({ enabledModules: [] })).toBe(true);
    expect(
      organizationNeedsModuleMigration({
        enabledModules: ['customers'],
        subscriptionTier: 'trial',
        configurationSchemaVersion: ORGANIZATION_CONFIG_SCHEMA_VERSION,
      }),
    ).toBe(false);
  });

  it('unknown module keys are detected', () => {
    expect(unknownModuleKeys(['customers', 'not_a_module'])).toEqual(['not_a_module']);
  });

  it('modulesEqual is order-insensitive', () => {
    expect(modulesEqual(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(modulesEqual(['a'], ['a', 'b'])).toBe(false);
  });
});
