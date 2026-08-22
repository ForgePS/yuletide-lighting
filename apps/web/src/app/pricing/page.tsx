import type { Metadata } from 'next';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { loadCmsPageBundle } from '@/lib/cms-content';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await loadCmsPageBundle('pricing');
  return {
    title: page?.seo?.title ?? 'Pricing | Yuletide CRM',
    description:
      page?.seo?.description ??
      'Simple monthly and annual pricing for Christmas light installer teams.',
  };
}

export default async function PricingPage() {
  const { page, globals } = await loadCmsPageBundle('pricing');
  if (!page) {
    return null;
  }
  return <CmsPageView page={page} globals={globals} />;
}
