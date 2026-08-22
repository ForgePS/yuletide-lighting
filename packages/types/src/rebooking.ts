/** Seasonal Rebooking Engine — Sprint 9; helpers hardened YL-S25 */

import { isRebookingEligiblePipelineStage } from './lifecycle';

export type RebookingCampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type RebookingRecordStatus =
  | 'not_sent'
  | 'sent'
  | 'opened'
  | 'rebooked'
  | 'upgrade_requested'
  | 'declined'
  | 'no_response';

export type RebookingAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type RebookingCampaign = RebookingAuditFields & {
  id: string;
  organizationId: string;
  seasonYear: number;
  name: string;
  status: RebookingCampaignStatus;
  startDate?: Date | null;
  targetCustomerIds: string[];
  totalProjectedRevenueCents: number;
  totalBookedRevenueCents: number;
  emailSubject?: string | null;
  emailBody?: string | null;
};

export type RebookingRecord = RebookingAuditFields & {
  id: string;
  organizationId: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  previousProposalId?: string | null;
  previousJobId?: string | null;
  newProposalId?: string | null;
  status: RebookingRecordStatus;
  projectedValueCents: number;
  bookedValueCents: number;
  preferredInstallDate?: Date | null;
  preferredMonth?: string | null;
  lastContactedAt?: Date | null;
  notes?: string | null;
};

export type RebookingDashboard = {
  activeCampaigns: number;
  totalTargets: number;
  notSent: number;
  sent: number;
  rebooked: number;
  declined: number;
  projectedRevenueCents: number;
  bookedRevenueCents: number;
  conversionRatePercent: number;
};

export type RebookingRecordWithCustomer = RebookingRecord & {
  customerEmail?: string | null;
  customerPhone?: string | null;
  previousProposalTitle?: string | null;
};

/** Job stages that qualify a prior-season customer for campaign populate. */
export const REBOOKING_PRIOR_JOB_STAGES = [
  'installed',
  'removed',
  'complete',
  'review_requested',
] as const;

/** Terminal record statuses — process/send should not create duplicate side effects. */
export const REBOOKING_TERMINAL_RECORD_STATUSES: readonly RebookingRecordStatus[] = [
  'rebooked',
  'upgrade_requested',
  'declined',
];

export function formatRebookingLabel(
  value: string | null | undefined,
  fallback = 'Unknown',
): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return fallback;
  return text
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Default campaign season year: next calendar year once June has started
 * (aligns with staff dashboard create CTA).
 */
export function defaultRebookingSeasonYear(now = new Date()): number {
  return now.getFullYear() + (now.getMonth() >= 6 ? 1 : 0);
}

export function isPriorSeasonJobEligibleForRebooking(
  job: {
    stage?: string | null;
    customerId?: string | null;
    installedAt?: Date | string | null;
    removedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
  priorYear: number,
): boolean {
  if (!job.customerId) return false;
  const stage = String(job.stage ?? '');
  if (!(REBOOKING_PRIOR_JOB_STAGES as readonly string[]).includes(stage)) return false;
  const d = job.installedAt ?? job.removedAt ?? job.createdAt;
  if (!d) return false;
  const year =
    d instanceof Date ? d.getFullYear() : new Date(String(d)).getFullYear();
  if (Number.isNaN(year)) return false;
  return year === priorYear;
}

export function isRebookingPopulateCustomerEligible(
  pipelineStage: string | null | undefined,
): boolean {
  return isRebookingEligiblePipelineStage(pipelineStage);
}

/**
 * Whether staff "Send" should flip status / fire outreach again.
 * Terminal + already-contacted statuses are replay-only.
 */
export function shouldSendRebookingOutreach(
  status: RebookingRecordStatus | string | null | undefined,
): boolean {
  if (!status || typeof status !== 'string') return false;
  if ((REBOOKING_TERMINAL_RECORD_STATUSES as readonly string[]).includes(status)) {
    return false;
  }
  return status === 'not_sent' || status === 'no_response';
}

export function isRebookingRecordTerminal(
  status: RebookingRecordStatus | string | null | undefined,
): boolean {
  if (!status || typeof status !== 'string') return false;
  return (REBOOKING_TERMINAL_RECORD_STATUSES as readonly string[]).includes(status);
}
