import homeJson from '../../content/marketing/home.json';
import pricingJson from '../../content/marketing/pricing.json';
import type { HomeContent, PricingContent } from '@/lib/marketing-content-types';

export function loadHomeContent(): HomeContent {
  return homeJson as HomeContent;
}

export function loadPricingContent(): PricingContent {
  return pricingJson as PricingContent;
}
