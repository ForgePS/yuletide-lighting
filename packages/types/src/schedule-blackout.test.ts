import { describe, expect, it } from 'vitest';
import { dateKeyInTimeZone, findBlackoutForDateKey, type ScheduleBlackout } from './schedule';

const blackout = (startDate: string, endDate: string, reason?: string): ScheduleBlackout => ({
  id: `${startDate}-${endDate}`,
  organizationId: 'org',
  startDate,
  endDate,
  reason: reason ?? null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
});

describe('dateKeyInTimeZone', () => {
  it('uses the company time zone rather than UTC', () => {
    const lateEvening = new Date('2026-12-25T03:30:00Z');
    expect(dateKeyInTimeZone(lateEvening, 'America/Chicago')).toBe('2026-12-24');
    expect(dateKeyInTimeZone(lateEvening, 'UTC')).toBe('2026-12-25');
  });

  it('falls back to the runtime zone for an invalid zone', () => {
    const date = new Date(2026, 9, 7, 12);
    expect(dateKeyInTimeZone(date, 'Not/AZone')).toBe('2026-10-07');
    expect(dateKeyInTimeZone(date)).toBe('2026-10-07');
  });
});

describe('findBlackoutForDateKey', () => {
  const list = [blackout('2026-12-24', '2026-12-26', 'Christmas'), blackout('2026-11-26', '2026-11-26')];

  it('matches inclusive start and end days', () => {
    expect(findBlackoutForDateKey(list, '2026-12-24')?.reason).toBe('Christmas');
    expect(findBlackoutForDateKey(list, '2026-12-26')?.reason).toBe('Christmas');
    expect(findBlackoutForDateKey(list, '2026-11-26')).not.toBeNull();
  });

  it('returns null outside every range', () => {
    expect(findBlackoutForDateKey(list, '2026-12-23')).toBeNull();
    expect(findBlackoutForDateKey(list, '2026-12-27')).toBeNull();
  });
});
