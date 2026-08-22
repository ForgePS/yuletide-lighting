import { describe, expect, it } from 'vitest';
import {
  formatScheduleLabel,
  normalizeOptionalId,
  pickPrimaryCalendarEventForJob,
  resolveJobCrewAssignment,
  detectConflicts,
  appointmentDurationHours,
  aiSchedulingQuery,
} from '@clcrm/types';

describe('schedule360 helpers', () => {
  it('detects crew conflicts', () => {
    const events = [{
      id: '1', organizationId: 'o', title: 'Install A', appointmentType: 'installation' as const, category: 'installation' as const,
      crewId: 'crew-1', vehicleId: null, customerId: null, propertyId: null, startAt: new Date('2026-10-15T09:00:00'),
      endAt: new Date('2026-10-15T13:00:00'), allDay: false, color: '#DC2626', dispatchStatus: 'scheduled' as const,
      estimatedRevenueCents: 0, weatherRisk: false, createdAt: new Date(), updatedAt: new Date(),
    }];
    const conflicts = detectConflicts(events, {
      id: '2', crewId: 'crew-1', vehicleId: null, customerId: null, propertyId: null,
      startAt: new Date('2026-10-15T10:00:00'), endAt: new Date('2026-10-15T14:00:00'),
    });
    expect(conflicts.some((c) => c.type === 'crew')).toBe(true);
  });

  it('returns appointment duration', () => {
    expect(appointmentDurationHours('installation')).toBe(4);
  });

  it('answers AI scheduling query', () => {
    const result = aiSchedulingQuery('Show available crews Friday', [], []);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('YL-S10 schedule harden helpers', () => {
  it('formatScheduleLabel is null-safe', () => {
    expect(formatScheduleLabel(null)).toBe('Unknown');
    expect(formatScheduleLabel(undefined)).toBe('Unknown');
    expect(formatScheduleLabel('')).toBe('Unknown');
    expect(formatScheduleLabel('en_route')).toBe('En Route');
  });

  it('normalizeOptionalId drops empty strings', () => {
    expect(normalizeOptionalId('')).toBeUndefined();
    expect(normalizeOptionalId('   ')).toBeUndefined();
    expect(normalizeOptionalId(null)).toBeUndefined();
    expect(normalizeOptionalId('cust_1')).toBe('cust_1');
  });

  it('resolveJobCrewAssignment never treats profile id as user id', () => {
    expect(resolveJobCrewAssignment({ id: 'crew_profile_1' })).toEqual({
      assignedCrewId: 'crew_profile_1',
      assignedCrewUserId: null,
    });
    expect(resolveJobCrewAssignment({ id: 'crew_profile_1', assignedUserId: 'user_9' })).toEqual({
      assignedCrewId: 'crew_profile_1',
      assignedCrewUserId: 'user_9',
    });
    expect(resolveJobCrewAssignment(null)).toEqual({
      assignedCrewId: null,
      assignedCrewUserId: null,
    });
  });

  it('pickPrimaryCalendarEventForJob prefers latest updated/start', () => {
    const primary = pickPrimaryCalendarEventForJob(
      [
        { id: 'old', jobId: 'job_1', startAt: new Date('2026-11-01T09:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z') },
        { id: 'new', jobId: 'job_1', startAt: new Date('2026-11-08T09:00:00Z'), updatedAt: new Date('2026-10-20T00:00:00Z') },
        { id: 'other', jobId: 'job_2', startAt: new Date('2026-12-01T09:00:00Z') },
      ],
      'job_1',
    );
    expect(primary?.id).toBe('new');
    expect(pickPrimaryCalendarEventForJob([], 'job_1')).toBeNull();
  });
});
