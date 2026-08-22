import type { Timestamp } from 'firebase-admin/firestore';

type TimestampLike = { toDate: () => Date };

const DATE_FIELDS = [
  'createdAt',
  'updatedAt',
  'sentAt',
  'acceptedAt',
  'dueDate',
  'scheduledStart',
  'scheduledEnd',
  'installedAt',
  'removedAt',
  'lastViewedAt',
  'paidAt',
  'clockIn',
  'clockOut',
  'lastMessageAt',
  'occurredAt',
  'scheduledDate',
  'completionDate',
  'followUpDate',
  'purchaseDate',
  'portalInviteSentAt',
  'portalLastLoginAt',
  'invitationSentAt',
  'invitationExpiresAt',
  'invitationConsumedAt',
  'claimedAt',
  'lastLoginAt',
  'lockedUntil',
  'suspendedAt',
  'revokedAt',
  'expiresAt',
  'consumedAt',
  'activatedAt',
  'lastScannedAt',
  'scannedAt',
  'archivedAt',
  'signedAt',
  'cancelledAt',
  'nextRenewalDate',
  'approvedAt',
  'scheduledAt',
  'resolvedAt',
  'closedAt',
  'stageUpdatedAt',
  'nextActionDue',
  'installDate',
  'removalDate',
  'onboardingCompletedAt',
  'trialEndsAt',
  'lockedAt',
  'currentPeriodEnd',
] as const;

function coerceTimestampField(val: unknown): Date | unknown {
  if (val == null || val === '') return val;
  if (val instanceof Date) return val;
  if (typeof val === 'object') {
    if ('toDate' in (val as object) && typeof (val as TimestampLike).toDate === 'function') {
      try {
        return (val as TimestampLike).toDate();
      } catch {
        return val;
      }
    }
    const o = val as { seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
    const seconds = typeof o.seconds === 'number' ? o.seconds : typeof o._seconds === 'number' ? o._seconds : null;
    if (seconds != null) {
      const nanos =
        typeof o.nanoseconds === 'number'
          ? o.nanoseconds
          : typeof o._nanoseconds === 'number'
            ? o._nanoseconds
            : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
    }
  }
  return val;
}

export function mapTimestampsFromData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key of DATE_FIELDS) {
    if (key in result) {
      (result as Record<string, unknown>)[key] = coerceTimestampField(result[key]);
    }
  }
  return result;
}

/** Firestore rejects undefined field values; omit them before writes. */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

/** Recursively omit undefined values (including inside arrays/objects) for Firestore writes. */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    Object.prototype.toString.call(value) !== '[object Timestamp]'
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefinedDeep(v)]),
    ) as T;
  }
  return value;
}

export type { Timestamp };
