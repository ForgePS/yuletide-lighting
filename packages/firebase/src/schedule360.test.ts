import { describe, expect, it } from 'vitest';
import { detectConflicts, appointmentDurationHours, aiSchedulingQuery } from '@clcrm/types';

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
