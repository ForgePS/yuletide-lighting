import type {
  CrewDashboard,
  CrewMobileJobDetail,
  CrewScheduleItem,
  JobActivityAction,
  JobActivityLog,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { colCreate, colGet, colList, colUpdate } from './firestore';
import { consumeJobMaterials } from './inventory';
import { getJob360, syncCustomerPipelineFromJob } from './jobs360';
import { createServiceIssue360 } from './service-issues';
import { listCalendarEvents } from './schedule360';
import { mapTimestampsFromData } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

const DEFAULT_CHECKLIST = [
  { id: 'arrive', label: 'Arrive on site & verify address', done: false },
  { id: 'before_photos', label: 'Capture before photos', done: false },
  { id: 'install', label: 'Complete install per design', done: false },
  { id: 'test', label: 'Test lights & timers', done: false },
  { id: 'after_photos', label: 'Capture after photos', done: false },
  { id: 'walkthrough', label: 'Customer walkthrough / signature', done: false },
  { id: 'cleanup', label: 'Site cleanup', done: false },
];

function normalizeActivity(raw: Record<string, unknown>, orgId: string, id: string): JobActivityLog {
  return {
    id,
    organizationId: orgId,
    jobId: String(raw.jobId ?? ''),
    userId: String(raw.userId ?? ''),
    userName: (raw.userName as string) ?? null,
    action: (raw.action as JobActivityAction) ?? 'job_started',
    notes: (raw.notes as string) ?? null,
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
    metadata: (raw.metadata as Record<string, unknown>) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

export async function logJobActivity(
  orgId: string,
  input: {
    jobId: string;
    userId: string;
    userName?: string | null;
    action: JobActivityAction;
    notes?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const created = await colCreate(orgId, 'jobActivityLogs', {
    jobId: input.jobId,
    userId: input.userId,
    userName: input.userName ?? null,
    action: input.action,
    notes: input.notes ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    metadata: input.metadata ?? null,
    createdBy: input.userId,
    updatedBy: input.userId,
  });
  return normalizeActivity({ ...created, id: created.id }, orgId, created.id);
}

async function listJobActivity(orgId: string, jobId: string) {
  const rows = await colList<Record<string, unknown>>(orgId, 'jobActivityLogs');
  return rows
    .filter((r) => r.jobId === jobId)
    .map((r) => normalizeActivity({ ...r, id: String(r.id) }, orgId, String(r.id)))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function buildScheduleItem(orgId: string, jobId: string): Promise<CrewScheduleItem | null> {
  const detail = await getJob360(orgId, jobId);
  if (!detail?.job || !detail.customer || !detail.property) return null;

  const activity = await listJobActivity(orgId, jobId);
  const checklist = DEFAULT_CHECKLIST.map((item) => {
    let done = false;
    if (item.id === 'before_photos') done = activity.some((a) => a.action === 'photo_uploaded' && a.metadata?.photoType === 'before');
    if (item.id === 'after_photos') done = activity.some((a) => a.action === 'photo_uploaded' && (a.metadata?.photoType === 'after' || a.metadata?.photoType === 'completion'));
    if (item.id === 'install') done = activity.some((a) => a.action === 'job_started');
    if (item.id === 'walkthrough') done = activity.some((a) => a.action === 'signature_captured');
    if (item.id === 'arrive') done = activity.some((a) => a.action === 'clock_in');
    if (item.id === 'cleanup') done = activity.some((a) => a.action === 'job_completed');
    return { ...item, done };
  });

  return {
    job: {
      id: jobId,
      title: detail.job.title,
      stage: detail.job.stage,
      scheduledStart: detail.job.scheduledStart ?? detail.calendarEvent?.startAt ?? null,
      scheduledEnd: detail.job.scheduledEnd ?? detail.calendarEvent?.endAt ?? null,
      jobType: detail.job.jobType ?? null,
    },
    customer: {
      id: detail.customer.id,
      firstName: detail.customer.firstName ?? '',
      lastName: detail.customer.lastName ?? '',
      phone: detail.customer.phone ?? null,
      businessName: detail.customer.businessName ?? null,
    },
    property: {
      id: detail.property.id,
      addressLine1: detail.property.addressLine1,
      city: detail.property.city,
      state: detail.property.state,
      postalCode: detail.property.postalCode,
      installNotes: detail.property.installNotes ?? null,
    },
    checklist,
  };
}

export async function getCrewMySchedule(orgId: string, userId: string, dateInput?: Date) {
  const target = dateInput ?? new Date();
  const jobs = await colList<{
    id: string;
    assignedCrewUserId?: string | null;
    scheduledStart?: Date | null;
    stage?: string;
  }>(orgId, 'jobs');

  const events = await listCalendarEvents(orgId);
  const dayEvents = events.filter((e) => e.startAt && isSameDay(e.startAt, target));

  const jobIds = new Set<string>();
  for (const job of jobs) {
    if (job.assignedCrewUserId === userId) {
      const start = job.scheduledStart;
      if (!start || isSameDay(start instanceof Date ? start : new Date(String(start)), target)) {
        jobIds.add(job.id);
      }
    }
  }
  for (const event of dayEvents) {
    if (event.jobId) jobIds.add(event.jobId);
  }

  const items = await Promise.all([...jobIds].map((id) => buildScheduleItem(orgId, id)));
  return items
    .filter(Boolean)
    .sort((a, b) => {
      const ta = a!.job.scheduledStart?.getTime() ?? 0;
      const tb = b!.job.scheduledStart?.getTime() ?? 0;
      return ta - tb;
    }) as CrewScheduleItem[];
}

export async function getCrewMobileJobDetail(orgId: string, jobId: string, userId: string): Promise<CrewMobileJobDetail | null> {
  const base = await buildScheduleItem(orgId, jobId);
  if (!base) return null;

  const detail = await getJob360(orgId, jobId);
  const activity = await listJobActivity(orgId, jobId);
  const photos = await colList<{ id: string; jobId: string; url: string; photoType?: string; caption?: string }>(orgId, 'jobPhotos');
  const timeEntries = await colList<{ id: string; userId: string; jobId?: string; clockOut?: Date | null }>(orgId, 'timeEntries');
  const activeEntry = timeEntries.find((e) => e.userId === userId && e.jobId === jobId && !e.clockOut);

  return {
    ...base,
    materials: (detail?.materials ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? 'Material',
      quantity: m.quantity,
      status: m.status,
    })),
    mockups: detail?.mockups ?? [],
    photos: photos.filter((p) => p.jobId === jobId).map((p) => ({
      id: p.id,
      url: p.url,
      photoType: (p.photoType as CrewMobileJobDetail['photos'][0]['photoType']) ?? null,
      caption: p.caption ?? null,
    })),
    activity,
    activeTimeEntryId: activeEntry?.id ?? null,
  };
}

export async function crewClockIn(
  orgId: string,
  userId: string,
  userName: string | null | undefined,
  input: { jobId: string; clockIn: Date; latitude?: number; longitude?: number },
) {
  const entry = await colCreate(orgId, 'timeEntries', {
    jobId: input.jobId,
    userId,
    clockIn: input.clockIn,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
  await logJobActivity(orgId, {
    jobId: input.jobId,
    userId,
    userName,
    action: 'clock_in',
    latitude: input.latitude,
    longitude: input.longitude,
  });
  return entry;
}

export async function crewClockOut(orgId: string, userId: string, userName: string | null | undefined, entryId: string) {
  const entry = await colGet<{ jobId?: string }>(orgId, 'timeEntries', entryId);
  await colUpdate(orgId, 'timeEntries', entryId, { clockOut: new Date() });
  if (entry?.jobId) {
    await logJobActivity(orgId, { jobId: entry.jobId, userId, userName, action: 'clock_out' });
  }
  return { success: true };
}

export async function crewStartJob(orgId: string, userId: string, userName: string | null | undefined, jobId: string) {
  await colUpdate(orgId, 'jobs', jobId, { stage: 'installed', installedAt: new Date() });
  await logJobActivity(orgId, { jobId, userId, userName, action: 'job_started' });
  return { success: true };
}

export async function crewCompleteJob(orgId: string, userId: string, userName: string | null | undefined, jobId: string) {
  const job = await colGet<{ customerId?: string; stage?: string }>(orgId, 'jobs', jobId);
  await consumeJobMaterials(orgId, jobId);
  await colUpdate(orgId, 'jobs', jobId, { stage: 'installed', installedAt: new Date(), completionDate: new Date() });
  if (job?.customerId) {
    await syncCustomerPipelineFromJob(orgId, job.customerId, 'installed', userId);
  }
  await logJobActivity(orgId, { jobId, userId, userName, action: 'job_completed' });
  try {
    const { triggerReviewRequestForJob } = await import('./reviews360');
    await triggerReviewRequestForJob(orgId, jobId, userId);
  } catch {
    // Review auto-send should not block job completion
  }
  try {
    const { fireAutomationTrigger } = await import('./automation360');
    const job = await colGet<{ customerId?: string }>(orgId, 'jobs', jobId);
    if (job?.customerId) {
      const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', job.customerId);
      await fireAutomationTrigger(orgId, 'job_completed', {
        customerId: job.customerId,
        customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Customer',
        jobId,
      }, userId);
    }
  } catch {
    // Best-effort automations
  }
  return { success: true };
}

export async function crewUploadPhoto(
  orgId: string,
  userId: string,
  userName: string | null | undefined,
  input: { jobId: string; url: string; photoType?: string; caption?: string },
) {
  const photo = await colCreate(orgId, 'jobPhotos', {
    jobId: input.jobId,
    url: input.url,
    photoType: input.photoType ?? 'during',
    caption: input.caption ?? null,
    uploadedByUserId: userId,
  });
  await logJobActivity(orgId, {
    jobId: input.jobId,
    userId,
    userName,
    action: 'photo_uploaded',
    notes: input.caption ?? null,
    metadata: { photoType: input.photoType ?? 'during', url: input.url },
  });
  return photo;
}

export async function crewReportIssue(
  orgId: string,
  userId: string,
  userName: string | null | undefined,
  input: {
    jobId: string;
    title: string;
    description: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: string;
  },
) {
  const detail = await getJob360(orgId, input.jobId);
  const issue = await createServiceIssue360(
    orgId,
    {
      customerId: detail?.job.customerId ?? '',
      customerName: detail?.customer ? `${detail.customer.firstName ?? ''} ${detail.customer.lastName ?? ''}`.trim() : 'Customer',
      propertyId: detail?.job.propertyId ?? undefined,
      jobId: input.jobId,
      jobTitle: detail?.job.title,
      title: input.title,
      description: input.description,
      category: input.category as never,
      priority: input.priority,
      status: 'reported',
      warranty: false,
      source: 'crew_mobile',
      photoUrls: [],
    },
    userId,
  );
  await logJobActivity(orgId, {
    jobId: input.jobId,
    userId,
    userName,
    action: 'issue_reported',
    notes: input.title,
    metadata: { issueId: issue.id },
  });
  return issue;
}

export async function crewRecordCustomerNotHome(
  orgId: string,
  userId: string,
  userName: string | null | undefined,
  jobId: string,
  notes?: string,
) {
  await logJobActivity(orgId, {
    jobId,
    userId,
    userName,
    action: 'customer_not_home',
    notes: notes ?? 'Customer not home',
  });
  return { success: true };
}

export async function crewSubmitSignature(
  orgId: string,
  userId: string,
  userName: string | null | undefined,
  input: { jobId: string; customerName: string; signatureData: string },
) {
  await colUpdate(orgId, 'jobs', input.jobId, {
    completionSignature: input.signatureData,
    completionSignedBy: input.customerName,
    completionSignedAt: new Date(),
  });
  await logJobActivity(orgId, {
    jobId: input.jobId,
    userId,
    userName,
    action: 'signature_captured',
    notes: `Signed by ${input.customerName}`,
  });
  return { success: true };
}

export async function getCrewDashboard(orgId: string): Promise<CrewDashboard> {
  const today = new Date();
  const jobs = await colList<{ stage?: string; scheduledStart?: Date; completionDate?: Date }>(orgId, 'jobs');
  const issues = await colList<{ status?: string; createdAt?: Date }>(orgId, 'serviceIssues');
  const photos = await colList<{ createdAt?: Date }>(orgId, 'jobPhotos');
  const activity = await colList<{ action?: string; createdAt?: Date }>(orgId, 'jobActivityLogs');

  const jobsToday = jobs.filter((j) => j.scheduledStart && isSameDay(j.scheduledStart instanceof Date ? j.scheduledStart : new Date(String(j.scheduledStart)), today));
  const completedToday = jobs.filter((j) => j.completionDate && isSameDay(j.completionDate instanceof Date ? j.completionDate : new Date(String(j.completionDate)), today));

  return {
    jobsToday: jobsToday.length,
    jobsInProgress: activity.filter((a) => a.action === 'job_started' && a.createdAt && isSameDay(a.createdAt instanceof Date ? a.createdAt : new Date(String(a.createdAt)), today)).length,
    jobsCompletedToday: completedToday.length,
    activeCrews: (await listCalendarEvents(orgId)).filter((e) => e.startAt && isSameDay(e.startAt, today)).length,
    openIssues: issues.filter((i) => ['reported', 'triaged', 'in_progress'].includes(String(i.status))).length,
    photosUploadedToday: photos.filter((p) => p.createdAt && isSameDay(p.createdAt instanceof Date ? p.createdAt : new Date(String(p.createdAt)), today)).length,
  };
}

export async function listCrewJobsForOffice(orgId: string, dateInput?: Date) {
  const target = dateInput ?? new Date();
  const jobs = await colList<{ id: string; scheduledStart?: Date | null }>(orgId, 'jobs');
  const ids = jobs
    .filter((j) => {
      if (!j.scheduledStart) return false;
      const start = j.scheduledStart instanceof Date ? j.scheduledStart : new Date(String(j.scheduledStart));
      return isSameDay(start, target);
    })
    .map((j) => j.id);

  const items = await Promise.all(ids.map((id) => buildScheduleItem(orgId, id)));
  return items.filter(Boolean) as CrewScheduleItem[];
}

export { listJobActivity };
