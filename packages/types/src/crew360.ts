/** Crew Mobile Operations — Sprint 11 / Phase 3 */

export type JobActivityAction =
  | 'clock_in'
  | 'clock_out'
  | 'job_started'
  | 'job_completed'
  | 'photo_uploaded'
  | 'material_used'
  | 'issue_reported'
  | 'customer_not_home'
  | 'signature_captured'
  | 'damage_reported';

export type CrewPhotoType = 'before' | 'during' | 'after' | 'completion';

export type CrewAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type JobActivityLog = CrewAuditFields & {
  id: string;
  organizationId: string;
  jobId: string;
  userId: string;
  userName?: string | null;
  action: JobActivityAction;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type CrewScheduleItem = {
  job: {
    id: string;
    title: string;
    stage: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    jobType?: string | null;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    businessName?: string | null;
  };
  property: {
    id: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode?: string;
    installNotes?: string | null;
  };
  checklist: Array<{ id: string; label: string; done: boolean }>;
};

export type CrewMobileJobDetail = CrewScheduleItem & {
  materials: Array<{ id: string; name: string; quantity: number; status: string }>;
  mockups: Array<{ id: string; name: string; imageUrl: string }>;
  photos: Array<{ id: string; url: string; photoType?: CrewPhotoType | null; caption?: string | null }>;
  activity: JobActivityLog[];
  activeTimeEntryId?: string | null;
  scopeSummary?: string | null;
  safetyNotes?: string | null;
  accessNotes?: string | null;
  mockupPhotoUrls?: string[] | null;
  approvedPackageName?: string | null;
  installNotes?: string | null;
};

export type CrewDashboard = {
  jobsToday: number;
  jobsInProgress: number;
  jobsCompletedToday: number;
  activeCrews: number;
  openIssues: number;
  photosUploadedToday: number;
};

/** YL-S11 — calendar-day equality in local time. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CrewScheduleJobRow = {
  id: string;
  assignedCrewUserId?: string | null;
  assignedCrewId?: string | null;
  scheduledStart?: Date | string | null;
};

export type CrewScheduleEventRow = {
  jobId?: string | null;
  crewId?: string | null;
};

/**
 * YL-S11 — which jobs belong on a crew member's day schedule.
 * Does not include every calendar event for the day.
 */
export function collectCrewScheduleJobIds(input: {
  userId: string;
  targetDate: Date;
  jobs: CrewScheduleJobRow[];
  dayEvents: CrewScheduleEventRow[];
  /** crewSchedules profile id → Auth user id */
  crewUserByProfileId: Record<string, string | null | undefined>;
}): string[] {
  const { userId, targetDate, jobs, dayEvents, crewUserByProfileId } = input;
  const ids = new Set<string>();

  const profileOwnedByUser = (crewProfileId: string | null | undefined) =>
    Boolean(crewProfileId && crewUserByProfileId[crewProfileId] === userId);

  for (const job of jobs) {
    const assigned =
      job.assignedCrewUserId === userId || profileOwnedByUser(job.assignedCrewId ?? null);
    if (!assigned) continue;
    const start = toDate(job.scheduledStart);
    // Require a start on the target day (no more “no start ⇒ every day”).
    if (!start || !isSameCalendarDay(start, targetDate)) continue;
    ids.add(job.id);
  }

  for (const event of dayEvents) {
    if (!event.jobId) continue;
    if (profileOwnedByUser(event.crewId ?? null)) ids.add(event.jobId);
  }

  return [...ids];
}

/** YL-S11 — whether a crew Auth user may mutate a job in the field. */
export function isCrewAssignedToJob(input: {
  userId: string;
  job: { assignedCrewUserId?: string | null; assignedCrewId?: string | null };
  eventCrewIds?: Array<string | null | undefined>;
  crewUserByProfileId: Record<string, string | null | undefined>;
}): boolean {
  if (input.job.assignedCrewUserId === input.userId) return true;
  if (input.job.assignedCrewId && input.crewUserByProfileId[input.job.assignedCrewId] === input.userId) {
    return true;
  }
  for (const crewId of input.eventCrewIds ?? []) {
    if (crewId && input.crewUserByProfileId[crewId] === input.userId) return true;
  }
  return false;
}

/** YL-S11 — null-safe activity action label. */
export function formatCrewActivityLabel(action: string | null | undefined): string {
  const value = typeof action === 'string' ? action.trim() : '';
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}
