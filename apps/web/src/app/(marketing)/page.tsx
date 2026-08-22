import type { Metadata } from 'next';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { loadCmsPageBundle } from '@/lib/cms-content';
import { applyCmsLocale } from '@/lib/cms-runtime';

/** Edge HTML cache; Creator saves also call revalidatePath. */
export const revalidate = 30;

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  const { page, globals } = await loadCmsPageBundle('home');
  const localized = page ? applyCmsLocale(page, lang || globals.defaultLocale) : null;
  return {
    title: localized?.seo?.title ?? 'Yuletide Lighting | Christmas Light CRM',
    description:
      localized?.seo?.description ??
      'Proposals, invoicing, inventory, crew scheduling, and customer messaging for Christmas light installers.',
    icons: {
      icon: globals.branding.faviconUrl || '/logo.png',
      apple: globals.branding.faviconUrl || '/logo.png',
    },
  };
}

export default async function HomePage({ searchParams }: Props) {
  const { lang } = await searchParams;
  const { page, globals } = await loadCmsPageBundle('home');
  if (!page) {
    return null;
  }
  const localized = applyCmsLocale(page, lang || globals.defaultLocale);
  return <CmsPageView page={localized} globals={globals} locale={lang || globals.defaultLocale} />;
}
