import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCmsPageBundle } from '@/lib/cms-content';
import { CmsPageView } from '@/components/cms/cms-page-view';

export async function generateMetadata(): Promise<Metadata> {
  const { page, globals } = await loadCmsPageBundle('pricing');
  if (!page) return { title: 'Pricing' };
  return {
    title: page.seo.title || globals.defaultSeo.title,
    description: page.seo.description || globals.defaultSeo.description,
    robots: {
      index: !page.seo.noIndex,
      follow: !page.seo.noFollow,
    },
  };
}

export default async function PricingPage() {
  const { page, globals } = await loadCmsPageBundle('pricing');
  if (!page) notFound();
  return <CmsPageView page={page} globals={globals} />;
}
