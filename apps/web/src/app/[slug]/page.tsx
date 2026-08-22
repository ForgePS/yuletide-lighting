import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCmsPageBundle } from '@/lib/cms-content';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { applyCmsLocale } from '@/lib/cms-runtime';

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

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  if (RESERVED.has(slug)) return {};
  const { page, globals } = await loadCmsPageBundle(slug);
  if (!page) return {};
  const localized = applyCmsLocale(page, lang || globals.defaultLocale);
  return {
    title: localized.seo.title || globals.defaultSeo.title,
    description: localized.seo.description || globals.defaultSeo.description,
  };
}

export default async function CmsDynamicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  if (RESERVED.has(slug)) notFound();

  const { page, globals } = await loadCmsPageBundle(slug);
  if (!page || page.slug !== slug) notFound();
  const dueScheduled =
    page.status === 'scheduled' &&
    page.scheduledPublishAt &&
    new Date(page.scheduledPublishAt) <= new Date();
  if (page.status !== 'published' && !dueScheduled) notFound();

  const localized = applyCmsLocale(page, lang || globals.defaultLocale);
  return <CmsPageView page={localized} globals={globals} locale={lang || globals.defaultLocale} />;
}
