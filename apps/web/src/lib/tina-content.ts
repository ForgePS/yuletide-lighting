import homeJson from '../../content/marketing/home.json';
import pricingJson from '../../content/marketing/pricing.json';
import { fetchTinaQuery, hasTinaCloudCredentials } from '@/lib/tina-cloud';
import { HOME_QUERY, PRICING_QUERY } from '@/lib/tina-queries';

type TinaPayload<T> = {
  data: T;
  query: string;
  variables: { relativePath: string };
};

function bundledHome(): TinaPayload<{ home: typeof homeJson }> {
  return {
    data: { home: homeJson },
    query: '',
    variables: { relativePath: 'home.json' },
  };
}

function bundledPricing(): TinaPayload<{ pricing: typeof pricingJson }> {
  return {
    data: { pricing: pricingJson },
    query: '',
    variables: { relativePath: 'pricing.json' },
  };
}

export async function loadHomeContent(): Promise<TinaPayload<{ home: typeof homeJson }>> {
  if (!hasTinaCloudCredentials()) return bundledHome();

  try {
    const variables = { relativePath: 'home.json' };
    const result = await fetchTinaQuery<{ home: typeof homeJson }>(HOME_QUERY, variables);
    return { data: result.data, query: result.query, variables };
  } catch {
    return bundledHome();
  }
}

export async function loadPricingContent(): Promise<TinaPayload<{ pricing: typeof pricingJson }>> {
  if (!hasTinaCloudCredentials()) return bundledPricing();

  try {
    const variables = { relativePath: 'pricing.json' };
    const result = await fetchTinaQuery<{ pricing: typeof pricingJson }>(PRICING_QUERY, variables);
    return { data: result.data, query: result.query, variables };
  } catch {
    return bundledPricing();
  }
}
