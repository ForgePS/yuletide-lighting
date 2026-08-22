import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | Yuletide Lighting',
  description: 'Terms governing use of the Yuletide Lighting website and related services.',
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        By using the Yuletide Lighting website, customer portals, or related services, you agree to these
        terms. If you use Yuletide CRM as a subscribed organization, the Subscription Terms also apply.
      </p>
      <h2 className="text-lg font-semibold">Acceptable use</h2>
      <p>
        You may not misuse the service, attempt unauthorized access to another organization&apos;s data,
        interfere with platform security, or use the service for unlawful purposes.
      </p>
      <h2 className="text-lg font-semibold">Quotes and proposals</h2>
      <p>
        Website quote requests are invitations to discuss work. Formal scope, pricing, and scheduling are
        confirmed in proposals, agreements, and invoices issued through the CRM or by the operating company.
      </p>
      <h2 className="text-lg font-semibold">Electronic acceptance</h2>
      <p>
        Approving a proposal or signing an agreement electronically (including typed or drawn signature)
        records your identity, timestamp, and related audit metadata and is intended to evidence consent to
        the stated terms.
      </p>
      <h2 className="text-lg font-semibold">Disclaimer</h2>
      <p>
        The website and tools are provided as-is. To the fullest extent permitted by law, we disclaim
        warranties not expressly stated and limit liability for indirect or consequential damages.
      </p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Questions about these terms: contact Yuletide Lighting through the website.</p>
    </LegalPageShell>
  );
}
