import type { Metadata } from 'next';
import { loadHomeContent } from '@/lib/marketing-content';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { HomePageView } from '@/components/marketing/home-page-view';

/** Cache HTML at the edge; CMS edits show within a minute. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Yuletide Lighting | Christmas Light CRM',
  description:
    'Proposals, invoicing, inventory, crew scheduling, and customer messaging for Christmas light installers.',
};

export default async function HomePage() {
  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle('home');
    if (bundle.page) {
      return <CmsPageView page={bundle.page} globals={bundle.globals} />;
    }
  } catch {
    // fall through to static marketing
  }
  return <HomePageView home={loadHomeContent(null)} />;
}
