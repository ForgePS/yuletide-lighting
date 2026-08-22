import { describe, expect, it } from 'vitest';
import {
  FIELD_ONLY_SETTINGS_ROLES,
  PERMISSION_REGISTRY,
  can,
  hasAdminCapability,
  hasOfficeCapability,
  listRolePermissionKeys,
  parsePermissionKey,
  permissionKey,
} from './permissions';
import { SYSTEM_ROLES } from './settings';

describe('YL-S3 permission registry', () => {
  it('exposes namespaced keys for every resource.action', () => {
    expect(PERMISSION_REGISTRY).toContain('customers.view');
    expect(PERMISSION_REGISTRY).toContain('settings.edit');
    expect(PERMISSION_REGISTRY.length).toBeGreaterThan(40);
  });

  it('parses and builds permission keys', () => {
    expect(permissionKey('jobs', 'create')).toBe('jobs.create');
    expect(parsePermissionKey('proposals.approve')).toEqual({
      resource: 'proposals',
      action: 'approve',
    });
    expect(parsePermissionKey('nope')).toBeNull();
  });

  it('can() checks matrix via resource/action or key', () => {
    const owner = SYSTEM_ROLES.find((r) => r.slug === 'owner')!.permissions;
    expect(can(owner, 'customers', 'delete')).toBe(true);
    expect(can(owner, 'customers.delete')).toBe(true);
    expect(can(null, 'customers', 'view')).toBe(false);
  });

  it('lists granted keys for a role', () => {
    const keys = listRolePermissionKeys('read_only');
    expect(keys).toContain('customers.view');
    expect(keys).not.toContain('customers.delete');
  });
});

describe('YL-S3 capability helpers', () => {
  function authFor(slug: (typeof SYSTEM_ROLES)[number]['slug']) {
    const role = SYSTEM_ROLES.find((r) => r.slug === slug)!;
    return { settingsRole: role.slug, permissions: role.permissions };
  }

  it('grants admin capability to owner/administrator only via settings.edit', () => {
    expect(hasAdminCapability(authFor('owner'))).toBe(true);
    expect(hasAdminCapability(authFor('administrator'))).toBe(true);
    expect(hasAdminCapability(authFor('office_staff'))).toBe(false);
    expect(hasAdminCapability(authFor('read_only'))).toBe(false);
  });

  it('grants office capability to desk roles but not field-only or read_only', () => {
    expect(hasOfficeCapability(authFor('owner'))).toBe(true);
    expect(hasOfficeCapability(authFor('sales_rep'))).toBe(true);
    expect(hasOfficeCapability(authFor('operations_manager'))).toBe(true);
    expect(hasOfficeCapability(authFor('dispatcher'))).toBe(true);
    expect(hasOfficeCapability(authFor('office_staff'))).toBe(true);
    expect(hasOfficeCapability(authFor('read_only'))).toBe(false);
    for (const slug of FIELD_ONLY_SETTINGS_ROLES) {
      expect(hasOfficeCapability(authFor(slug))).toBe(false);
    }
  });

  it('YL-S5 office_staff has desk CRM bits including proposals and settings.view only', () => {
    const perms = SYSTEM_ROLES.find((r) => r.slug === 'office_staff')!.permissions;
    expect(can(perms, 'proposals', 'view')).toBe(true);
    expect(can(perms, 'proposals', 'create')).toBe(true);
    expect(can(perms, 'mockups', 'view')).toBe(true);
    expect(can(perms, 'inventory', 'view')).toBe(true);
    expect(can(perms, 'reports', 'view')).toBe(true);
    expect(can(perms, 'settings', 'view')).toBe(true);
    expect(can(perms, 'settings', 'edit')).toBe(false);
    expect(can(perms, 'customers', 'delete')).toBe(false);
  });
});
