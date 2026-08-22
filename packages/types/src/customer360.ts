/** Customer 360 domain types — Sprint CUST-001 */

export type CustomerType = 'residential' | 'commercial' | 'hoa' | 'municipal' | 'church' | 'school';

export type CustomerStatus =
  | 'lead'
  | 'active'
  | 'scheduled'
  | 'installed'
  | 'takedown_pending'
  | 'storage'
  | 'at_risk'
  | 'archived';

/** Lifecycle pipeline stage (Sprint 1 + Phase 1 lead stages) */
export type CustomerStage =
  | 'new_lead'
  | 'attempting_contact'
  | 'contacted'
  | 'qualified'
  | 'consultation_scheduled'
  | 'consultation_completed'
  | 'design_in_progress'
  | 'needs_estimate'
  | 'mockup_needed'
  | 'proposal_draft'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'follow_up_required'
  | 'approved'
  | 'deposit_paid'
  | 'scheduled'
  | 'installed'
  | 'balance_due'
  | 'paid'
  | 'removal_scheduled'
  | 'removed'
  | 'stored'
  | 'rebook_next_season'
  | 'deferred'
  | 'lost';

export type PreferredContactMethod = 'phone' | 'email' | 'sms';

export type HealthRating = 'excellent' | 'good' | 'moderate' | 'at_risk';

export type SiteHazard =
  | 'steep_roof'
  | 'power_lines'
  | 'dog_present'
  | 'locked_gate'
  | 'irrigation_hazards'
  | 'pool_area'
  | 'limited_parking'
  | 'other';

export type PropertyPhotoType =
  | 'front_elevation'
  | 'side_elevation'
  | 'rear_elevation'
  | 'aerial'
  | 'drone'
  | 'completed_install';

export type ActivityType =
  | 'lead_created'
  | 'consultation_scheduled'
  | 'consultation_completed'
  | 'estimate_sent'
  | 'estimate_approved'
  | 'design_created'
  | 'design_modified'
  | 'design_approved'
  | 'installation_scheduled'
  | 'installation_completed'
  | 'takedown_scheduled'
  | 'takedown_completed'
  | 'invoice_created'
  | 'payment_received'
  | 'refund_issued'
  | 'email_sent'
  | 'sms_sent'
  | 'phone_call_logged'
  | 'note_added'
  | 'proposal_accepted'
  | 'job_created';

export type DesignStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';

export type JobType =
  | 'installation'
  | 'takedown'
  | 'service_call'
  | 'repair'
  | 'warranty'
  | 'permanent_lighting_install';

export type JobStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CustomerJobStatus = JobStatus;

export type StorageCategory =
  | 'c9_lights'
  | 'mini_lights'
  | 'wreaths'
  | 'garland'
  | 'timers'
  | 'extension_cords'
  | 'controllers'
  | 'power_supplies'
  | 'clips'
  | 'stakes'
  | 'other';

export type StorageCondition = 'excellent' | 'good' | 'damaged' | 'replace';

export type CommunicationType = 'phone' | 'email' | 'sms' | 'internal_note' | 'portal_message';

export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';

export type FollowUpTrigger =
  | 'estimate_sent'
  | 'estimate_not_accepted_3d'
  | 'estimate_not_accepted_7d'
  | 'estimate_not_accepted_14d'
  | 'installation_completed'
  | 'review_request'
  | 'august_early_booking'
  | 'september_design_review'
  | 'october_final_scheduling'
  | 'january_storage_renewal';

export type FollowUpDeliveryMethod = 'email' | 'sms';

export type FollowUpRuleStatus = 'active' | 'inactive';

export type AuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type Customer = AuditFields & {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  referralSource?: string | null;
  assignedSalespersonId?: string | null;
  assignedSalespersonName?: string | null;
  email?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  preferredContactMethod: PreferredContactMethod;
  notes?: string | null;
  tags: string[];
  smsOptIn: boolean;
  emailOptIn: boolean;
  billingSameAsPhysical: boolean;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  mailingSameAsBilling: boolean;
  mailingAddressLine1?: string | null;
  mailingAddressLine2?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingPostalCode?: string | null;
  archivedAt?: Date | null;
  /** Lifecycle pipeline (Sprint 1) */
  pipelineStage?: CustomerStage | null;
  previousPipelineStage?: CustomerStage | null;
  stageUpdatedAt?: Date | null;
  pipelineAssignedTo?: string | null;
  pipelineEstimatedValueCents?: number | null;
  nextAction?: string | null;
  nextActionDue?: Date | null;
};

export type PropertyPhotos = Partial<Record<PropertyPhotoType, string>>;

export type PropertyProfileType =
  | 'residential'
  | 'commercial'
  | 'hoa'
  | 'municipal'
  | 'church'
  | 'other';

export type InstallComplexity = 'low' | 'medium' | 'high' | 'extreme';

export type PropertyGalleryPhoto = {
  id: string;
  url: string;
  label?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: Date | null;
};

export type Property = AuditFields & {
  id: string;
  customerId: string;
  propertyName: string;
  propertyType?: string | null;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  gateCode?: string | null;
  hoaInfo?: string | null;
  accessInstructions?: string | null;
  installNotes?: string | null;
  powerSourceLocations?: string | null;
  gfciNotes?: string | null;
  ladderAccessPoints?: string | null;
  ladderRequired?: boolean;
  liftRequired?: boolean;
  roofMeasurementNotes?: string | null;
  estimatedRooflineFeet?: number | null;
  peaks?: number | null;
  treeCount?: number | null;
  shrubCount?: number | null;
  wreathLocations?: string | null;
  garlandLocations?: string | null;
  siteHazards: SiteHazard[];
  siteHazardNotes?: string | null;
  installComplexity?: InstallComplexity | null;
  previousYearDesignNotes?: string | null;
  photos: PropertyPhotos;
  galleryPhotos?: PropertyGalleryPhoto[];
};

export type CustomerActivity = AuditFields & {
  id: string;
  customerId: string;
  activityType: ActivityType;
  description: string;
  userId?: string | null;
  userName?: string | null;
  relatedRecordType?: string | null;
  relatedRecordId?: string | null;
  relatedRecordLabel?: string | null;
  occurredAt: Date;
};

export type DesignRecord = AuditFields & {
  id: string;
  customerId: string;
  propertyId?: string | null;
  propertyName?: string | null;
  designName: string;
  versionNumber: number;
  designerId?: string | null;
  designerName?: string | null;
  status: DesignStatus;
  revisionNotes?: string | null;
  originalPhotoUrl?: string | null;
  mockupImageUrl?: string | null;
  installedResultPhotoUrl?: string | null;
};

export type JobRecord = AuditFields & {
  id: string;
  customerId: string;
  propertyId?: string | null;
  propertyName?: string | null;
  jobType: JobType;
  title: string;
  scheduledDate?: Date | null;
  completionDate?: Date | null;
  assignedCrewIds: string[];
  assignedCrewNames: string[];
  laborHours?: number | null;
  materialsUsed?: string | null;
  revenueCents: number;
  status: JobStatus;
  crewNotes?: string | null;
  beforePhotoUrls: string[];
  duringPhotoUrls: string[];
  completedPhotoUrls: string[];
};

/** YL-S9 — null-safe display label for org pipeline stages / CRM job statuses. */
export function formatJobStageLabel(stage: string | null | undefined): string {
  const value = typeof stage === 'string' ? stage.trim() : '';
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * YL-S9 — map CRM Job History status → org pipeline `stage`.
 * Manual customer jobs enter the board at `accepted_proposal` (not orphan `pending`).
 */
export function mapCrmJobStatusToOrgStage(status: JobStatus | string | null | undefined): string {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'in_progress':
      return 'scheduled';
    case 'completed':
      return 'installed';
    case 'cancelled':
      return 'lost';
    case 'draft':
    default:
      return 'accepted_proposal';
  }
}

/** YL-S9 — map org pipeline `stage` → CRM Job History `status`. */
export function mapOrgJobStageToCrmStatus(stage: string | null | undefined): JobStatus {
  switch (stage) {
    case 'scheduled':
      return 'scheduled';
    case 'installed':
    case 'removal_scheduled':
    case 'removed':
    case 'review_requested':
    case 'complete':
      return 'completed';
    case 'lost':
      return 'cancelled';
    case 'draft_proposal':
    case 'sent_proposal':
    case 'accepted_proposal':
    case 'invoiced':
    case 'deposit_paid':
    case 'inventory_reserved':
    case 'pending':
    default:
      return 'draft';
  }
}

/** YL-S9 — staff may reserve inventory after accept / invoice / deposit. */
export function canReserveJobInventory(stage: string | null | undefined): boolean {
  return stage === 'accepted_proposal' || stage === 'invoiced' || stage === 'deposit_paid';
}

/** YL-S9 — staff may schedule from mid-pipeline prep stages. */
export function canScheduleJob(stage: string | null | undefined): boolean {
  return (
    stage === 'accepted_proposal' ||
    stage === 'invoiced' ||
    stage === 'deposit_paid' ||
    stage === 'inventory_reserved'
  );
}

/** YL-S9 — mark installed when scheduled (or reserved if schedule was skipped). */
export function canMarkJobInstalled(stage: string | null | undefined): boolean {
  return stage === 'scheduled' || stage === 'inventory_reserved';
}

export type StorageInventoryItem = AuditFields & {
  id: string;
  customerId: string;
  itemName: string;
  category: StorageCategory;
  quantity: number;
  condition: StorageCondition;
  purchaseDate?: Date | null;
  replacementCostCents?: number | null;
  notes?: string | null;
  warehouseBuilding?: string | null;
  row?: string | null;
  shelf?: string | null;
  bin?: string | null;
  barcodeValue?: string | null;
};

export type CommunicationRecord = AuditFields & {
  id: string;
  customerId: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string | null;
  body: string;
  employeeId?: string | null;
  employeeName?: string | null;
  occurredAt: Date;
  followUpRequired: boolean;
  followUpDate?: Date | null;
  relatedPropertyId?: string | null;
  relatedJobId?: string | null;
  relatedQuoteId?: string | null;
};

export type FollowUpRule = AuditFields & {
  id: string;
  organizationId: string;
  trigger: FollowUpTrigger;
  name: string;
  enabled: boolean;
  messageTemplate: string;
  deliveryMethod: FollowUpDeliveryMethod;
  status: FollowUpRuleStatus;
};

export type CustomerPortalAccess = {
  enabled: boolean;
  status?: string;
  inviteSentAt?: Date | null;
  lastLoginAt?: Date | null;
  /** Always null for normal reads after P2-S7A — raw magic URL is one-time on enable/rotate only. */
  accessUrl?: string | null;
  accessLinkPlaceholder: string;
  /** True when portal is enabled; does not imply a recoverable stored raw token. */
  credentialConfigured?: boolean;
};

export type CustomerInsights = {
  renewalProbability: number;
  churnRisk: 'low' | 'medium' | 'high';
  suggestedUpsells: string[];
  revenueForecastCents: number;
  recommendedNextAction: string;
  healthScore: number;
  healthRating: HealthRating;
};

export type CustomerOverviewStats = {
  lifetimeRevenueCents: number;
  currentSeasonRevenueCents: number;
  outstandingBalanceCents: number;
  averageAnnualSpendCents: number;
  totalQuotes: number;
  totalJobs: number;
  totalInstalls: number;
  totalTakedowns: number;
  totalServiceCalls: number;
  renewalProbability: number;
  healthScore: number;
  healthRating: HealthRating;
  lastJobDate?: Date | null;
  nextScheduledJobDate?: Date | null;
};

export type CustomerListItem = Customer & {
  primaryProperty?: Property | null;
  lifetimeRevenueCents: number;
  lastJobDate?: Date | null;
  nextScheduledJobDate?: Date | null;
};

export type CustomerPipelineItem = {
  id: string;
  customerId: string;
  stage: CustomerStage;
  previousStage?: CustomerStage | null;
  stageUpdatedAt?: Date | null;
  assignedTo?: string | null;
  estimatedValueCents: number;
  nextAction?: string | null;
  nextActionDue?: Date | null;
  isOverdue: boolean;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  customerType: CustomerType;
  email?: string | null;
  phone?: string | null;
  primaryProperty?: Property | null;
};

export type CustomerPipelineColumn = {
  stage: CustomerStage;
  count: number;
  revenueCents: number;
  customers: CustomerPipelineItem[];
};

export type PropertyListEntry = Property & {
  customerName: string;
  customerId: string;
};
