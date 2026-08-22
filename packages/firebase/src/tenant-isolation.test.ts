import { describe, expect, it } from 'vitest';
import { phonesMatchForTwilio } from '../src/messages360';
import { hasPermission, SYSTEM_ROLES } from '@clcrm/types';
import { orgCollectionPath, assertOrgScopedIds } from '../src/record-paths';

describe('tenant isolation — Twilio inbound mapping', () => {
  it('matches configured org phone to inbound To number', () => {
    expect(phonesMatchForTwilio('+15551234567', '5551234567')).toBe(true);
    expect(phonesMatchForTwilio('(555) 123-4567', '+1-555-123-4567')).toBe(true);
  });

  it('rejects unrelated phone numbers (cross-tenant)', () => {
    expect(phonesMatchForTwilio('+15551234567', '+15559876543')).toBe(false);
    expect(phonesMatchForTwilio('555', '555')).toBe(false);
  });
});

describe('tenant isolation — org path helpers', () => {
  it('builds org-scoped collection paths', () => {
    expect(orgCollectionPath('org_a', 'customers')).toBe('organizations/org_a/customers');
    expect(orgCollectionPath('org_b', 'proposals')).toBe('organizations/org_b/proposals');
  });

  it('rejects cross-org id assertions', () => {
    expect(() => assertOrgScopedIds('org_a', { organizationId: 'org_b' })).toThrow(/tenant/i);
    expect(() => assertOrgScopedIds('org_a', { organizationId: 'org_a', customerId: 'c1' })).not.toThrow();
  });
});

describe('tenant isolation — core collection path namespaces', () => {
  const collections = ['customers', 'proposals', 'jobs', 'invoices', 'properties', 'contacts'] as const;

  it('keeps org A and org B paths distinct', () => {
    for (const collection of collections) {
      expect(orgCollectionPath('org_a', collection)).not.toBe(orgCollectionPath('org_b', collection));
      expect(orgCollectionPath('org_a', collection)).toContain('/org_a/');
      expect(orgCollectionPath('org_b', collection)).toContain('/org_b/');
    }
  });
});

describe('read_only permissions cannot write', () => {
  const perms = SYSTEM_ROLES.find((r) => r.slug === 'read_only')!.permissions;

  it('allows view on core resources', () => {
    expect(hasPermission(perms, 'customers', 'view')).toBe(true);
    expect(hasPermission(perms, 'proposals', 'view')).toBe(true);
  });

  it('denies create/edit/delete', () => {
    expect(hasPermission(perms, 'customers', 'create')).toBe(false);
    expect(hasPermission(perms, 'customers', 'edit')).toBe(false);
    expect(hasPermission(perms, 'customers', 'delete')).toBe(false);
    expect(hasPermission(perms, 'invoices', 'delete')).toBe(false);
    expect(hasPermission(perms, 'settings', 'edit')).toBe(false);
  });
});
