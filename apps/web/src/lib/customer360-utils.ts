import type {
  ActivityType,
  CommunicationType,
  JobStatus,
  CustomerStatus,
  CustomerType,
  DesignStatus,
  HealthRating,
  JobType,
  SiteHazard,
  StorageCategory,
  StorageCondition,
} from '@clcrm/types';
import { formatCurrency, formatDate } from '@clcrm/ui';

export const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'church', label: 'Church' },
  { value: 'school', label: 'School' },
];

export const CUSTOMER_STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'installed', label: 'Installed' },
  { value: 'takedown_pending', label: 'Takedown Pending' },
  { value: 'storage', label: 'Storage' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'archived', label: 'Archived' },
];

export const FILTER_CHIPS: { group: 'type' | 'status'; value: string; label: string }[] = [
  ...CUSTOMER_TYPE_OPTIONS.map((o) => ({ group: 'type' as const, value: o.value, label: o.label })),
  ...CUSTOMER_STATUS_OPTIONS.map((o) => ({ group: 'status' as const, value: o.value, label: o.label })),
];

export const SITE_HAZARD_OPTIONS: { value: SiteHazard; label: string }[] = [
  { value: 'steep_roof', label: 'Steep roof' },
  { value: 'power_lines', label: 'Power lines' },
  { value: 'dog_present', label: 'Dog present' },
  { value: 'locked_gate', label: 'Locked gate' },
  { value: 'irrigation_hazards', label: 'Irrigation hazards' },
  { value: 'pool_area', label: 'Pool area' },
  { value: 'limited_parking', label: 'Limited parking' },
  { value: 'other', label: 'Other' },
];

export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'installation', label: 'Installation' },
  { value: 'takedown', label: 'Takedown' },
  { value: 'service_call', label: 'Service Call' },
  { value: 'repair', label: 'Repair' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'permanent_lighting_install', label: 'Permanent Lighting Install' },
];

export const JOB_STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STORAGE_CATEGORY_OPTIONS: { value: StorageCategory; label: string }[] = [
  { value: 'c9_lights', label: 'C9 lights' },
  { value: 'mini_lights', label: 'Mini lights' },
  { value: 'wreaths', label: 'Wreaths' },
  { value: 'garland', label: 'Garland' },
  { value: 'timers', label: 'Timers' },
  { value: 'extension_cords', label: 'Extension cords' },
  { value: 'controllers', label: 'Controllers' },
  { value: 'power_supplies', label: 'Power supplies' },
  { value: 'clips', label: 'Clips' },
  { value: 'stakes', label: 'Stakes' },
  { value: 'other', label: 'Other' },
];

export const STORAGE_CONDITION_OPTIONS: { value: StorageCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'replace', label: 'Replace' },
];

export const COMMUNICATION_TYPE_OPTIONS: { value: CommunicationType; label: string }[] = [
  { value: 'phone', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'internal_note', label: 'Internal note' },
  { value: 'portal_message', label: 'Portal message' },
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  lead_created: 'Lead Created',
  consultation_scheduled: 'Consultation Scheduled',
  estimate_sent: 'Estimate Sent',
  estimate_approved: 'Estimate Approved',
  design_created: 'Design Created',
  design_modified: 'Design Modified',
  design_approved: 'Design Approved',
  installation_scheduled: 'Installation Scheduled',
  installation_completed: 'Installation Completed',
  takedown_scheduled: 'Takedown Scheduled',
  takedown_completed: 'Takedown Completed',
  invoice_created: 'Invoice Created',
  payment_received: 'Payment Received',
  refund_issued: 'Refund Issued',
  email_sent: 'Email Sent',
  sms_sent: 'SMS Sent',
  phone_call_logged: 'Phone Call Logged',
  note_added: 'Note Added',
};

export const DESIGN_STATUS_OPTIONS: { value: DesignStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export function labelCustomerType(value?: string | null) {
  return CUSTOMER_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? 'Residential';
}

export function labelCustomerStatus(value?: string | null) {
  return CUSTOMER_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? 'Lead';
}

export function labelHealthRating(value: HealthRating) {
  const map: Record<HealthRating, string> = {
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    at_risk: 'At Risk',
  };
  return map[value];
}

export function healthBadgeClass(rating: HealthRating) {
  const map: Record<HealthRating, string> = {
    excellent: 'bg-emerald-100 text-emerald-800',
    good: 'bg-sky-100 text-sky-800',
    moderate: 'bg-amber-100 text-amber-800',
    at_risk: 'bg-red-100 text-red-800',
  };
  return map[rating];
}

export function statusBadgeClass(status?: string | null) {
  const map: Record<string, string> = {
    lead: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-800',
    scheduled: 'bg-blue-100 text-blue-800',
    installed: 'bg-indigo-100 text-indigo-800',
    takedown_pending: 'bg-amber-100 text-amber-800',
    storage: 'bg-violet-100 text-violet-800',
    at_risk: 'bg-red-100 text-red-800',
    archived: 'bg-neutral-200 text-neutral-600',
  };
  return map[status ?? 'lead'] ?? map.lead;
}

export function customerDisplayName(customer: { firstName: string; lastName: string; businessName?: string | null }) {
  if (customer.businessName?.trim()) return customer.businessName;
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export { formatCurrency, formatDate };
