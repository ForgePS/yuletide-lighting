import homeJson from '../../content/marketing/home.json';
import pricingJson from '../../content/marketing/pricing.json';

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

/** Bundled marketing content (Tina Cloud optional; not wired in this branch). */
export async function loadHomeContent(): Promise<TinaPayload<{ home: typeof homeJson }>> {
  return bundledHome();
}

export async function loadPricingContent(): Promise<TinaPayload<{ pricing: typeof pricingJson }>> {
  return bundledPricing();
}
