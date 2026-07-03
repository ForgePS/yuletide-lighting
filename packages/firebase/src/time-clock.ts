import type { TimeClockEntry, TimeEntryStatus } from '@clcrm/types';
import type { ClockInInput, TimeClockEntryInput, UpdateTimeClockEntryInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function timeEntriesPath(orgId: string) {
  return `organizations/${orgId}/timeEntries360`;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function calculateHours(clockIn: Date, clockOut?: Date | null, breakMinutes = 0) {
  if (!clockOut) return 0;
  const elapsedMs = Math.max(0, clockOut.getTime() - clockIn.getTime());
  const breakMs = Math.max(0, breakMinutes) * 60 * 1000;
  return Math.round((Math.max(0, elapsedMs - breakMs) / 36_000) / 100) / 100;
}

function mapDoc(data: Record<string, unknown>) {
  return mapTimestampsFromData(data) as TimeClockEntry;
}

function normalizeEntryInput(input: TimeClockEntryInput | UpdateTimeClockEntryInput) {
  const hours = input.clockIn ? calculateHours(input.clockIn, input.clockOut ?? null, input.breakMinutes ?? 0) : undefined;
  return stripUndefined({
    userId: emptyToNull(input.userId),
    userName: input.userName?.trim(),
    customerId: emptyToNull(input.customerId),
    customerName: emptyToNull(input.customerName),
    jobId: emptyToNull(input.jobId),
    jobTitle: emptyToNull(input.jobTitle),
    workType: input.workType,
    status: input.status,
    clockIn: input.clockIn,
    clockOut: input.clockOut ?? undefined,
    breakMinutes: input.breakMinutes,
    hours,
    hourlyRateCents: input.hourlyRateCents,
    laborCostCents: hours !== undefined && input.hourlyRateCents !== undefined ? Math.round(hours * input.hourlyRateCents) : undefined,
    notes: emptyToNull(input.notes),
    startLocation: emptyToNull(input.startLocation),
    endLocation: emptyToNull(input.endLocation),
  });
}

export async function listTimeClockEntries360(
  orgId: string,
  opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: TimeEntryStatus;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(timeEntriesPath(orgId)).orderBy('clockIn', 'desc').get();
  } catch {
    snap = await db.collection(timeEntriesPath(orgId)).get();
  }

  let items = snap.docs.map((doc) => mapDoc({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => (b.clockIn?.getTime?.() ?? 0) - (a.clockIn?.getTime?.() ?? 0));

  if (opts.status) items = items.filter((entry) => entry.status === opts.status);
  if (opts.userId) items = items.filter((entry) => entry.userId === opts.userId);
  if (opts.startDate) items = items.filter((entry) => entry.clockIn >= opts.startDate!);
  if (opts.endDate) items = items.filter((entry) => entry.clockIn <= opts.endDate!);

  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((entry) =>
      [
        entry.userName,
        entry.customerName,
        entry.jobTitle,
        entry.workType,
        entry.status,
        entry.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  const summary = {
    totalEntries: items.length,
    activeEntries: items.filter((entry) => entry.status === 'active').length,
    totalHours: Math.round(items.reduce((sum, entry) => sum + (entry.hours ?? 0), 0) * 100) / 100,
    laborCostCents: items.reduce((sum, entry) => sum + (entry.laborCostCents ?? 0), 0),
  };

  return { items: paged, total, page, pageSize, summary };
}

export async function getTimeClockEntry360(orgId: string, entryId: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`${timeEntriesPath(orgId)}/${entryId}`).get();
  if (!snap.exists) return null;
  return mapDoc({ id: snap.id, ...snap.data()! });
}

export async function createTimeClockEntry360(orgId: string, input: TimeClockEntryInput, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(timeEntriesPath(orgId)).doc();
  const now = ts();
  const normalized = normalizeEntryInput({
    ...input,
    status: input.status ?? (input.clockOut ? 'submitted' : 'active'),
    breakMinutes: input.breakMinutes ?? 0,
    hourlyRateCents: input.hourlyRateCents ?? 0,
  });
  const data = {
    organizationId: orgId,
    ...normalized,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  };
  await ref.set(data);
  return mapDoc({ id: ref.id, ...data });
}

export async function updateTimeClockEntry360(
  orgId: string,
  entryId: string,
  input: UpdateTimeClockEntryInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.doc(`${timeEntriesPath(orgId)}/${entryId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = mapDoc({ id: snap.id, ...snap.data()! });
  const merged = {
    ...input,
    clockIn: input.clockIn ?? current.clockIn,
    clockOut: input.clockOut === undefined ? current.clockOut : input.clockOut,
    breakMinutes: input.breakMinutes ?? current.breakMinutes,
    hourlyRateCents: input.hourlyRateCents ?? current.hourlyRateCents,
  };
  const patch = {
    ...normalizeEntryInput(merged),
    updatedAt: ts(),
    updatedBy: userId ?? null,
  };
  await ref.update(patch);
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}

export async function clockIn360(orgId: string, input: ClockInInput, userId?: string | null) {
  return createTimeClockEntry360(
    orgId,
    {
      ...input,
      userId: input.userId || userId || '',
      clockIn: new Date(),
      clockOut: null,
      status: 'active',
      breakMinutes: 0,
      hourlyRateCents: 0,
      notes: '',
      endLocation: '',
    },
    userId,
  );
}

export async function clockOut360(
  orgId: string,
  entryId: string,
  input: { endLocation?: string; breakMinutes?: number },
  userId?: string | null,
) {
  return updateTimeClockEntry360(
    orgId,
    entryId,
    {
      clockOut: new Date(),
      status: 'submitted',
      endLocation: input.endLocation ?? '',
      breakMinutes: input.breakMinutes ?? 0,
    },
    userId,
  );
}

export async function approveTimeClockEntry360(orgId: string, entryId: string, approverId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.doc(`${timeEntriesPath(orgId)}/${entryId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({
    status: 'approved',
    approvedBy: approverId ?? null,
    approvedAt: ts(),
    updatedAt: ts(),
    updatedBy: approverId ?? null,
  });
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}
