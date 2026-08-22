import { describe, expect, it } from 'vitest';
import { mapOrgJobToCustomerJobRecord } from './customer360';

describe('YL-S9 mapOrgJobToCustomerJobRecord', () => {
  it('maps org stage into CRM Job History fields', () => {
    const mapped = mapOrgJobToCustomerJobRecord({
      id: 'job_1',
      customerId: 'cust_1',
      title: 'Front roof install',
      stage: 'accepted_proposal',
      jobType: 'installation',
      subtotalCents: 12000,
      scheduledStart: new Date('2026-11-01T15:00:00.000Z'),
      assignedCrewUserId: 'crew_1',
      installNotes: 'GFCI on north side',
    });

    expect(mapped.status).toBe('draft');
    expect(mapped.revenueCents).toBe(12000);
    expect(mapped.scheduledDate?.toISOString()).toBe('2026-11-01T15:00:00.000Z');
    expect(mapped.assignedCrewIds).toEqual(['crew_1']);
    expect(mapped.crewNotes).toBe('GFCI on north side');
  });

  it('treats installed as completed and tolerates missing title/type', () => {
    const mapped = mapOrgJobToCustomerJobRecord({
      id: 'job_2',
      customerId: 'cust_1',
      stage: 'installed',
      installedAt: new Date('2026-12-01T12:00:00.000Z'),
    });

    expect(mapped.title).toBe('Job');
    expect(mapped.jobType).toBe('installation');
    expect(mapped.status).toBe('completed');
    expect(mapped.completionDate?.toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });
});
