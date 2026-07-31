import { describe, expect, it } from 'vitest';
import { MODULE_PRESETS, ORGANIZATION_CONFIG_SCHEMA_VERSION } from '@clcrm/types';
import { buildOrganizationProvisioningFields } from './org-provisioning';

describe('buildOrganizationProvisioningFields', () => {
  it('newly provisioned trial orgs receive trial modules + schema version', () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'trialing',
      subscriptionTier: 'trial',
    });
    expect(fields.enabledModules).toEqual([...MODULE_PRESETS.trial]);
    expect(fields.subscriptionTier).toBe('trial');
    expect(fields.configurationSchemaVersion).toBe(ORGANIZATION_CONFIG_SCHEMA_VERSION);
    expect(fields.featureFlags?.followUpAutomation).toBe(false);
    expect(fields.provisioningStatus).toBe('active');
    expect(Array.isArray(fields.portalFeatures)).toBe(true);
    expect(fields.portalFeatures.length).toBeGreaterThan(0);
  });

  it('accepts professional tier with staging markers', () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'active',
      subscriptionTier: 'professional',
      subscriptionPlan: 'monthly',
      slug: 'yuletide-staging-verification',
      environmentMarker: 'staging_test',
    });
    expect(fields.subscriptionTier).toBe('professional');
    expect(fields.enabledModules).toEqual([...MODULE_PRESETS.professional]);
    expect(fields.slug).toBe('yuletide-staging-verification');
    expect(fields.environmentMarker).toBe('staging_test');
  });

  it('intersects with availableModules allow-list', () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'trialing',
      availableModules: ['customers', 'proposals'],
    });
    expect(fields.enabledModules).toEqual(['customers', 'proposals']);
  });

  it('rejects empty intersection with availableModules', () => {
    expect(() =>
      buildOrganizationProvisioningFields({
        subscriptionStatus: 'trialing',
        availableModules: [],
      }),
    ).toThrow(/empty/);
  });

  it('preserves disabled modules', () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'active',
      subscriptionTier: 'standard',
      disabledModules: ['sign_tracker'],
    });
    expect(fields.enabledModules).not.toContain('sign_tracker');
    expect(fields.disabledModules).toContain('sign_tracker');
  });
});
