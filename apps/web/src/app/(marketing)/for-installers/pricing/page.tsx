import type { Metadata } from 'next';
import { CrmMarketingFooter, CrmMarketingHeader, CrmPricingView } from '@/components/crm-marketing';
import { loadPricingContent } from '@/lib/tina-content';
import type { PricingContent } from '@/lib/marketing-content-types';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple pricing for Christmas light installation companies. 14-day free trial, 10 users included.',
};

export const revalidate = 60;

export default async function CrmPricingPage() {
  const payload = await loadPricingContent();
  const pricing = payload.data.pricing as PricingContent;

  return (
    <div className="min-h-screen bg-background">
      <CrmMarketingHeader dark={false} />
      <CrmPricingView pricing={pricing} />
      <CrmMarketingFooter />
    </div>
  );
}
