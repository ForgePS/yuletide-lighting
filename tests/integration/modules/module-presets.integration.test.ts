import { describe, expect, it } from 'vitest';
import {
  MODULE_PRESETS,
  organizationNeedsModuleMigration,
  resolveModulesForOrganization,
} from '@clcrm/types';
import { buildOrganizationProvisioningFields } from '../../../packages/firebase/src/org-provisioning';

describe('integration: module presets + provisioning', () => {
  it('enabled module permits access evaluation input', () => {
    const fields = buildOrganizationProvisioningFields({
      subscriptionStatus: 'trialing',
      subscriptionTier: 'trial',
    });
    expect(fields.enabledModules).toContain('customers');
    expect(fields.enabledModules).not.toContain('commercial');
  });

  it('disabled module remains disabled after preset resolve', () => {
    const result = resolveModulesForOrganization(
      { subscriptionTier: 'professional', disabledModules: ['automation'] },
      { forcePreset: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.modules).not.toContain('automation');
    expect(MODULE_PRESETS.professional).toContain('automation');
  });

  it('missing entitlement fails closed for migration flag', () => {
    expect(organizationNeedsModuleMigration({ enabledModules: null })).toBe(true);
    expect(organizationNeedsModuleMigration({ enabledModules: [] })).toBe(true);
  });

  it('unknown plan fails safely', () => {
    const result = resolveModulesForOrganization({
      subscriptionTier: 'platinum',
      enabledModules: [],
    });
    expect(result.ok).toBe(false);
  });

  it('migration twice yields same modules (idempotent resolve)', () => {
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
        configurationSchemaVersion: 1,
      },
      { forcePreset: false },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.modules).toEqual(first.modules);
  });
});
