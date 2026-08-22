import { nanoid } from 'nanoid';
import type {
  CalendarEvent,
  CrewProfile,
  DispatchBoardEntry,
  ResourceReservation,
  RoutePlan,
  ScheduleAnalytics,
  ScheduleConflict,
  ScheduleDashboardKpis,
  ScheduleTemplate,
  SettingsRole,
  VehicleSchedule,
  WeatherForecast,
} from '@clcrm/types';
import {
  aiSchedulingQuery,
  APPOINTMENT_TO_CATEGORY,
  appointmentDurationHours,
  DEFAULT_CREWS,
  DEFAULT_SCHEDULE_TEMPLATES,
  DEFAULT_VEHICLES,
  detectConflicts,
  EVENT_CATEGORY_COLORS,
  jobStageFromAppointmentComplete,
  normalizeOptionalId,
  resolveJobCrewAssignment,
  SEASON_PLAN,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colDelete, colGet, colList, colUpdate } from './firestore';
import { triggerAutomation } from './messages360';
import { syncCustomerPipelineFromAppointment, syncCustomerPipelineFromJob } from './jobs360';
import { haversineMiles, nearestNeighborOrder, pathDistanceMiles, travelMinutesFromMiles } from './geo';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

const FIELD_CREW_ROLES = new Set<SettingsRole>(['installer', 'crew_leader', 'warehouse_staff']);

function normalizeCrewProfile(data: Record<string, unknown>): CrewProfile {
  const crew = mapDoc<CrewProfile>(data);
  return {
    ...crew,
    memberUserIds: Array.isArray(data.memberUserIds) ? (data.memberUserIds as string[]) : [],
    leaderUserId: (data.leaderUserId as string) ?? null,
    isActive: data.isActive !== false,
  };
}

async function getCrewDoc(orgId: string, crewId: string) {
  const db = getAdminFirestore();
  const ref = db.collection(orgPath(orgId, 'crewSchedules')).doc(crewId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { ref, data: normalizeCrewProfile({ id: snap.id, ...snap.data()! }) };
}

async function assertFieldCrewUser(orgId: string, userId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) throw new Error('User not found');
  const data = snap.data()!;
  if (data.organizationId !== orgId) throw new Error('User is not in this organization');
  const settingsRole = (data.settingsRole as SettingsRole) ?? null;
  const legacyRole = String(data.role ?? '');
  const isField =
    (settingsRole && FIELD_CREW_ROLES.has(settingsRole)) || legacyRole === 'crew';
  if (!isField) throw new Error('Only field crew roles (installer, crew leader, warehouse) can be assigned to crews');
  if (data.status === 'suspended' || data.status === 'archived') {
    throw new Error('Cannot assign inactive users to a crew');
  }
  return { id: userId, ...data };
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function normalizeEvent(raw: Record<string, unknown>): CalendarEvent {
  const appointmentType = raw.appointmentType as CalendarEvent['appointmentType'];
  const category = (raw.category as CalendarEvent['category']) ?? APPOINTMENT_TO_CATEGORY[appointmentType] ?? 'installation';
  return {
    id: String(raw.id),
    organizationId: String(raw.organizationId ?? ''),
    title: String(raw.title ?? ''),
    appointmentType,
    category,
    customerId: (raw.customerId as string) ?? null,
    customerName: (raw.customerName as string) ?? null,
    propertyId: (raw.propertyId as string) ?? null,
    propertyAddress: (raw.propertyAddress as string) ?? null,
    jobId: (raw.jobId as string) ?? null,
    proposalId: (raw.proposalId as string) ?? null,
    crewId: (raw.crewId as string) ?? null,
    crewName: (raw.crewName as string) ?? null,
    vehicleId: (raw.vehicleId as string) ?? null,
    startAt: raw.startAt instanceof Date ? raw.startAt : new Date(String(raw.startAt)),
    endAt: raw.endAt instanceof Date ? raw.endAt : new Date(String(raw.endAt)),
    allDay: Boolean(raw.allDay),
    color: String(raw.color ?? EVENT_CATEGORY_COLORS[category]),
    notes: (raw.notes as string) ?? null,
    dispatchStatus: (raw.dispatchStatus as CalendarEvent['dispatchStatus']) ?? 'scheduled',
    estimatedRevenueCents: Number(raw.estimatedRevenueCents ?? 0),
    weatherRisk: Boolean(raw.weatherRisk),
    holidayEventType: (raw.holidayEventType as CalendarEvent['holidayEventType']) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

export async function listCalendarEvents(
  orgId: string,
  start?: Date,
  end?: Date,
  opts?: { readOnly?: boolean },
): Promise<CalendarEvent[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'calendarEvents', 'createdAt', {
    limit: opts?.readOnly ? 400 : undefined,
  });
  let events = rows.map((r) => normalizeEvent({ ...r, organizationId: orgId }));
  const hadAnyEvents = events.length > 0;
  // YL-S10: do not drop in-progress events with startAt before the window (overlap filter below).
  if (start && !end) events = events.filter((e) => e.endAt >= start);
  if (end && !start) events = events.filter((e) => e.startAt <= end);

  // Migrate legacy scheduleBlocks (never on read-only dashboard — that path must stay fast)
  if (!hadAnyEvents && !opts?.readOnly) {
    const blocks = await colList<{ id: string; jobId: string; startAt: Date; endAt: Date }>(orgId, 'scheduleBlocks');
    if (blocks.length) {
      const jobs = await colList<{ id: string; title?: string; customerId?: string }>(orgId, 'jobs');
      if (opts?.readOnly) {
        events = blocks.map((block) => {
          const job = jobs.find((j) => j.id === block.jobId);
          return normalizeEvent({
            id: block.id,
            organizationId: orgId,
            title: job?.title ?? 'Scheduled job',
            appointmentType: 'installation',
            category: 'installation',
            jobId: block.jobId,
            customerId: job?.customerId ?? null,
            startAt: block.startAt,
            endAt: block.endAt,
            allDay: false,
            color: EVENT_CATEGORY_COLORS.installation,
            dispatchStatus: 'scheduled',
            estimatedRevenueCents: 0,
            weatherRisk: false,
          });
        });
      } else {
        for (const block of blocks) {
          const job = jobs.find((j) => j.id === block.jobId);
          await colCreate(orgId, 'calendarEvents', {
            organizationId: orgId,
            title: job?.title ?? 'Scheduled job',
            appointmentType: 'installation',
            category: 'installation',
            jobId: block.jobId,
            customerId: job?.customerId ?? null,
            startAt: block.startAt,
            endAt: block.endAt,
            allDay: false,
            color: EVENT_CATEGORY_COLORS.installation,
            dispatchStatus: 'scheduled',
            estimatedRevenueCents: 0,
            weatherRisk: false,
          });
        }
        const refreshed = await colList<Record<string, unknown>>(orgId, 'calendarEvents');
        events = refreshed.map((r) => normalizeEvent({ ...r, organizationId: orgId }));
      }
    }
  }

  if (start && end) {
    events = events.filter((e) => e.startAt <= end && e.endAt >= start);
  }
  return events.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export async function getCalendarEvent(orgId: string, eventId: string) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'calendarEvents', eventId);
  if (!raw) return null;
  return normalizeEvent({ ...raw, id: eventId, organizationId: orgId });
}

export async function createCalendarEvent(
  orgId: string,
  input: {
    title: string;
    appointmentType: CalendarEvent['appointmentType'];
    customerId?: string;
    propertyId?: string;
    jobId?: string;
    proposalId?: string;
    crewId?: string;
    vehicleId?: string;
    startAt: Date;
    endAt?: Date;
    allDay?: boolean;
    notes?: string;
    estimatedRevenueCents?: number;
    holidayEventType?: CalendarEvent['holidayEventType'];
  },
  userId?: string | null,
) {
  const category = APPOINTMENT_TO_CATEGORY[input.appointmentType];
  const endAt = input.endAt ?? new Date(input.startAt.getTime() + appointmentDurationHours(input.appointmentType) * 3600000);

  let customerName: string | null = null;
  let propertyAddress: string | null = null;
  const resolvedCustomerId = normalizeOptionalId(input.customerId);
  if (resolvedCustomerId) {
    const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', resolvedCustomerId);
    customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : null;
  }
  if (input.propertyId) {
    const prop = await colGet<{ addressLine1?: string; city?: string; state?: string }>(orgId, 'properties', input.propertyId);
    propertyAddress = prop ? `${prop.addressLine1 ?? ''}, ${prop.city ?? ''} ${prop.state ?? ''}`.trim() : null;
  }

  const crews = await ensureCrews(orgId);
  const crew = input.crewId ? crews.find((c) => c.id === input.crewId) : null;
  const crewAssignment = resolveJobCrewAssignment(
    crew ? { id: crew.id, assignedUserId: crew.assignedUserId } : input.crewId ? { id: input.crewId } : null,
  );
  // Weather risk requires a live provider — never fabricate from mock forecasts.
  const weatherRisk = false;
  const customerId = resolvedCustomerId ?? null;

  const allEvents = await listCalendarEvents(orgId);
  const draft = {
    id: 'new',
    crewId: input.crewId ?? null,
    vehicleId: input.vehicleId ?? null,
    customerId,
    propertyId: input.propertyId ?? null,
    startAt: input.startAt,
    endAt,
  };
  const conflicts = detectConflicts(allEvents, draft);

  const event = await colCreate(orgId, 'calendarEvents', {
    organizationId: orgId,
    title: input.title,
    appointmentType: input.appointmentType,
    category,
    customerId,
    customerName,
    propertyId: input.propertyId ?? null,
    propertyAddress,
    jobId: input.jobId ?? null,
    proposalId: input.proposalId ?? null,
    crewId: input.crewId ?? null,
    crewName: crew?.name ?? null,
    vehicleId: input.vehicleId ?? null,
    startAt: input.startAt,
    endAt,
    allDay: input.allDay ?? false,
    color: EVENT_CATEGORY_COLORS[category],
    notes: input.notes ?? null,
    dispatchStatus: 'scheduled',
    estimatedRevenueCents: input.estimatedRevenueCents ?? 0,
    weatherRisk,
    holidayEventType: input.holidayEventType ?? null,
    createdBy: userId,
    updatedBy: userId,
  }) as Record<string, unknown>;

  const normalized = normalizeEvent({ ...event, organizationId: orgId });

  if (input.jobId) {
    const jobPatch: Record<string, unknown> = {
      scheduledStart: input.startAt,
      scheduledEnd: endAt,
      stage: 'scheduled',
      assignedCrewId: crewAssignment.assignedCrewId,
    };
    // YL-S10: never write crewSchedules profile id into assignedCrewUserId.
    if (crewAssignment.assignedCrewUserId) {
      jobPatch.assignedCrewUserId = crewAssignment.assignedCrewUserId;
    } else if (!input.crewId) {
      jobPatch.assignedCrewUserId = null;
    }
    await colUpdate(orgId, 'jobs', input.jobId, jobPatch);
    await colCreate(orgId, 'scheduleBlocks', { jobId: input.jobId, startAt: input.startAt, endAt });
  }

  if (customerId) {
    await syncCustomerPipelineFromAppointment(orgId, customerId, input.appointmentType, 'scheduled', userId);
  }

  await syncDispatchBoard(orgId);
  if (customerId) {
    // YL-S21: single path via automation360 (messaging fallback inside fireAutomationTrigger).
    try {
      const { fireAutomationTrigger } = await import('./automation360');
      await fireAutomationTrigger(orgId, 'job_scheduled', {
        customerId,
        jobId: input.jobId,
        vars: {
          appointmentDate: input.startAt.toLocaleDateString(),
          address: propertyAddress ?? '',
        },
      }, userId);
    } catch {
      // Best-effort
    }
  }

  return { event: normalized, conflicts };
}

export async function createEventFromJob(orgId: string, input: { jobId: string; appointmentType: CalendarEvent['appointmentType']; crewId?: string; startAt: Date; endAt?: Date }, userId?: string | null) {
  const job = await colGet<Record<string, unknown>>(orgId, 'jobs', input.jobId);
  if (!job) throw new Error('Job not found');
  return createCalendarEvent(orgId, {
    title: String(job.title ?? 'Job'),
    appointmentType: input.appointmentType,
    customerId: normalizeOptionalId(job.customerId as string | null | undefined),
    propertyId: normalizeOptionalId(job.propertyId as string | null | undefined),
    jobId: input.jobId,
    crewId: input.crewId,
    startAt: input.startAt,
    endAt: input.endAt,
    estimatedRevenueCents: Number(job.subtotalCents ?? 0),
  }, userId);
}

export async function updateCalendarEvent(orgId: string, eventId: string, data: Partial<CalendarEvent>, userId?: string | null) {
  const existing = await getCalendarEvent(orgId, eventId);
  await colUpdate(orgId, 'calendarEvents', eventId, { ...data, updatedBy: userId });
  const updated = await getCalendarEvent(orgId, eventId);
  if (existing?.jobId && updated) {
    const shouldSyncJob =
      data.startAt !== undefined ||
      data.endAt !== undefined ||
      data.crewId !== undefined;
    if (shouldSyncJob) {
      await syncJobFromCalendarEvent(orgId, existing.jobId, updated);
    }
  }
  await syncDispatchBoard(orgId);
  return updated;
}

export async function moveCalendarEvent(orgId: string, input: { eventId: string; startAt: Date; endAt: Date; crewId?: string }, userId?: string | null) {
  const event = await getCalendarEvent(orgId, input.eventId);
  if (!event) throw new Error('Event not found');
  const crews = await ensureCrews(orgId);
  const nextCrewId = input.crewId ?? event.crewId ?? undefined;
  const crew = nextCrewId ? crews.find((c) => c.id === nextCrewId) : null;
  const allEvents = await listCalendarEvents(orgId);
  const conflicts = detectConflicts(allEvents, { ...event, ...input, id: input.eventId });

  await colUpdate(orgId, 'calendarEvents', input.eventId, {
    startAt: input.startAt,
    endAt: input.endAt,
    crewId: nextCrewId ?? null,
    crewName: crew?.name ?? (input.crewId ? null : event.crewName),
    updatedBy: userId,
  });

  if (event.jobId) {
    const updated = await getCalendarEvent(orgId, input.eventId);
    if (updated) await syncJobFromCalendarEvent(orgId, event.jobId, updated);
  }

  await syncDispatchBoard(orgId);
  const updated = await getCalendarEvent(orgId, input.eventId);
  return { event: updated, conflicts };
}

/** YL-S10 — keep linked job times/crew in sync with calendar event edits. */
async function syncJobFromCalendarEvent(orgId: string, jobId: string, event: CalendarEvent) {
  const crews = event.crewId ? await ensureCrews(orgId) : [];
  const crew = event.crewId ? crews.find((c) => c.id === event.crewId) : null;
  const assignment = resolveJobCrewAssignment(
    crew ? { id: crew.id, assignedUserId: crew.assignedUserId } : event.crewId ? { id: event.crewId } : null,
  );
  const jobPatch: Record<string, unknown> = {
    scheduledStart: event.startAt,
    scheduledEnd: event.endAt,
    assignedCrewId: assignment.assignedCrewId,
  };
  if (assignment.assignedCrewUserId) {
    jobPatch.assignedCrewUserId = assignment.assignedCrewUserId;
  } else if (!event.crewId) {
    jobPatch.assignedCrewUserId = null;
  }
  await colUpdate(orgId, 'jobs', jobId, jobPatch);
}

export async function duplicateCalendarEvent(orgId: string, eventId: string, startAt: Date, userId?: string | null) {
  const event = await getCalendarEvent(orgId, eventId);
  if (!event) throw new Error('Event not found');
  const duration = event.endAt.getTime() - event.startAt.getTime();
  return createCalendarEvent(orgId, {
    title: `${event.title} (copy)`,
    appointmentType: event.appointmentType,
    customerId: event.customerId ?? undefined,
    propertyId: event.propertyId ?? undefined,
    jobId: undefined,
    crewId: event.crewId ?? undefined,
    vehicleId: event.vehicleId ?? undefined,
    startAt,
    endAt: new Date(startAt.getTime() + duration),
    notes: event.notes ?? undefined,
    estimatedRevenueCents: event.estimatedRevenueCents,
    holidayEventType: event.holidayEventType ?? undefined,
  }, userId);
}

export async function detectScheduleConflicts(orgId: string, eventId?: string) {
  const events = await listCalendarEvents(orgId);
  const allConflicts: ScheduleConflict[] = [];
  for (const event of events) {
    if (eventId && event.id !== eventId) continue;
    allConflicts.push(...detectConflicts(events, event));
  }
  return allConflicts;
}

export async function listCrewProfiles(orgId: string): Promise<CrewProfile[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'crewSchedules')).get();
  if (!snap.empty) {
    return snap.docs
      .map((d) => normalizeCrewProfile({ id: d.id, ...d.data()! }))
      .filter((c) => c.isActive);
  }

  return DEFAULT_CREWS.map((c, idx) =>
    normalizeCrewProfile({
      id: `default-${idx}`,
      organizationId: orgId,
      ...c,
      scheduledHoursWeek: 0,
      availableHoursWeek: 40,
      utilizationPercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

export async function getCrewProfile(orgId: string, crewId: string): Promise<CrewProfile | null> {
  const doc = await getCrewDoc(orgId, crewId);
  return doc?.data ?? null;
}

export async function createCrewProfile(
  orgId: string,
  input: {
    name: string;
    position: string;
    skillLevel: CrewProfile['skillLevel'];
    availabilityStatus: CrewProfile['availabilityStatus'];
    certifications?: string[];
    assignedVehicleId?: string | null;
  },
  actorId?: string | null,
): Promise<CrewProfile> {
  await ensureCrews(orgId);
  const db = getAdminFirestore();
  const now = ts();
  const ref = db.collection(orgPath(orgId, 'crewSchedules')).doc();
  const data = {
    organizationId: orgId,
    name: input.name.trim(),
    position: input.position.trim(),
    skillLevel: input.skillLevel,
    availabilityStatus: input.availabilityStatus,
    certifications: input.certifications ?? [],
    assignedVehicleId: input.assignedVehicleId ?? null,
    leaderUserId: null,
    memberUserIds: [],
    isActive: true,
    scheduledHoursWeek: 0,
    availableHoursWeek: 40,
    utilizationPercent: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId ?? null,
    updatedBy: actorId ?? null,
  };
  await ref.set(data);
  return normalizeCrewProfile({ id: ref.id, ...data });
}

export async function updateCrewProfile(
  orgId: string,
  crewId: string,
  input: Partial<{
    name: string;
    position: string;
    skillLevel: CrewProfile['skillLevel'];
    availabilityStatus: CrewProfile['availabilityStatus'];
    certifications: string[];
    assignedVehicleId: string | null;
    leaderUserId: string | null;
    isActive: boolean;
  }>,
  actorId?: string | null,
): Promise<CrewProfile> {
  const doc = await getCrewDoc(orgId, crewId);
  if (!doc) throw new Error('Crew not found');

  const update: Record<string, unknown> = { updatedAt: ts(), updatedBy: actorId ?? null };
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.position !== undefined) update.position = input.position.trim();
  if (input.skillLevel !== undefined) update.skillLevel = input.skillLevel;
  if (input.availabilityStatus !== undefined) update.availabilityStatus = input.availabilityStatus;
  if (input.certifications !== undefined) update.certifications = input.certifications;
  if (input.assignedVehicleId !== undefined) update.assignedVehicleId = input.assignedVehicleId;
  if (input.isActive !== undefined) update.isActive = input.isActive;
  if (input.leaderUserId !== undefined) {
    if (input.leaderUserId) {
      await assertFieldCrewUser(orgId, input.leaderUserId);
      const members = doc.data.memberUserIds;
      if (!members.includes(input.leaderUserId)) {
        update.memberUserIds = [...members, input.leaderUserId];
      }
    }
    update.leaderUserId = input.leaderUserId;
  }

  await doc.ref.update(update);
  const snap = await doc.ref.get();
  return normalizeCrewProfile({ id: snap.id, ...snap.data()! });
}

export async function archiveCrewProfile(orgId: string, crewId: string, actorId?: string | null): Promise<CrewProfile> {
  return updateCrewProfile(orgId, crewId, { isActive: false }, actorId);
}

export async function deleteCrewProfile(orgId: string, crewId: string, actorId?: string | null): Promise<{ success: true }> {
  const doc = await getCrewDoc(orgId, crewId);
  if (!doc) throw new Error('Crew not found');

  const events = await colList<CalendarEvent>(orgId, 'calendarEvents');
  await Promise.all(
    events
      .filter((event) => event.crewId === crewId)
      .map((event) =>
        colUpdate(orgId, 'calendarEvents', event.id, {
          crewId: null,
          crewName: null,
          updatedBy: actorId ?? null,
        }),
      ),
  );

  const dispatch = await colList<DispatchBoardEntry>(orgId, 'dispatchBoard');
  await Promise.all(
    dispatch
      .filter((entry) => entry.crewId === crewId)
      .map((entry) =>
        colDelete(orgId, 'dispatchBoard', entry.id),
      ),
  );

  await colDelete(orgId, 'crewSchedules', crewId);
  return { success: true };
}

export async function addCrewMember(
  orgId: string,
  crewId: string,
  userId: string,
  actorId?: string | null,
): Promise<CrewProfile> {
  await assertFieldCrewUser(orgId, userId);
  const doc = await getCrewDoc(orgId, crewId);
  if (!doc) throw new Error('Crew not found');
  if (!doc.data.isActive) throw new Error('Cannot add members to an archived crew');

  const memberUserIds = doc.data.memberUserIds.includes(userId)
    ? doc.data.memberUserIds
    : [...doc.data.memberUserIds, userId];

  await doc.ref.update({
    memberUserIds,
    updatedAt: ts(),
    updatedBy: actorId ?? null,
  });
  const snap = await doc.ref.get();
  return normalizeCrewProfile({ id: snap.id, ...snap.data()! });
}

export async function removeCrewMember(
  orgId: string,
  crewId: string,
  userId: string,
  actorId?: string | null,
): Promise<CrewProfile> {
  const doc = await getCrewDoc(orgId, crewId);
  if (!doc) throw new Error('Crew not found');

  const memberUserIds = doc.data.memberUserIds.filter((id) => id !== userId);
  const update: Record<string, unknown> = {
    memberUserIds,
    updatedAt: ts(),
    updatedBy: actorId ?? null,
  };
  if (doc.data.leaderUserId === userId) update.leaderUserId = null;

  await doc.ref.update(update);
  const snap = await doc.ref.get();
  return normalizeCrewProfile({ id: snap.id, ...snap.data()! });
}

export async function ensureCrews(orgId: string): Promise<CrewProfile[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'crewSchedules')).get();
  if (!snap.empty) {
    const crews = snap.docs
      .map((d) => normalizeCrewProfile({ id: d.id, ...d.data()! }))
      .filter((c) => c.isActive);
    return recalcCrewUtilization(orgId, crews);
  }

  const now = ts();
  const crews: CrewProfile[] = [];
  for (const c of DEFAULT_CREWS) {
    const ref = db.collection(orgPath(orgId, 'crewSchedules')).doc();
    const data = {
      organizationId: orgId,
      ...c,
      scheduledHoursWeek: 0,
      availableHoursWeek: 40,
      utilizationPercent: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(data);
    crews.push(normalizeCrewProfile({ id: ref.id, ...data }));
  }
  return crews;
}

/** YL-S11 — link a schedule crew profile to a Firebase Auth user for field assignment. */
export async function updateCrewProfileAssignedUser(
  orgId: string,
  crewId: string,
  assignedUserId: string | null,
  userId?: string | null,
) {
  await ensureCrews(orgId);
  const existing = await colGet<CrewProfile>(orgId, 'crewSchedules', crewId);
  if (!existing) throw new Error('Crew profile not found');
  const normalized = typeof assignedUserId === 'string' ? assignedUserId.trim() : '';
  return colUpdate(orgId, 'crewSchedules', crewId, {
    assignedUserId: normalized || null,
    updatedBy: userId ?? null,
  }) as Promise<CrewProfile>;
}

async function recalcCrewUtilization(orgId: string, crews: CrewProfile[]) {
  const events = await listCalendarEvents(orgId);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return crews.map((crew) => {
    const crewEvents = events.filter((e) => e.crewId === crew.id && e.startAt >= weekStart && e.startAt < weekEnd);
    const scheduledHours = crewEvents.reduce((s, e) => s + (e.endAt.getTime() - e.startAt.getTime()) / 3600000, 0);
    const availableHoursWeek = 40;
    return { ...crew, scheduledHoursWeek: Math.round(scheduledHours), availableHoursWeek, utilizationPercent: Math.min(100, Math.round((scheduledHours / availableHoursWeek) * 100)) };
  });
}

export async function ensureVehicles(orgId: string): Promise<VehicleSchedule[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'vehicleSchedules')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<VehicleSchedule>({ id: d.id, ...d.data()! }));

  const now = ts();
  const vehicles: VehicleSchedule[] = [];
  for (const v of DEFAULT_VEHICLES) {
    const ref = db.collection(orgPath(orgId, 'vehicleSchedules')).doc();
    const data = { organizationId: orgId, ...v, createdAt: now, updatedAt: now };
    await ref.set(data);
    vehicles.push(mapDoc<VehicleSchedule>({ id: ref.id, ...data }));
  }
  return vehicles;
}

export async function ensureScheduleTemplates(orgId: string): Promise<ScheduleTemplate[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'scheduleTemplates')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<ScheduleTemplate>({ id: d.id, ...d.data()! }));

  const now = ts();
  const templates: ScheduleTemplate[] = [];
  for (const t of DEFAULT_SCHEDULE_TEMPLATES) {
    const ref = db.collection(orgPath(orgId, 'scheduleTemplates')).doc();
    const data = { organizationId: orgId, ...t, createdAt: now, updatedAt: now };
    await ref.set(data);
    templates.push(mapDoc<ScheduleTemplate>({ id: ref.id, ...data }));
  }
  return templates;
}

export async function syncDispatchBoard(orgId: string): Promise<DispatchBoardEntry[]> {
  const crews = await ensureCrews(orgId);
  const events = await listCalendarEvents(orgId, startOfDay(), endOfDay());
  const db = getAdminFirestore();
  const entries: DispatchBoardEntry[] = [];

  for (const crew of crews) {
    const crewEvents = events.filter((e) => e.crewId === crew.id).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const current = crewEvents.find((e) => ['working', 'arrived', 'en_route'].includes(e.dispatchStatus)) ?? crewEvents[0];
    const next = crewEvents.find((e) => e.startAt > (current?.startAt ?? new Date()));

    const data = {
      organizationId: orgId,
      crewId: crew.id,
      crewName: crew.name,
      currentEventId: current?.id ?? null,
      currentJobTitle: current?.title ?? null,
      nextEventId: next?.id ?? null,
      nextJobTitle: next?.title ?? null,
      eta: next?.startAt ?? null,
      status: current?.dispatchStatus ?? 'scheduled',
      routePosition: crewEvents.indexOf(current!) + 1 || null,
      completionPercent: current?.dispatchStatus === 'completed' ? 100 : current ? 50 : 0,
    };

    const existing = await db.collection(orgPath(orgId, 'dispatchBoard')).where('crewId', '==', crew.id).limit(1).get();
    if (existing.empty) {
      const created = await colCreate(orgId, 'dispatchBoard', data) as DispatchBoardEntry;
      entries.push(created);
    } else {
      await existing.docs[0]!.ref.update({ ...data, updatedAt: ts() });
      entries.push(mapDoc<DispatchBoardEntry>({ id: existing.docs[0]!.id, ...data, createdAt: new Date(), updatedAt: new Date() }));
    }
  }
  return entries;
}

export async function listDispatchBoard(orgId: string) {
  await syncDispatchBoard(orgId);
  return colList<DispatchBoardEntry>(orgId, 'dispatchBoard');
}

export async function updateDispatchStatus(orgId: string, dispatchId: string, status: DispatchBoardEntry['status'], opts?: { eta?: Date; completionPercent?: number }, userId?: string | null) {
  await colUpdate(orgId, 'dispatchBoard', dispatchId, { status, eta: opts?.eta ?? null, completionPercent: opts?.completionPercent ?? null, updatedBy: userId });

  const entry = await colGet<DispatchBoardEntry>(orgId, 'dispatchBoard', dispatchId);
  if (entry?.currentEventId) {
    await colUpdate(orgId, 'calendarEvents', entry.currentEventId, { dispatchStatus: status, updatedBy: userId });
    const event = await getCalendarEvent(orgId, entry.currentEventId);
    if (status === 'en_route' && event?.customerId) {
      await triggerAutomation(orgId, 'crew_en_route', event.customerId, { crewName: entry.crewName ?? 'Crew' }, userId).catch(() => {});
    }
    if (status === 'completed' && event?.customerId) {
      await triggerAutomation(orgId, 'job_completed', event.customerId, {}, userId).catch(() => {});
      await syncCustomerPipelineFromAppointment(orgId, event.customerId, event.appointmentType, 'completed', userId);
      if (event.jobId) {
        const jobStage = jobStageFromAppointmentComplete(event.appointmentType) ?? 'installed';
        await colUpdate(orgId, 'jobs', event.jobId, {
          stage: jobStage,
          ...(jobStage === 'installed' ? { installedAt: new Date() } : { removedAt: new Date() }),
        });
      }
    }
  }
  return colGet<DispatchBoardEntry>(orgId, 'dispatchBoard', dispatchId);
}

export async function optimizeRoute(
  orgId: string,
  input: { routeDate: Date; crewId?: string; eventIds: string[]; startLat?: number; startLng?: number },
  userId?: string | null,
) {
  const rawEvents = await Promise.all(
    input.eventIds.map(async (id) => {
      const raw = await colGet<Record<string, unknown>>(orgId, 'calendarEvents', id);
      if (!raw) return null;
      return { id, raw, event: normalizeEvent({ ...raw, id, organizationId: orgId }) };
    }),
  );
  const valid = rawEvents.filter(Boolean) as Array<{
    id: string;
    raw: Record<string, unknown>;
    event: CalendarEvent;
  }>;

  const propertyIds = [...new Set(valid.map((v) => v.event.propertyId).filter(Boolean))] as string[];
  const properties = await Promise.all(
    propertyIds.map((id) =>
      colGet<{ id: string; latitude?: number | null; longitude?: number | null; addressLine1?: string; city?: string; state?: string }>(
        orgId,
        'properties',
        id,
      ),
    ),
  );
  const propertyById = new Map(properties.filter(Boolean).map((p) => [p!.id, p!]));

  type StopPoint = {
    eventId: string;
    event: CalendarEvent;
    lat: number;
    lng: number;
    address?: string | null;
  };

  const withCoords: StopPoint[] = [];
  const withoutCoords: Array<{ eventId: string; event: CalendarEvent; address?: string | null }> = [];

  for (const row of valid) {
    const e = row.event;
    const rawLat = Number(row.raw.latitude ?? row.raw.lat ?? row.raw.startLat);
    const rawLng = Number(row.raw.longitude ?? row.raw.lng ?? row.raw.startLng);
    const property = e.propertyId ? propertyById.get(e.propertyId) : undefined;
    const propLat = typeof property?.latitude === 'number' ? property.latitude : NaN;
    const propLng = typeof property?.longitude === 'number' ? property.longitude : NaN;
    const lat = Number.isFinite(rawLat) ? rawLat : propLat;
    const lng = Number.isFinite(rawLng) ? rawLng : propLng;
    const address =
      e.propertyAddress ??
      (property?.addressLine1
        ? `${property.addressLine1}${property.city ? `, ${property.city}` : ''}${property.state ? ` ${property.state}` : ''}`
        : null);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      withCoords.push({ eventId: e.id, event: e, lat, lng, address });
    } else {
      withoutCoords.push({ eventId: e.id, event: e, address });
    }
  }

  const start =
    input.startLat != null && input.startLng != null
      ? { lat: input.startLat, lng: input.startLng }
      : undefined;

  const originalPoints = withCoords.map((p) => ({ id: p.eventId, lat: p.lat, lng: p.lng }));
  const orderedPoints = nearestNeighborOrder(originalPoints, start);
  const orderedWithCoords = orderedPoints
    .map((p) => withCoords.find((w) => w.eventId === p.id)!)
    .filter(Boolean);

  const originalTourMiles = start
    ? pathDistanceMiles(originalPoints, start)
    : pathDistanceMiles(originalPoints);
  const optimizedTourMiles = start
    ? pathDistanceMiles(
        orderedWithCoords.map((p) => ({ lat: p.lat, lng: p.lng })),
        start,
      )
    : pathDistanceMiles(orderedWithCoords.map((p) => ({ lat: p.lat, lng: p.lng })));

  const orderedStops = [...orderedWithCoords, ...withoutCoords];
  const stops: RoutePlan['stops'] = [];
  let prev: { lat: number; lng: number } | undefined = start;
  let totalDistanceMiles = 0;
  let totalTravelMinutes = 0;
  let arrivalCursor = input.routeDate.getTime();

  for (let i = 0; i < orderedStops.length; i++) {
    const stop = orderedStops[i]!;
    const hasCoords = 'lat' in stop && typeof (stop as StopPoint).lat === 'number';
    let segmentMiles = 0;
    let travelMinutes = 0;

    if (hasCoords) {
      const point = stop as StopPoint;
      if (prev) {
        segmentMiles = haversineMiles(prev.lat, prev.lng, point.lat, point.lng);
        travelMinutes = travelMinutesFromMiles(segmentMiles);
      } else if (i > 0) {
        travelMinutes = 15;
      }
      prev = { lat: point.lat, lng: point.lng };
    } else if (i > 0) {
      travelMinutes = 25;
    }

    totalDistanceMiles += segmentMiles;
    totalTravelMinutes += travelMinutes;
    arrivalCursor += travelMinutes * 60_000;

    const point = hasCoords ? (stop as StopPoint) : null;
    stops.push({
      id: nanoid(),
      eventId: stop.eventId,
      customerName: stop.event.customerName,
      address: stop.address,
      latitude: point?.lat ?? null,
      longitude: point?.lng ?? null,
      arrivalAt: new Date(arrivalCursor),
      travelMinutes,
      order: i + 1,
    });

    // Assume ~45 min on-site before next departure
    arrivalCursor += 45 * 60_000;
  }

  if (totalDistanceMiles <= 0 && optimizedTourMiles > 0) {
    totalDistanceMiles = optimizedTourMiles;
  }
  totalDistanceMiles = Math.round(totalDistanceMiles * 100) / 100;

  const improvement =
    originalTourMiles > 0.01 ? Math.max(0, (originalTourMiles - optimizedTourMiles) / originalTourMiles) : 0;
  const efficiencyScore = Math.round(Math.min(100, Math.max(0, 55 + improvement * 90 - withoutCoords.length * 2)));

  const route = (await colCreate(orgId, 'routes', {
    organizationId: orgId,
    routeDate: input.routeDate,
    crewId: input.crewId ?? null,
    crewName: valid[0]?.event.crewName ?? null,
    stops,
    totalDistanceMiles,
    totalTravelMinutes,
    efficiencyScore,
    createdBy: userId,
    updatedBy: userId,
  })) as RoutePlan;

  return route;
}

export async function listRoutes(orgId: string, date?: Date) {
  const routes = await colList<RoutePlan>(orgId, 'routes');
  if (!date) return routes;
  const day = startOfDay(date);
  return routes.filter((r) => startOfDay(r.routeDate).getTime() === day.getTime());
}

export async function listResourceReservations(orgId: string) {
  return colList<ResourceReservation>(orgId, 'resourceReservations');
}

export async function createResourceReservation(orgId: string, input: Omit<ResourceReservation, keyof import('@clcrm/types').ScheduleAuditFields | 'id' | 'organizationId'>, userId?: string | null) {
  const existing = (await listResourceReservations(orgId)).filter((r) =>
    r.resourceName === input.resourceName &&
    input.startAt < r.endAt && input.endAt > r.startAt,
  );
  if (existing.length) throw new Error(`Resource "${input.resourceName}" already reserved`);

  return colCreate(orgId, 'resourceReservations', { organizationId: orgId, ...input, createdBy: userId, updatedBy: userId }) as Promise<ResourceReservation>;
}

export async function getScheduleDashboard(orgId: string): Promise<ScheduleDashboardKpis> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const events = await listCalendarEvents(orgId);
  const today = events.filter((e) => e.startAt >= todayStart && e.startAt <= todayEnd);
  const crews = await recalcCrewUtilization(orgId, await ensureCrews(orgId));
  const routes = await listRoutes(orgId, todayStart);

  const avgUtil = crews.length ? Math.round(crews.reduce((s, c) => s + c.utilizationPercent, 0) / crews.length) : 0;
  const routeScore = routes.length ? Math.round(routes.reduce((s, r) => s + r.efficiencyScore, 0) / routes.length) : 85;

  return {
    jobsScheduledToday: today.length,
    estimatesScheduled: today.filter((e) => e.category === 'estimate').length,
    installationsScheduled: today.filter((e) => e.category === 'installation').length,
    serviceCallsScheduled: today.filter((e) => e.category === 'service_call').length,
    takedownsScheduled: today.filter((e) => e.category === 'takedown').length,
    openTimeSlots: Math.max(0, crews.length * 4 - today.length),
    crewUtilizationPercent: avgUtil,
    routeEfficiencyScore: routeScore,
    revenueScheduledCents: today.reduce((s, e) => s + e.estimatedRevenueCents, 0),
    capacityRemainingPercent: Math.max(0, 100 - avgUtil),
  };
}

export async function getScheduleAnalytics(orgId: string): Promise<ScheduleAnalytics> {
  const dashboard = await getScheduleDashboard(orgId);
  const events = await listCalendarEvents(orgId);
  const crews = await ensureCrews(orgId);
  const completed = events.filter((e) => e.dispatchStatus === 'completed');
  const onTime = completed.length ? Math.round((completed.length / Math.max(events.length, 1)) * 100) : 92;

  return {
    capacityUtilizationPercent: dashboard.crewUtilizationPercent,
    crewProductivityScore: Math.min(100, dashboard.crewUtilizationPercent + 10),
    scheduleEfficiencyPercent: dashboard.routeEfficiencyScore,
    onTimeArrivalPercent: onTime,
    routePerformanceScore: dashboard.routeEfficiencyScore,
    revenuePerCrewCents: crews.length ? Math.round(events.reduce((s, e) => s + e.estimatedRevenueCents, 0) / crews.length) : 0,
    revenuePerDayCents: dashboard.revenueScheduledCents,
  };
}

export async function getWeatherForecast(
  _orgId: string,
  _days = 5,
): Promise<{ available: false; reason: string; forecasts: [] }> {
  // Production must never fabricate weather. Enable only when a real provider is configured.
  const provider = (process.env.WEATHER_PROVIDER || '').trim();
  const apiKey = (process.env.WEATHER_API_KEY || '').trim();
  if (!provider || !apiKey) {
    return {
      available: false,
      reason: 'Weather provider not configured',
      forecasts: [],
    };
  }
  // Provider adapters can be added without changing schedule UI contracts.
  return {
    available: false,
    reason: `Weather provider "${provider}" is not implemented yet`,
    forecasts: [],
  };
}

export async function getSeasonPlan() {
  return SEASON_PLAN;
}

export async function aiScheduleQuery(orgId: string, question: string) {
  const events = await listCalendarEvents(orgId);
  const crews = await ensureCrews(orgId);
  return aiSchedulingQuery(question, events, crews);
}

export async function sendScheduleNotifications(orgId: string, eventId: string, type: 'confirmation' | 'reminder_48h' | 'reminder_24h' | 'crew_en_route' | 'completion', userId?: string | null) {
  const event = await getCalendarEvent(orgId, eventId);
  if (!event?.customerId) return null;

  const triggers: Record<string, import('@clcrm/types').AutomationTrigger> = {
    confirmation: 'job_scheduled',
    reminder_48h: 'job_scheduled',
    reminder_24h: 'job_scheduled',
    crew_en_route: 'crew_en_route',
    completion: 'job_completed',
  };

  return triggerAutomation(orgId, triggers[type], event.customerId, {
    appointmentDate: event.startAt.toLocaleDateString(),
    address: event.propertyAddress ?? '',
    crewName: event.crewName ?? 'Crew',
  }, userId);
}
