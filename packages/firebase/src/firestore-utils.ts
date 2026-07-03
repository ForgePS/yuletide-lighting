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
] as const;

export function mapTimestampsFromData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key of DATE_FIELDS) {
    const val = result[key];
    if (val && typeof val === 'object' && 'toDate' in (val as object)) {
      (result as Record<string, unknown>)[key] = (val as TimestampLike).toDate();
    }
  }
  return result;
}

/** Firestore rejects undefined field values; omit them before writes. */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

export type { Timestamp };
