import { cache } from 'react';
import {
  buildDefaultHomePage,
  buildDefaultPricingPage,
  buildDefaultSiteGlobals,
  type CmsPage,
  type CmsSiteGlobals,
} from '@clcrm/types';

async function loadCmsPageBundleUncached(slug: string): Promise<{
  page: CmsPage | null;
  globals: CmsSiteGlobals;
}> {
  try {
    const { getPublishedPageBundle } = await import('@yuletide/firebase');
    const bundle = await getPublishedPageBundle(slug);
    if (bundle.page) {
      return { page: bundle.page, globals: bundle.globals };
    }
    return { page: null, globals: bundle.globals };
  } catch (err) {
    console.warn('[cms] Falling back to default content for', slug, err);
  }

  const globals = buildDefaultSiteGlobals();
  if (slug === 'pricing') {
    return { page: buildDefaultPricingPage(), globals };
  }
  if (slug === 'home') {
    return { page: buildDefaultHomePage(), globals };
  }
  return { page: null, globals };
}

/** Dedupes metadata + page render in the same request. */
export const loadCmsPageBundle = cache(loadCmsPageBundleUncached);
