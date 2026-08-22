import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Yuletide Lighting',
  description: 'How Yuletide Lighting and the Yuletide CRM collect, use, and protect personal information.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        Yuletide Lighting (&quot;we&quot;, &quot;us&quot;) operates the public website and the Yuletide CRM
        platform. This policy describes how we handle personal information for website visitors, customers,
        and subscribed lighting companies.
      </p>
      <h2 className="text-lg font-semibold">Information we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Contact details you submit on quote forms (name, email, phone, message)</li>
        <li>Account information for CRM users (name, email, organization)</li>
        <li>Customer and job records entered by subscribed organizations</li>
        <li>Payment metadata processed by Stripe (we do not store raw card numbers)</li>
        <li>Technical logs such as IP address, device, and usage events for security and reliability</li>
      </ul>
      <h2 className="text-lg font-semibold">How we use information</h2>
      <p>
        We use information to respond to inquiries, provide CRM services, process payments, send operational
        messages you request or expect (proposals, invoices, schedule updates), improve the product, and
        protect against abuse.
      </p>
      <h2 className="text-lg font-semibold">Sharing</h2>
      <p>
        We share data with processors that help us operate the service (hosting, authentication, payments,
        email/SMS). We do not sell personal information. Organization data remains scoped to that tenant.
      </p>
      <h2 className="text-lg font-semibold">Retention & security</h2>
      <p>
        We retain records for as long as needed to provide the service and meet legal obligations. Access is
        protected by authentication, organization scoping, and role permissions.
      </p>
      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Questions about privacy: use the contact form on our website or your account administrator.</p>
    </LegalPageShell>
  );
}
