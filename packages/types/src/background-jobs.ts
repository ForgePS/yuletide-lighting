/**
 * YL-S20 — Background job / Inngest pure helpers.
 * Keep cron handlers thin; business predicates live here for unit tests.
 */

import {
  isOrganizationLifecycleActive,
  type OrganizationLifecycleStatus,
} from './organization';
import {
  resolveOutboundMessageStatus,
  type MessageChannel,
  type MessageDeliveryStatus,
} from './messages';
import type { ReminderStatus } from './invoices';
import type { ProposalStatus } from './proposals';

/** Default stale window for viewed proposals (48 hours). */
export const PROPOSAL_FOLLOW_UP_STALE_MS = 48 * 60 * 60 * 1000;

export function shouldRunBackgroundJobsForOrg(
  lifecycleStatus: OrganizationLifecycleStatus | string | null | undefined,
): boolean {
  return isOrganizationLifecycleActive(lifecycleStatus);
}

/**
 * Extract org id from a collection-group doc path:
 * `organizations/{orgId}/proposals/{proposalId}`.
 */
export function orgIdFromOrgNestedPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'organizations' && parts[1]) {
    return parts[1];
  }
  return null;
}

export function isProposalFollowUpCandidate(
  proposal: {
    status?: ProposalStatus | string | null;
    followUpAutomationEnabled?: boolean | null;
    lastViewedAt?: Date | null;
    followUpLastSentAt?: Date | null;
    customerId?: string | null;
  },
  now = new Date(),
  staleMs = PROPOSAL_FOLLOW_UP_STALE_MS,
): boolean {
  if (proposal.status !== 'viewed') return false;
  if (proposal.followUpAutomationEnabled === false) return false;
  if (!proposal.customerId) return false;
  const viewedAt = proposal.lastViewedAt;
  if (!viewedAt || !(viewedAt instanceof Date) || Number.isNaN(viewedAt.getTime())) {
    return false;
  }
  if (now.getTime() - viewedAt.getTime() < staleMs) return false;
  const lastSent = proposal.followUpLastSentAt;
  if (lastSent instanceof Date && !Number.isNaN(lastSent.getTime()) && lastSent >= viewedAt) {
    return false;
  }
  return true;
}

/**
 * Map message delivery contract → invoice reminder status.
 * Never claim provider `sent` unless the adapter is active + REAL_* enabled.
 */
export function resolveInvoiceReminderStatus(input: {
  channel: MessageChannel;
  scheduledAt?: Date | null;
  now?: Date;
  providerAdapterActive?: boolean;
  env?: Record<string, string | undefined>;
}): ReminderStatus {
  const status: MessageDeliveryStatus = resolveOutboundMessageStatus({
    channel: input.channel,
    scheduledAt: input.scheduledAt ?? null,
    now: input.now,
    providerAdapterActive: input.providerAdapterActive ?? false,
    env: input.env,
  });
  if (status === 'queued') return 'scheduled';
  if (status === 'sent') return 'sent';
  return 'recorded';
}

export function formatBackgroundJobLabel(
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
