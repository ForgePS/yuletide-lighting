import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Accessibility | Yuletide Lighting',
  description: 'Accessibility statement for the Yuletide Lighting website and CRM.',
};

export default function AccessibilityPage() {
  return (
    <LegalPageShell title="Accessibility Statement">
      <p>
        Yuletide Lighting aims to make the public website and CRM usable for people of diverse abilities. We
        design for readable contrast, keyboard access where practical, labeled form controls, and responsive
        layouts for mobile and desktop.
      </p>
      <h2 className="text-lg font-semibold">Known limitations</h2>
      <p>
        Some field tools (canvas signatures, map links, photo capture) depend on device capabilities. We
        continue improving loading, empty, and error states across modules.
      </p>
      <h2 className="text-lg font-semibold">Feedback</h2>
      <p>
        If you encounter an accessibility barrier, contact us through the website with the page URL and a
        description of the issue so we can prioritize a fix.
      </p>
    </LegalPageShell>
  );
}
