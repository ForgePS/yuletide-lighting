import type { Metadata } from 'next';
import { DemoEntryExperience } from '@/features/tours/components/demo-entry-experience';
import { YULETIDE_APP_URL } from '@/features/tours/config/app-url';

export const metadata: Metadata = {
  title: 'See Yuletide in Action — Interactive Demo',
  description:
    'Watch an automated demo, take a guided tour, or explore the Yuletide CRM sandbox.',
  alternates: {
    canonical: `${YULETIDE_APP_URL}/demo`,
  },
};

export default function DemoEntryPage() {
  return <DemoEntryExperience />;
}
