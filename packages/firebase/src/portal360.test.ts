import { describe, expect, it } from 'vitest';
import { toPublicCustomer } from './portal360';
import type { CustomerRecord } from './firestore';

describe('portal360 Phase 1 hardening', () => {
  it('toPublicCustomer never leaks notes, tokens, costs, or pipeline fields', () => {
    const customer = {
      id: 'c1',
      organizationId: 'org1',
      firstName: 'Pat',
      lastName: 'Customer',
      businessName: 'Acme',
      email: 'pat@example.com',
      phone: '555-1111',
      notes: 'Margin 42% — do not show',
      portalToken: 'tok_secret',
      portalEnabled: true,
      pipelineStage: 'proposal',
      assignedSalespersonId: 'sales_1',
      assignedSalespersonName: 'Sales Person',
      tags: ['internal'],
      smsOptIn: true,
      emailOptIn: true,
      billingSameAsPhysical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as CustomerRecord;

    const pub = toPublicCustomer(customer);
    expect(Object.keys(pub).sort()).toEqual([
      'businessName',
      'email',
      'firstName',
      'id',
      'lastName',
      'phone',
    ]);
    expect(JSON.stringify(pub)).not.toMatch(/Margin|tok_secret|pipeline|Sales|notes|tags/i);
  });
});
