import { beforeAll, describe, expect, it } from 'vitest';
import {
  resolveConfigurationValue,
  validateConfigurationValue,
  scopeOutranks,
  MODULE_PRESETS,
} from '@clcrm/types';
import { ensureFirestoreEmulator, seedOrganization, setOrgFeatureFlags, getOrgDoc } from '../setup';

describe('integration: configuration resolver + org feature flags', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('user scope beats tenant and plan', () => {
    const result = resolveConfigurationValue('branding.primaryColor', {
      platform: '#000000',
      plan: '#111111',
      tenant: '#222222',
      user: '#abcdef',
    });
    expect('ok' in result && result.ok === false).toBe(false);
    if ('ok' in result) return;
    expect(result.value).toBe('#abcdef');
    expect(result.source).toBe('user');
  });

  it('location beats tenant', () => {
    const result = resolveConfigurationValue('maps.defaultZoom', {
      tenant: 10,
      location: 14,
      platform: 8,
    });
    if ('ok' in result) throw new Error('expected resolved value');
    expect(result.value).toBe(14);
    expect(result.source).toBe('location');
  });

  it('plan beats platform', () => {
    const result = resolveConfigurationValue('modules.sign_tracker', {
      platform: false,
      plan: true,
    });
    if ('ok' in result) throw new Error('expected resolved value');
    expect(result.value).toBe(true);
    expect(result.source).toBe('plan');
  });

  it('platformDefault used when layers empty', () => {
    const result = resolveConfigurationValue(
      'notifications.emailEnabled',
      {},
      { platformDefault: true },
    );
    if ('ok' in result) throw new Error('expected resolved value');
    expect(result.value).toBe(true);
    expect(result.source).toBe('platform');
  });

  it('fails closed without default', () => {
    const result = resolveConfigurationValue('ai.model', {});
    expect(result).toEqual({ ok: false, error: 'configuration missing for ai.model' });
  });

  it('validates configuration values', () => {
    expect(validateConfigurationValue(true).ok).toBe(true);
    expect(validateConfigurationValue(['a', 'b']).ok).toBe(true);
    expect(validateConfigurationValue({ nested: { x: 1 } }).ok).toBe(false);
  });

  it('scopeOutranks ordering', () => {
    expect(scopeOutranks('user', 'location')).toBe(true);
    expect(scopeOutranks('tenant', 'plan')).toBe(true);
    expect(scopeOutranks('platform', 'plan')).toBe(false);
  });

  it('seeded org stores default featureFlags.followUpAutomation=false', async () => {
    const org = await seedOrganization({ subscriptionTier: 'standard' });
    expect(org.featureFlags.followUpAutomation).toBe(false);
    const doc = await getOrgDoc(org.id);
    expect(
      (doc as { featureFlags?: { followUpAutomation?: boolean } })?.featureFlags
        ?.followUpAutomation,
    ).toBe(false);
  });

  it('setOrgFeatureFlags persists and resolves like tenant config', async () => {
    const org = await seedOrganization({
      subscriptionTier: 'professional',
      enabledModules: [...MODULE_PRESETS.professional],
    });
    await setOrgFeatureFlags(org.id, { followUpAutomation: true, customMaps: true });
    const doc = await getOrgDoc(org.id);
    const flags = (doc as { featureFlags?: Record<string, boolean> })?.featureFlags ?? {};
    expect(flags.followUpAutomation).toBe(true);
    expect(flags.customMaps).toBe(true);

    const resolved = resolveConfigurationValue('workflow.followUpAutomation', {
      platform: false,
      tenant: flags.followUpAutomation,
    });
    if ('ok' in resolved) throw new Error('expected resolved value');
    expect(resolved.value).toBe(true);
    expect(resolved.source).toBe('tenant');
  });

  it('module preset can be layered as plan configuration', () => {
    const planModules = [...MODULE_PRESETS.standard];
    const tenantDisabled = planModules.filter((m) => m !== 'automation');
    const resolved = resolveConfigurationValue('modules.enabled', {
      plan: planModules,
      tenant: tenantDisabled,
    });
    if ('ok' in resolved) throw new Error('expected resolved value');
    expect(resolved.source).toBe('tenant');
    expect(resolved.value).toEqual(tenantDisabled);
    expect((resolved.value as string[]).includes('sign_tracker')).toBe(true);
    expect((resolved.value as string[]).includes('automation')).toBe(false);
  });
});
