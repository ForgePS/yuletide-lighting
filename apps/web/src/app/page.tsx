import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCmsPageBundle } from '@/lib/cms-content';
import { CmsPageView } from '@/components/cms/cms-page-view';

export async function generateMetadata(): Promise<Metadata> {
  const { page, globals } = await loadCmsPageBundle('home');
  if (!page) return { title: globals.defaultSeo.title };
  return {
    title: page.seo.title || globals.defaultSeo.title,
    description: page.seo.description || globals.defaultSeo.description,
    robots: {
      index: !page.seo.noIndex,
      follow: !page.seo.noFollow,
    },
    openGraph: {
      title: page.seo.ogTitle || page.seo.title,
      description: page.seo.ogDescription || page.seo.description,
      images: page.seo.ogImageUrl ? [page.seo.ogImageUrl] : undefined,
    },
  };
}

export default async function HomePage() {
  const { page, globals } = await loadCmsPageBundle('home');
  if (!page) notFound();
  return <CmsPageView page={page} globals={globals} />;
}
