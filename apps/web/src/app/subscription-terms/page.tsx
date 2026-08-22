import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Subscription Terms | Yuletide CRM',
  description: 'Terms for Yuletide CRM SaaS subscriptions, trials, and billing.',
};

export default function SubscriptionTermsPage() {
  return (
    <LegalPageShell title="Subscription Terms">
      <p>
        These terms apply to organizations that subscribe to Yuletide CRM (the &quot;Service&quot;), including
        trial accounts.
      </p>
      <h2 className="text-lg font-semibold">Trials</h2>
      <p>
        Trials begin when an organization is created and last for the platform-configured trial period unless
        extended by Yuletide. When a trial ends without an active subscription, access may be locked until
        billing is completed.
      </p>
      <h2 className="text-lg font-semibold">Billing</h2>
      <p>
        Paid plans renew according to the selected interval (monthly or yearly) through Stripe. Fees are
        non-refundable except where required by law or expressly stated in writing.
      </p>
      <h2 className="text-lg font-semibold">Customer data</h2>
      <p>
        Each organization owns its customer and operational records. Yuletide processes that data to provide
        the Service and will not use another tenant&apos;s records for marketing without authorization.
        Organizations may export data while their account is active.
      </p>
      <h2 className="text-lg font-semibold">Cancellation</h2>
      <p>
        You may cancel at period end through billing settings. After cancellation or lock, retained backups
        follow our retention policy; permanent deletion may be requested subject to legal hold requirements.
      </p>
    </LegalPageShell>
  );
}
