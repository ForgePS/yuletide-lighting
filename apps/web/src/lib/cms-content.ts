import { cache } from 'react';
import {
  buildDefaultHomePage,
  buildDefaultPricingPage,
  buildDefaultSiteGlobals,
  type CmsPage,
  type CmsSiteGlobals,
} from '@clcrm/types';
import { applySeasonPlaceholders, type SeasonPlaceholderValues } from '@/lib/marketing-content';

function applySeasonToCmsPage(page: CmsPage, season: SeasonPlaceholderValues | null): CmsPage {
  if (!season) return page;
  return JSON.parse(
    applySeasonPlaceholders(JSON.stringify(page), season),
  ) as CmsPage;
}

async function loadSeasonPlaceholders(): Promise<SeasonPlaceholderValues | null> {
  try {
    const { getPublicSeasonConfig } = await import('@yuletide/firebase');
    const config = await getPublicSeasonConfig();
    if (!config) return null;
    return {
      seasonYear: config.publicMarketingYear ?? config.seasonYear,
      publicMarketingYear: config.publicMarketingYear ?? config.seasonYear,
      installCutoffDate: config.installCutoffDate,
      installCutoff: config.installCutoffDate,
    };
  } catch {
    return null;
  }
}

async function loadCmsPageBundleUncached(slug: string): Promise<{
  page: CmsPage | null;
  globals: CmsSiteGlobals;
}> {
  const season = slug === 'home' || slug === 'pricing' ? await loadSeasonPlaceholders() : null;

  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle(slug);
    if (bundle.page) {
      return {
        page: applySeasonToCmsPage(bundle.page, season),
        globals: bundle.globals,
      };
    }
    return { page: null, globals: bundle.globals };
  } catch (err) {
    console.warn('[cms] Falling back to default content for', slug, err);
  }

  const globals = buildDefaultSiteGlobals();
  if (slug === 'pricing') {
    return { page: applySeasonToCmsPage(buildDefaultPricingPage(), season), globals };
  }
  if (slug === 'home') {
    return { page: applySeasonToCmsPage(buildDefaultHomePage(), season), globals };
  }
  return { page: null, globals };
}

/** Dedupes metadata + page render in the same request. */
export const loadCmsPageBundle = cache(loadCmsPageBundleUncached);
