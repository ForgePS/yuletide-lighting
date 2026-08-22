import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  mapLegacyRole,
  mapSettingsRoleToLegacyRole,
  resolveLegacyRoleForRules,
  SYSTEM_ROLES,
  DEFAULT_FEATURE_FLAGS,
} from '@clcrm/types';

describe('settings360 helpers', () => {
  it('maps legacy roles to settings roles', () => {
    expect(mapLegacyRole('owner')).toBe('owner');
    expect(mapLegacyRole('admin')).toBe('administrator');
    expect(mapLegacyRole('office')).toBe('office_staff');
    expect(mapLegacyRole('crew')).toBe('installer');
  });

  it('YL-S6 maps settings roles to legacy rule buckets', () => {
    expect(mapSettingsRoleToLegacyRole('owner')).toBe('owner');
    expect(mapSettingsRoleToLegacyRole('administrator')).toBe('admin');
    expect(mapSettingsRoleToLegacyRole('office_staff')).toBe('office');
    expect(mapSettingsRoleToLegacyRole('dispatcher')).toBe('office');
    expect(mapSettingsRoleToLegacyRole('installer')).toBe('crew');
    expect(mapSettingsRoleToLegacyRole('read_only')).toBe('read_only');
    expect(
      resolveLegacyRoleForRules({ role: 'crew', settingsRole: 'office_staff' }),
    ).toBe('office');
    expect(resolveLegacyRoleForRules({ role: 'office', settingsRole: null })).toBe('office');
  });

  it('checks permissions correctly', () => {
    const ownerPerms = SYSTEM_ROLES.find((r) => r.slug === 'owner')!.permissions;
    expect(hasPermission(ownerPerms, 'settings', 'edit')).toBe(true);
    expect(hasPermission(ownerPerms, 'customers', 'view')).toBe(true);

    const readOnly = SYSTEM_ROLES.find((r) => r.slug === 'read_only')!.permissions;
    expect(hasPermission(readOnly, 'customers', 'view')).toBe(true);
    expect(hasPermission(readOnly, 'customers', 'create')).toBe(false);
    expect(hasPermission(readOnly, 'settings', 'view')).toBe(false);
  });

  it('seeds system roles', () => {
    expect(SYSTEM_ROLES.length).toBeGreaterThanOrEqual(10);
    expect(SYSTEM_ROLES.some((r) => r.slug === 'sales_manager')).toBe(true);
  });

  it('has default feature flags', () => {
    expect(DEFAULT_FEATURE_FLAGS.some((f) => f.key === 'ai_features')).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.some((f) => f.key === 'route_optimization')).toBe(true);
  });
});
