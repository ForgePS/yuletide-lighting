import { loadHomeContent } from '@/lib/tina-content';
import { HomePageClient } from '@/components/marketing/home-page-client';
import { HomePageView } from '@/components/marketing/home-page-view';
import type { HomeContent } from '@/lib/marketing-content-types';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Christmas Light Installation in Eastern Arkansas',
  description:
    'Yuletide Lighting Co. provides custom holiday lighting for homes and businesses across DeWitt, Stuttgart, Pine Bluff, and Southeast Arkansas. Free consultation.',
};

export default async function HomePage() {
  const payload = await loadHomeContent();
  const home = payload.data.home as HomeContent;

  if (!payload.query) {
    return <HomePageView home={home} />;
  }

  return (
    <HomePageClient
      query={payload.query}
      variables={payload.variables}
      data={{ home }}
    />
  );
}
