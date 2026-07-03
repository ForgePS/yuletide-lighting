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
};

export type CrewDashboard = {
  jobsToday: number;
  jobsInProgress: number;
  jobsCompletedToday: number;
  activeCrews: number;
  openIssues: number;
  photosUploadedToday: number;
};
