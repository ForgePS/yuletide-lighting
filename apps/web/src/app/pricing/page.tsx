import type { Metadata } from 'next';
import { loadPricingContent } from '@/lib/marketing-content';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { PricingPageView } from '@/components/marketing/pricing-page-view';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pricing | Yuletide CRM',
  description: 'Simple monthly and annual pricing for Christmas light installer teams.',
};

export default async function PricingPage() {
  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle('pricing');
    if (bundle.page) {
      return <CmsPageView page={bundle.page} globals={bundle.globals} />;
    }
  } catch {
    // fall through to static marketing
  }
  return <PricingPageView pricing={loadPricingContent(null)} />;
}
