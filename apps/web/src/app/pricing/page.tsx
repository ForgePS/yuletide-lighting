import { loadPricingContent } from '@/lib/tina-content';
import { PricingPageClient } from '@/components/marketing/pricing-page-client';
import { PricingPageView } from '@/components/marketing/pricing-page-view';
import type { PricingContent } from '@/lib/marketing-content-types';

export const revalidate = 60;

export default async function PricingPage() {
  const payload = await loadPricingContent();
  const pricing = payload.data.pricing as PricingContent;

  if (!payload.query) {
    return <PricingPageView pricing={pricing} />;
  }

  return (
    <PricingPageClient
      query={payload.query}
      variables={payload.variables}
      data={{ pricing }}
    />
  );
}
