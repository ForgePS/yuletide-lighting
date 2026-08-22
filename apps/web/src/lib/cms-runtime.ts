import type { CmsBlock, CmsBreakpointOrder, CmsPage } from '@clcrm/types';

export function applyCmsLocale(page: CmsPage, locale?: string | null): CmsPage {
  const target = (locale || page.locale || 'en').toLowerCase();
  const base = (page.locale || 'en').toLowerCase();
  if (!target || target === base || !page.translations?.[target]) return page;
  const overlay = page.translations[target]!;
  return {
    ...page,
    title: overlay.title ?? page.title,
    blocks: overlay.blocks ?? page.blocks,
    seo: { ...page.seo, ...overlay.seo, slug: page.slug },
    locale: target,
  };
}

export function orderBlocksForBreakpoint(
  blocks: CmsBlock[],
  order: CmsBreakpointOrder | null | undefined,
  breakpoint: 'desktop' | 'tablet' | 'mobile',
): CmsBlock[] {
  const ids = order?.[breakpoint];
  if (!ids?.length) return blocks;
  const map = new Map(blocks.map((b) => [b.id, b]));
  const ordered: CmsBlock[] = [];
  for (const id of ids) {
    const block = map.get(id);
    if (block) {
      ordered.push(block);
      map.delete(id);
    }
  }
  for (const block of map.values()) ordered.push(block);
  return ordered;
}

export function detectBreakpointWidth(width: number): 'desktop' | 'tablet' | 'mobile' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export const CMS_EDIT_MESSAGE = 'yl-cms-select-block' as const;
export const CMS_PREVIEW_READY = 'yl-cms-preview-ready' as const;
