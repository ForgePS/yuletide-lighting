import type { Metadata } from 'next';
import { loadPricingContent } from '@/lib/marketing-content';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { PricingPageView } from '@/components/marketing/pricing-page-view';

async function loadSeason() {
  try {
    const { getPublicSeasonConfig } = await import('@yuletide/firebase');
    const config = await getPublicSeasonConfig();
    if (!config) return null;
    return {
      seasonYear: config.publicMarketingYear ?? config.seasonYear,
      publicMarketingYear: config.publicMarketingYear ?? config.seasonYear,
      installCutoffDate: config.installCutoffDate,
      installCutoff: config.installCutoffDate,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const pricing = loadPricingContent(await loadSeason());
  return {
    title: 'Pricing | Yuletide CRM',
    description: pricing.subtitle || 'Yuletide CRM pricing',
  };
}

export default async function PricingPage() {
  const season = await loadSeason();
  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle('pricing');
    if (bundle.page) {
      return <CmsPageView page={bundle.page} globals={bundle.globals} />;
    }
  } catch {
    // fall through to static marketing
  }
  return <PricingPageView pricing={loadPricingContent(season)} />;
}
