import { describe, expect, it } from 'vitest';
import {
  collectCrewScheduleJobIds,
  formatCrewActivityLabel,
  isCrewAssignedToJob,
  isSameCalendarDay,
} from './crew360';

describe('YL-S11 crew schedule membership', () => {
  const day = new Date('2026-11-15T12:00:00');

  it('isSameCalendarDay compares local Y/M/D', () => {
    expect(isSameCalendarDay(new Date('2026-11-15T08:00:00'), day)).toBe(true);
    expect(isSameCalendarDay(new Date('2026-11-16T08:00:00'), day)).toBe(false);
  });

  it('includes jobs assigned by user id on the target day only', () => {
    const ids = collectCrewScheduleJobIds({
      userId: 'user_1',
      targetDate: day,
      jobs: [
        { id: 'j1', assignedCrewUserId: 'user_1', scheduledStart: new Date('2026-11-15T09:00:00') },
        { id: 'j2', assignedCrewUserId: 'user_1', scheduledStart: new Date('2026-11-16T09:00:00') },
        { id: 'j3', assignedCrewUserId: 'user_1', scheduledStart: null },
        { id: 'j4', assignedCrewUserId: 'other', scheduledStart: new Date('2026-11-15T09:00:00') },
      ],
      dayEvents: [],
      crewUserByProfileId: {},
    });
    expect(ids).toEqual(['j1']);
  });

  it('includes jobs via mapped assignedCrewId and day events for that profile', () => {
    const ids = collectCrewScheduleJobIds({
      userId: 'user_1',
      targetDate: day,
      jobs: [
        {
          id: 'j_profile',
          assignedCrewId: 'crew_a',
          scheduledStart: new Date('2026-11-15T10:00:00'),
        },
      ],
      dayEvents: [
        { jobId: 'j_event', crewId: 'crew_a' },
        { jobId: 'j_other', crewId: 'crew_b' },
        { jobId: 'j_open', crewId: null },
      ],
      crewUserByProfileId: { crew_a: 'user_1', crew_b: 'user_2' },
    });
    expect(ids.sort()).toEqual(['j_event', 'j_profile']);
  });

  it('does not union every day event without crew ownership', () => {
    const ids = collectCrewScheduleJobIds({
      userId: 'user_1',
      targetDate: day,
      jobs: [],
      dayEvents: [
        { jobId: 'everyone', crewId: null },
        { jobId: 'someone', crewId: 'crew_x' },
      ],
      crewUserByProfileId: { crew_x: 'user_9' },
    });
    expect(ids).toEqual([]);
  });

  it('isCrewAssignedToJob covers user, profile, and event crew', () => {
    expect(
      isCrewAssignedToJob({
        userId: 'u1',
        job: { assignedCrewUserId: 'u1' },
        crewUserByProfileId: {},
      }),
    ).toBe(true);
    expect(
      isCrewAssignedToJob({
        userId: 'u1',
        job: { assignedCrewId: 'c1' },
        crewUserByProfileId: { c1: 'u1' },
      }),
    ).toBe(true);
    expect(
      isCrewAssignedToJob({
        userId: 'u1',
        job: {},
        eventCrewIds: ['c1'],
        crewUserByProfileId: { c1: 'u1' },
      }),
    ).toBe(true);
    expect(
      isCrewAssignedToJob({
        userId: 'u1',
        job: { assignedCrewId: 'c1' },
        crewUserByProfileId: { c1: 'u2' },
      }),
    ).toBe(false);
  });

  it('formatCrewActivityLabel is null-safe', () => {
    expect(formatCrewActivityLabel(null)).toBe('Unknown');
    expect(formatCrewActivityLabel('job_started')).toBe('Job Started');
  });
});
