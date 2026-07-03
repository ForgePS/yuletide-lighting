import { loadHomeContent } from '@/lib/tina-content';
import { HomePageClient } from '@/components/marketing/home-page-client';
import { HomePageView } from '@/components/marketing/home-page-view';
import type { HomeContent } from '@/lib/marketing-content-types';

export const revalidate = 60;

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
