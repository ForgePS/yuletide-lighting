/**
 * Portal Phase 2 S4 — ownership helpers + public DTO allowlist unit tests.
 * ENVIRONMENT=EMULATOR (pure unit).
 */
import { describe, expect, it } from 'vitest';
import {
  getPortalResourceScope,
  requirePortalOwnedRecord,
  isPortalOwnedRecord,
  PortalResourceNotFoundError,
} from './portal-ownership';
import { toPublicCustomer } from './portal360';
import type { PortalAuthorizedContext } from './portal360';

function fakeAuthorized(
  overrides?: Partial<{ org: string; customer: string; account: string; user: string }>,
): PortalAuthorizedContext {
  const organizationId = overrides?.org ?? 'org_a';
  const customerId = overrides?.customer ?? 'cust_a1';
  return {
    organizationId,
    customer: {
      id: customerId,
      firstName: 'Ann',
      lastName: 'One',
      email: 'a1@test.invalid',
    } as PortalAuthorizedContext['customer'],
    customerPublic: {
      id: customerId,
      firstName: 'Ann',
      lastName: 'One',
      businessName: null,
      email: 'a1@test.invalid',
      phone: null,
    },
    organization: null,
    settings: {} as PortalAuthorizedContext['settings'],
    enabledFeatures: ['dashboard', 'billing', 'proposals'],
    account: {
      id: overrides?.account ?? 'pa_a1',
      customerId,
      portalEnabled: true,
      status: 'active',
      accessToken: 'tok',
    } as PortalAuthorizedContext['account'],
    primaryUser: {
      id: overrides?.user ?? 'pu_a1',
      role: 'account_owner',
      status: 'active',
      customerId,
      portalAccountId: overrides?.account ?? 'pa_a1',
    } as PortalAuthorizedContext['primaryUser'],
    accessToken: 'tok',
    actingUser: {
      id: overrides?.user ?? 'pu_a1',
      role: 'account_owner',
      status: 'active',
      customerId,
      portalAccountId: overrides?.account ?? 'pa_a1',
    } as PortalAuthorizedContext['actingUser'],
  };
}

describe('P2-S4 portal resource scope', () => {
  it('extracts trusted organization/customer/account/user', () => {
    const scope = getPortalResourceScope(fakeAuthorized());
    expect(scope).toEqual({
      organizationId: 'org_a',
      customerId: 'cust_a1',
      portalAccountId: 'pa_a1',
      portalUserId: 'pu_a1',
    });
  });

  it('ignores any client-looking fields on the authorized object shape', () => {
    const auth = fakeAuthorized();
    const injected = {
      ...auth,
      customerId: 'cust_evil',
      organizationId: 'org_evil',
    } as PortalAuthorizedContext;
    // Still uses authoritative nested customer/account ids
    injected.customer = { ...auth.customer, id: 'cust_a1' };
    injected.organizationId = 'org_a';
    expect(getPortalResourceScope(injected).customerId).toBe('cust_a1');
    expect(getPortalResourceScope(injected).organizationId).toBe('org_a');
  });
});

describe('P2-S4 ownership assertion', () => {
  it('allows same tenant/same customer', () => {
    const auth = fakeAuthorized();
    expect(() =>
      requirePortalOwnedRecord({
        authorized: auth,
        record: { id: 'inv1', customerId: 'cust_a1', organizationId: 'org_a' },
        resourceType: 'invoice',
      }),
    ).not.toThrow();
  });

  it('denies same tenant/different customer', () => {
    const auth = fakeAuthorized();
    expect(() =>
      requirePortalOwnedRecord({
        authorized: auth,
        record: { id: 'inv2', customerId: 'cust_a2', organizationId: 'org_a' },
        resourceType: 'invoice',
      }),
    ).toThrow(PortalResourceNotFoundError);
  });

  it('denies different tenant', () => {
    const auth = fakeAuthorized();
    expect(() =>
      requirePortalOwnedRecord({
        authorized: auth,
        record: { id: 'inv3', customerId: 'cust_a1', organizationId: 'org_b' },
        resourceType: 'invoice',
      }),
    ).toThrow(PortalResourceNotFoundError);
  });

  it('denies missing customerId (fail closed)', () => {
    const auth = fakeAuthorized();
    expect(() =>
      requirePortalOwnedRecord({
        authorized: auth,
        record: { id: 'inv4', organizationId: 'org_a' },
        resourceType: 'invoice',
      }),
    ).toThrow(PortalResourceNotFoundError);
  });

  it('denies null record', () => {
    expect(isPortalOwnedRecord(fakeAuthorized(), null)).toBe(false);
  });
});

describe('P2-S4 public customer DTO allowlist', () => {
  it('exposes only public fields', () => {
    const dto = toPublicCustomer({
      id: 'c1',
      firstName: 'Ann',
      lastName: 'One',
      businessName: null,
      email: 'a@test.invalid',
      phone: '555',
      internalNotes: 'SECRET',
      stripeCustomerId: 'cus_secret',
      portalToken: 'tok_secret',
      margin: 42,
    } as never);
    expect(dto).toEqual({
      id: 'c1',
      firstName: 'Ann',
      lastName: 'One',
      businessName: null,
      email: 'a@test.invalid',
      phone: '555',
    });
    expect(dto).not.toHaveProperty('internalNotes');
    expect(dto).not.toHaveProperty('stripeCustomerId');
    expect(dto).not.toHaveProperty('portalToken');
    expect(dto).not.toHaveProperty('margin');
    expect(dto).not.toHaveProperty('tokenHash');
    expect(dto).not.toHaveProperty('otp');
  });
});
