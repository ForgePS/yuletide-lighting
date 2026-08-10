import { describe, expect, it } from 'vitest';
import {
  assertSameOrganization,
  assertUserBelongsToOrganization,
  evaluateOrganizationAccess,
  membershipFromUser,
} from './organization-access';
import type { OrganizationRecord, UserRecord } from './firestore';

function baseUser(over: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u1',
    firebaseUid: 'fb1',
    organizationId: 'org_a',
    email: 'a@test.local',
    role: 'owner',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function baseOrg(over: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: 'org_a',
    companyName: 'A',
    brandColor: '#000',
    agreementMode: 'multi',
    agreementOptions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe('YL-S1 organization access', () => {
  it('builds membership from user document', () => {
    const m = membershipFromUser(baseUser({ settingsRole: 'owner' }));
    expect(m.organizationId).toBe('org_a');
    expect(m.userStatus).toBe('active');
    expect(m.settingsRole).toBe('owner');
  });

  it('allows same-org membership assertion', () => {
    expect(() => assertUserBelongsToOrganization(baseUser(), 'org_a')).not.toThrow();
  });

  it('rejects cross-org membership assertion', () => {
    expect(() => assertUserBelongsToOrganization(baseUser(), 'org_b')).toThrow(/Cross-organization/i);
  });

  it('assertSameOrganization rejects mismatch', () => {
    expect(() => assertSameOrganization('org_a', 'org_b')).toThrow(/Cross-organization/i);
  });

  it('missing org lifecycle defaults to active', () => {
    const result = evaluateOrganizationAccess(baseOrg({ lifecycleStatus: undefined }));
    expect(result).toEqual({ ok: true, lifecycleStatus: 'active' });
  });

  it('denies inactive / suspended / archived orgs', () => {
    for (const lifecycleStatus of ['inactive', 'suspended', 'archived'] as const) {
      const result = evaluateOrganizationAccess(baseOrg({ lifecycleStatus }));
      expect(result).toEqual({ ok: false, reason: 'org_inactive' });
    }
  });

  it('denies missing org', () => {
    expect(evaluateOrganizationAccess(null)).toEqual({ ok: false, reason: 'no_org' });
  });
});
