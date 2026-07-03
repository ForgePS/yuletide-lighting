'use client';

import { useTina } from 'tinacms/dist/react';
import { PricingPageView } from '@/components/marketing/pricing-page-view';
import type { PricingContent } from '@/lib/marketing-content-types';

type PricingQueryShape = {
  pricing: PricingContent;
};

type PricingPageClientProps = {
  query: string;
  variables: { relativePath: string };
  data: PricingQueryShape;
};

export function PricingPageClient(props: PricingPageClientProps) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  return <PricingPageView pricing={data.pricing} />;
}
