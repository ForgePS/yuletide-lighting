import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCmsPageBundle } from '@/lib/cms-content';
import { CmsPageView } from '@/components/cms/cms-page-view';

const RESERVED = new Set([
  'app',
  'creator',
  'sign-in',
  'sign-up',
  'pricing',
  'api',
  'p',
  'pay',
  'portal',
  'm',
  'review',
]);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED.has(slug)) return {};
  const { page, globals } = await loadCmsPageBundle(slug);
  if (!page) return {};
  return {
    title: page.seo.title || globals.defaultSeo.title,
    description: page.seo.description || globals.defaultSeo.description,
  };
}

export default async function CmsDynamicPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const { page, globals } = await loadCmsPageBundle(slug);
  if (!page || page.slug !== slug || page.status !== 'published') notFound();

  return <CmsPageView page={page} globals={globals} />;
}
