import { inngest } from './client';
import {
  getAdminFirestore,
  processOrgInvoiceReminders,
  processProposalFollowUps,
  publishDueScheduledCmsPages,
  runCmsBrokenLinkCheck,
} from '@yuletide/firebase';
import { shouldRunBackgroundJobsForOrg } from '@clcrm/types';

/**
 * YL-S20 — proposal follow-up cron.
 * Record-first outbound via processProposalFollowUps (gated by org flag + lifecycle).
 */
export const proposalFollowUp = inngest.createFunction(
  { id: 'proposal-follow-up' },
  { cron: '0 */6 * * *' },
  async () => {
    const db = getAdminFirestore();
    const orgs = await db.collection('organizations').get();
    let processed = 0;
    let skipped = 0;
    for (const org of orgs.docs) {
      const lifecycle = org.data()?.lifecycleStatus;
      if (!shouldRunBackgroundJobsForOrg(lifecycle)) {
        skipped += 1;
        continue;
      }
      const result = await processProposalFollowUps(org.id);
      processed += result.processed;
      if (result.skippedReason) skipped += 1;
    }
    return { processed, orgsSkippedOrDisabled: skipped };
  },
);

/**
 * YL-S20 — invoice overdue reminder cron.
 * Per-org processor; inactive orgs skipped; reminder rows use honest recorded status.
 */
export const invoiceOverdueReminder = inngest.createFunction(
  { id: 'invoice-overdue-reminder' },
  { cron: '0 9 * * *' },
  async () => {
    const db = getAdminFirestore();
    const orgs = await db.collection('organizations').get();
    let processed = 0;
    let skipped = 0;
    for (const org of orgs.docs) {
      const result = await processOrgInvoiceReminders(org.id);
      processed += result.processed;
      if (result.skippedReason) skipped += 1;
    }
    return { processed, orgsSkipped: skipped };
  },
);

/**
 * YL-S27 — publish CMS pages whose scheduledPublishAt is due.
 */
export const cmsScheduledPublish = inngest.createFunction(
  { id: 'cms-scheduled-publish' },
  { cron: '*/5 * * * *' },
  async () => {
    const result = await publishDueScheduledCmsPages();
    return result;
  },
);

/**
 * YL-S30 — weekly CMS broken-link crawl.
 */
export const cmsBrokenLinkCheck = inngest.createFunction(
  { id: 'cms-broken-link-check' },
  { cron: '0 6 * * 1' },
  async () => {
    return runCmsBrokenLinkCheck();
  },
);
