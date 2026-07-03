'use client';

import { useTina } from 'tinacms/dist/react';
import { HomePageView } from '@/components/marketing/home-page-view';
import type { HomeContent } from '@/lib/marketing-content-types';

type HomeQueryShape = {
  home: HomeContent;
};

type HomePageClientProps = {
  query: string;
  variables: { relativePath: string };
  data: HomeQueryShape;
};

export function HomePageClient(props: HomePageClientProps) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  return <HomePageView home={data.home} />;
}
