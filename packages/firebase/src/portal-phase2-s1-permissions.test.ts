/**
 * P2-S1 — requirePortalAuthorized / role enforcement (ENVIRONMENT=EMULATOR helpers + unit).
 */
import { describe, expect, it } from 'vitest';
import { resolvePortalPermission, PORTAL_USER_ROLES, type PortalUserRole } from '@clcrm/types';
import {
  assertPortalUserAction,
  PortalActionNotPermittedError,
  PortalFeatureNotEnabledError,
} from './portal360';

const critical: Array<{
  feature: Parameters<typeof resolvePortalPermission>[0]['feature'];
  action: Parameters<typeof resolvePortalPermission>[0]['action'];
  allow: PortalUserRole[];
}> = [
  { feature: 'dashboard', action: 'view', allow: [...PORTAL_USER_ROLES] },
  {
    feature: 'service_requests',
    action: 'create',
    allow: ['account_owner', 'authorized_contact', 'property_contact'],
  },
  {
    feature: 'messaging',
    action: 'message',
    allow: ['account_owner', 'authorized_contact', 'billing_contact', 'property_contact'],
  },
  {
    feature: 'billing',
    action: 'view',
    allow: ['account_owner', 'authorized_contact', 'billing_contact', 'view_only'],
  },
  {
    feature: 'billing',
    action: 'pay',
    allow: ['account_owner', 'authorized_contact', 'billing_contact'],
  },
  {
    feature: 'scheduling',
    action: 'request',
    allow: ['account_owner', 'authorized_contact', 'property_contact'],
  },
  {
    feature: 'documents',
    action: 'view',
    allow: [
      'account_owner',
      'authorized_contact',
      'billing_contact',
      'property_contact',
      'view_only',
    ],
  },
  {
    feature: 'e_sign',
    action: 'view',
    allow: ['account_owner', 'authorized_contact', 'view_only'],
  },
  {
    feature: 'rebooking',
    action: 'request',
    allow: ['account_owner', 'authorized_contact'],
  },
];

describe('P2-S1 canonical permission enforcement', () => {
  for (const row of critical) {
    for (const role of PORTAL_USER_ROLES) {
      const shouldAllow = row.allow.includes(role);
      it(`${role} ${shouldAllow ? 'may' : 'may not'} ${row.action} ${row.feature}`, () => {
        const decision = resolvePortalPermission({
          role,
          feature: row.feature,
          action: row.action,
          accountStatus: 'active',
          userStatus: 'active',
          featureEnabled: true,
        });
        expect(decision.allowed).toBe(shouldAllow);

        if (shouldAllow) {
          expect(() =>
            assertPortalUserAction({
              role,
              feature: row.feature,
              action: row.action,
              accountStatus: 'active',
              userStatus: 'active',
              featureEnabled: true,
            }),
          ).not.toThrow();
        } else {
          expect(() =>
            assertPortalUserAction({
              role,
              feature: row.feature,
              action: row.action,
              accountStatus: 'active',
              userStatus: 'active',
              featureEnabled: true,
            }),
          ).toThrow(PortalActionNotPermittedError);
        }
      });
    }
  }

  it('view_only cannot create service requests', () => {
    expect(() =>
      assertPortalUserAction({
        role: 'view_only',
        feature: 'service_requests',
        action: 'create',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }),
    ).toThrow(PortalActionNotPermittedError);
  });

  it('billing_contact cannot create service requests', () => {
    expect(() =>
      assertPortalUserAction({
        role: 'billing_contact',
        feature: 'service_requests',
        action: 'create',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }),
    ).toThrow(PortalActionNotPermittedError);
  });

  it('disabled feature throws PORTAL_FEATURE_NOT_ENABLED', () => {
    expect(() =>
      assertPortalUserAction({
        role: 'account_owner',
        feature: 'messaging',
        action: 'view',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: false,
      }),
    ).toThrow(PortalFeatureNotEnabledError);
  });

  it('missing role fails closed', () => {
    expect(() =>
      assertPortalUserAction({
        role: null,
        feature: 'dashboard',
        action: 'view',
        accountStatus: 'active',
        userStatus: 'active',
        featureEnabled: true,
      }),
    ).toThrow(PortalActionNotPermittedError);
  });
});
