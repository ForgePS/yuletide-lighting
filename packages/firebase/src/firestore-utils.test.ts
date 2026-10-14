import { describe, expect, it } from 'vitest';
import { coerceTimestampField, mapTimestampsFromData } from './firestore-utils';

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe('firestore timestamp mapping', () => {
  it('converts calendar event start/end timestamps to Dates', () => {
    const mapped = mapTimestampsFromData({
      title: 'Install',
      startAt: timestamp('2026-10-09T14:00:00Z'),
      endAt: timestamp('2026-10-09T18:00:00Z'),
    });
    expect(mapped.startAt).toBeInstanceOf(Date);
    expect((mapped.startAt as unknown as Date).toISOString()).toBe('2026-10-09T14:00:00.000Z');
    expect((mapped.endAt as unknown as Date).toISOString()).toBe('2026-10-09T18:00:00.000Z');
  });

  it('handles serialized { _seconds } timestamps', () => {
    const date = coerceTimestampField({ _seconds: 1_791_000_000, _nanoseconds: 0 });
    expect(date).toBeInstanceOf(Date);
    expect((date as Date).getTime()).toBe(1_791_000_000_000);
  });
});
