import homeJson from '../../content/marketing/home.json';
import pricingJson from '../../content/marketing/pricing.json';
import type { HomeContent, PricingContent } from '@/lib/marketing-content-types';

export type SeasonPlaceholderValues = {
  seasonYear?: number | string | null;
  publicMarketingYear?: number | string | null;
  installCutoffDate?: string | null;
  installCutoff?: string | null;
};

/** Replace {{seasonYear}} / {{installCutoff}} (and aliases) in marketing copy. */
export function applySeasonPlaceholders(
  text: string,
  values: SeasonPlaceholderValues | null | undefined,
): string {
  if (!text || !values) return text;
  const seasonYear = String(values.publicMarketingYear ?? values.seasonYear ?? '');
  const installCutoff = String(values.installCutoff ?? values.installCutoffDate ?? '');
  return text
    .replaceAll('{{seasonYear}}', seasonYear)
    .replaceAll('{{publicMarketingYear}}', seasonYear)
    .replaceAll('{{installCutoff}}', installCutoff)
    .replaceAll('{{installCutoffDate}}', installCutoff);
}

function applyPlaceholdersDeep<T>(value: T, values: SeasonPlaceholderValues | null | undefined): T {
  if (!values) return value;
  if (typeof value === 'string') return applySeasonPlaceholders(value, values) as T;
  if (Array.isArray(value)) {
    return value.map((item) => applyPlaceholdersDeep(item, values)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = applyPlaceholdersDeep(child, values);
    }
    return out as T;
  }
  return value;
}

export function loadHomeContent(season?: SeasonPlaceholderValues | null): HomeContent {
  return applyPlaceholdersDeep(homeJson as HomeContent, season);
}

export function loadPricingContent(season?: SeasonPlaceholderValues | null): PricingContent {
  return applyPlaceholdersDeep(pricingJson as PricingContent, season);
}
