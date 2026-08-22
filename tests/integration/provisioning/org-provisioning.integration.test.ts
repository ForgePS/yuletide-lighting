import { beforeAll, describe, expect, it } from 'vitest';
import {
  MODULE_PRESETS,
  ORGANIZATION_CONFIG_SCHEMA_VERSION,
  organizationNeedsModuleMigration,
  resolveModulesForOrganization,
} from '@clcrm/types';
import { buildOrganizationProvisioningFields, ensureOrganization } from '@yuletide/firebase';
import {
  ensureFirestoreEmulator,
  seedOrganization,
  getOrgDoc,
  setOrgEnabledModules,
} from '../setup';
import { randomUUID } from 'node:crypto';

describe('integration: org provisioning', () => {
  beforeAll(() => {
    ensureFirestoreEmulator();
  });

  it('trial provisioning writes core modules only', async () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'trialing',
      subscriptionTier: 'trial',
    });
    expect(fields.enabledModules).toEqual([...MODULE_PRESETS.trial]);
    expect(fields.enabledModules).not.toContain('sign_tracker');
    expect(fields.configurationSchemaVersion).toBe(ORGANIZATION_CONFIG_SCHEMA_VERSION);

    const org = await seedOrganization({
      subscription: { subscriptionStatus: 'trialing', subscriptionTier: 'trial' },
      subscriptionTier: 'trial',
    });
    expect(org.enabledModules).toEqual([...MODULE_PRESETS.trial]);
  });

  it('standard provisioning includes sign_tracker and routes', async () => {
    const org = await seedOrganization({
      subscription: { subscriptionStatus: 'active', subscriptionTier: 'standard' },
      subscriptionTier: 'standard',
    });
    expect(org.enabledModules).toContain('sign_tracker');
    expect(org.enabledModules).toContain('routes');
    expect(org.enabledModules).not.toContain('commercial');
  });

  it('professional includes automation and commercial', async () => {
    const org = await seedOrganization({
      subscriptionTier: 'professional',
      subscription: { subscriptionStatus: 'active', subscriptionTier: 'professional' },
    });
    expect(org.enabledModules).toContain('automation');
    expect(org.enabledModules).toContain('commercial');
  });

  it('disabledModules are excluded at provision time', async () => {
    const org = await seedOrganization({
      subscriptionTier: 'standard',
      disabledModules: ['sign_tracker', 'routes'],
      subscription: {
        subscriptionStatus: 'active',
        subscriptionTier: 'standard',
        disabledModules: ['sign_tracker', 'routes'],
      },
    });
    expect(org.enabledModules).not.toContain('sign_tracker');
    expect(org.enabledModules).not.toContain('routes');
    expect(org.enabledModules).toContain('customers');
  });

  it('ensureOrganization writes provisioning fields atomically', async () => {
    const uid = `owner_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const org = await ensureOrganization('Ensure Co', uid);
    expect(org.id).toBeTruthy();
    expect(Array.isArray(org.enabledModules)).toBe(true);
    expect((org.enabledModules ?? []).length).toBeGreaterThan(0);
    expect(org.configurationSchemaVersion).toBe(ORGANIZATION_CONFIG_SCHEMA_VERSION);
    expect(org.featureFlags?.followUpAutomation).toBe(false);

    const doc = await getOrgDoc(org.id);
    expect(doc).toBeTruthy();
    expect((doc as { companyName?: string }).companyName).toBe('Ensure Co');
  });

  it('ensureOrganization is idempotent for same owner uid', async () => {
    const uid = `owner_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const first = await ensureOrganization('First Name', uid);
    const second = await ensureOrganization('Second Name', uid);
    expect(second.id).toBe(first.id);
  });

  it('empty enabledModules needs migration', async () => {
    const org = await seedOrganization({ enabledModules: ['customers'] });
    await setOrgEnabledModules(org.id, []);
    const doc = await getOrgDoc(org.id);
    expect(organizationNeedsModuleMigration(doc as never)).toBe(true);
  });

  it('fully provisioned org does not need migration', async () => {
    const org = await seedOrganization({
      subscriptionTier: 'standard',
      subscription: { subscriptionStatus: 'active', subscriptionTier: 'standard' },
    });
    const doc = await getOrgDoc(org.id);
    expect(organizationNeedsModuleMigration(doc as never)).toBe(false);
  });

  it('resolveModulesForOrganization forcePreset is idempotent', () => {
    const first = resolveModulesForOrganization(
      { subscriptionStatus: 'trialing' },
      { forcePreset: true },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = resolveModulesForOrganization(
      {
        subscriptionStatus: 'trialing',
        subscriptionTier: first.tier,
        enabledModules: first.modules,
        configurationSchemaVersion: ORGANIZATION_CONFIG_SCHEMA_VERSION,
      },
      { forcePreset: true },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.modules).toEqual(first.modules);
  });

  it('custom tier without modules fails closed', () => {
    const result = resolveModulesForOrganization({
      subscriptionTier: 'custom',
      enabledModules: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects empty modules after availableModules intersection', () => {
    expect(() =>
      buildOrganizationProvisioningFields({
        subscriptionStatus: 'active',
        subscriptionTier: 'standard',
        availableModules: [],
      }),
    ).toThrow(/enabledModules would be empty/);
  });
});
