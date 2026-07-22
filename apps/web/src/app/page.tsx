import type { Metadata } from 'next';
import { loadHomeContent } from '@/lib/marketing-content';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { HomePageView } from '@/components/marketing/home-page-view';

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
  const home = loadHomeContent(await loadSeason());
  return {
    title: 'Yuletide Lighting | Christmas Light CRM',
    description: home.subheadline || 'Christmas light installation CRM',
  };
}

export default async function HomePage() {
  const season = await loadSeason();
  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle('home');
    if (bundle.page) {
      return <CmsPageView page={bundle.page} globals={bundle.globals} />;
    }
  } catch {
    // fall through to static marketing
  }
  return <HomePageView home={loadHomeContent(season)} />;
}
