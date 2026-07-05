import type { Metadata } from 'next';
import {
  CrmCtaSection,
  CrmFeaturesGrid,
  CrmMarketingFooter,
  CrmMarketingHeader,
} from '@/components/crm-marketing';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore every module in Yuletide CRM — pipeline, proposals, crews, sign tracker, inventory, and more.',
};

export default function CrmFeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <CrmMarketingHeader dark={false} />
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Platform features</p>
          <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Everything your install company needs
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One subscription includes the full platform — no per-module upsells.
          </p>
        </div>
        <div className="mt-14">
          <CrmFeaturesGrid />
        </div>
      </main>
      <CrmCtaSection />
      <CrmMarketingFooter />
    </div>
  );
}
