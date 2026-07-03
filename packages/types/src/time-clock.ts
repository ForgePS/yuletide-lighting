export type TimeEntryStatus = 'active' | 'submitted' | 'approved' | 'rejected';

export type TimeEntryWorkType =
  | 'installation'
  | 'takedown'
  | 'service'
  | 'project_prep'
  | 'drive_time'
  | 'warehouse'
  | 'admin'
  | 'other';

export type TimeClockEntry = {
  id: string;
  organizationId: string;
  userId?: string | null;
  userName: string;
  customerId?: string | null;
  customerName?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  workType: TimeEntryWorkType;
  status: TimeEntryStatus;
  clockIn: Date;
  clockOut?: Date | null;
  breakMinutes: number;
  hours: number;
  hourlyRateCents: number;
  laborCostCents: number;
  notes?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type TimeClockSummary = {
  totalEntries: number;
  activeEntries: number;
  totalHours: number;
  laborCostCents: number;
};
