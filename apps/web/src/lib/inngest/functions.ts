import { inngest } from './client';
import { getAdminFirestore, processInvoiceReminders, Timestamp } from '@yuletide/firebase';

export const proposalFollowUp = inngest.createFunction(
  { id: 'proposal-follow-up' },
  { cron: '0 */6 * * *' },
  async () => {
    const db = getAdminFirestore();
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000));
    const snap = await db.collectionGroup('proposals').where('status', '==', 'viewed').where('lastViewedAt', '<', cutoff).get();
    return { processed: snap.size };
  },
);

export const invoiceOverdueReminder = inngest.createFunction(
  { id: 'invoice-overdue-reminder' },
  { cron: '0 9 * * *' },
  async () => {
    const db = getAdminFirestore();
    const orgs = await db.collection('organizations').select().get();
    let total = 0;
    for (const org of orgs.docs) {
      const result = await processInvoiceReminders(org.id);
      total += result.processed;
    }
    return { processed: total };
  },
);
