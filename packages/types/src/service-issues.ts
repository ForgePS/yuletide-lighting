export type ServiceIssueStatus =
  | 'reported'
  | 'triaged'
  | 'scheduled'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type ServiceIssuePriority = 'low' | 'normal' | 'high' | 'urgent';

export type ServiceIssueCategory =
  | 'lights_out'
  | 'timer_issue'
  | 'damage'
  | 'loose_material'
  | 'weather_related'
  | 'customer_request'
  | 'warranty'
  | 'other';

export type ServiceIssue = {
  id: string;
  organizationId: string;
  customerId?: string | null;
  customerName: string;
  propertyId?: string | null;
  propertyLabel?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  title: string;
  description?: string | null;
  category: ServiceIssueCategory;
  priority: ServiceIssuePriority;
  status: ServiceIssueStatus;
  warranty: boolean;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  scheduledAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  resolutionNotes?: string | null;
  photoUrls: string[];
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ServiceIssueSummary = {
  totalIssues: number;
  openIssues: number;
  urgentIssues: number;
  warrantyIssues: number;
};
