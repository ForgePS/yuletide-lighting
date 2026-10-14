/**
 * YL-S20 — Background job processors (Inngest cron targets).
 * Delivery remains record-first until REAL_EMAIL / REAL_SMS adapters are authorized.
 */

import {
  isProposalFollowUpCandidate,
  PROPOSAL_FOLLOW_UP_STALE_MS,
  shouldRunBackgroundJobsForOrg,
} from '@clcrm/types';
import { getOrganization, colUpdate } from './firestore';
import { isFollowUpAutomationEnabled } from './follow-up-automation';
import { processInvoiceReminders } from './invoices360';
import { sendMessage360 } from './messages360';
import { listProposals360 } from './proposals';

async function isOrgEligibleForJobs(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  return shouldRunBackgroundJobsForOrg(org?.lifecycleStatus);
}

export async function processProposalFollowUps(
  orgId: string,
  opts?: { now?: Date; staleMs?: number },
): Promise<{ processed: number; skippedReason?: string }> {
  if (!(await isOrgEligibleForJobs(orgId))) {
    return { processed: 0, skippedReason: 'org_inactive' };
  }
  if (!(await isFollowUpAutomationEnabled(orgId))) {
    return { processed: 0, skippedReason: 'follow_up_disabled' };
  }

  const now = opts?.now ?? new Date();
  const staleMs = opts?.staleMs ?? PROPOSAL_FOLLOW_UP_STALE_MS;
  const proposals = await listProposals360(orgId);
  let processed = 0;

  for (const proposal of proposals) {
    if (
      !isProposalFollowUpCandidate(
        {
          status: proposal.status,
          followUpAutomationEnabled: proposal.followUpAutomationEnabled,
          lastViewedAt: proposal.lastViewedAt,
          followUpLastSentAt: proposal.followUpLastSentAt,
          customerId: proposal.customerId,
        },
        now,
        staleMs,
      )
    ) {
      continue;
    }

    const customerName = proposal.customerName ?? 'there';
    const propertyName = proposal.propertyAddress ?? 'your property';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app').replace(/\/$/, '');
    const proposalLink = proposal.publicToken ? `${appUrl}/p/${proposal.publicToken}` : '';
    const subject = `Following up on your proposal${proposal.title ? `: ${proposal.title}` : ''}`;
    const body = [
      `Hi ${customerName},`,
      '',
      `I wanted to follow up on the proposal for ${propertyName}.`,
      'Let me know if you have any questions or if you are ready to move forward.',
      proposalLink ? `\nView proposal: ${proposalLink}` : '',
      '',
      'Thank you!',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await sendMessage360(
        orgId,
        {
          customerId: proposal.customerId,
          channel: 'email',
          subject,
          body,
          notificationTrigger: 'proposal_follow_up',
        },
        'system',
        'Automation',
      );
      await colUpdate(orgId, 'proposals', proposal.id, {
        followUpLastSentAt: now,
        updatedBy: 'system',
      });
      processed += 1;
    } catch {
      // Best-effort per proposal — continue batch
    }
  }

  return { processed };
}

export async function processOrgInvoiceReminders(
  orgId: string,
): Promise<{ processed: number; skippedReason?: string }> {
  if (!(await isOrgEligibleForJobs(orgId))) {
    return { processed: 0, skippedReason: 'org_inactive' };
  }
  const result = await processInvoiceReminders(orgId);
  return { processed: result.processed };
}
