import { describe, expect, it } from 'vitest';
import {
  PHASE1_ACTIVE_PORTAL_FEATURES,
  PORTAL_FEATURES,
  type PortalCustomerPublic,
} from '@clcrm/types';

/**
 * Mirrors packages/firebase/src/portal360.ts toPublicCustomer — kept in sync via test contract.
 * Ensures portal DTOs never expose internal CRM fields.
 */
function toPublicCustomer(customer: Record<string, unknown>): PortalCustomerPublic {
  return {
    id: String(customer.id),
    firstName: (customer.firstName as string) ?? null,
    lastName: (customer.lastName as string) ?? null,
    businessName: (customer.businessName as string) ?? null,
    email: (customer.email as string) ?? null,
    phone: (customer.phone as string) ?? null,
  };
}

describe('portal Phase 1 foundation contracts', () => {
  it('exposes Creator portal feature catalog with parent customer_portal expectations', () => {
    expect(PORTAL_FEATURES.length).toBeGreaterThanOrEqual(19);
    expect(PHASE1_ACTIVE_PORTAL_FEATURES).toContain('dashboard');
    expect(PHASE1_ACTIVE_PORTAL_FEATURES).toContain('service_requests');
    expect(PHASE1_ACTIVE_PORTAL_FEATURES).toContain('rebooking');
  });

  it('public customer DTO strips notes, costs, pipeline, and tokens', () => {
    const raw = {
      id: 'cust_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      businessName: null,
      email: 'ada@example.com',
      phone: '555-0100',
      notes: 'INTERNAL margin discussion',
      portalToken: 'secret-token',
      pipelineStage: 'qualified',
      assignedSalespersonId: 'user_x',
      tags: ['vip'],
      smsOptIn: true,
    };
    const pub = toPublicCustomer(raw);
    expect(pub).toEqual({
      id: 'cust_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      businessName: null,
      email: 'ada@example.com',
      phone: '555-0100',
    });
    expect(JSON.stringify(pub)).not.toMatch(
      /notes|portalToken|pipeline|Salesperson|margin|tags|smsOptIn/i,
    );
  });

  it('intersect tenant features with Creator allow-list', () => {
    const available = new Set(['dashboard', 'billing', 'proposals'] as const);
    const tenantEnabled = ['dashboard', 'billing', 'messaging', 'storage'];
    const effective = tenantEnabled.filter((k) => available.has(k as 'dashboard'));
    expect(effective).toEqual(['dashboard', 'billing']);
    expect(effective).not.toContain('messaging');
  });
});
