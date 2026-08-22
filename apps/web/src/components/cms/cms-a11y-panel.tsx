'use client';

import type { CmsBlock, CmsPage } from '@clcrm/types';
import { AlertTriangle } from 'lucide-react';

export type A11yIssue = {
  id: string;
  severity: 'error' | 'warn';
  message: string;
  blockId?: string;
};

export function scanCmsPageA11y(page: CmsPage): A11yIssue[] {
  const issues: A11yIssue[] = [];

  if (!page.seo.title?.trim()) {
    issues.push({ id: 'seo-title', severity: 'error', message: 'SEO title is empty' });
  }
  if (!page.seo.description?.trim()) {
    issues.push({ id: 'seo-desc', severity: 'warn', message: 'Meta description is empty' });
  }

  let headingish = 0;
  for (const block of page.blocks) {
    if (!block.enabled) continue;
    issues.push(...scanBlock(block));
    if (block.type === 'hero' && block.headline?.trim()) headingish += 1;
    if (block.type === 'rich_text' && /<h[1-6]/i.test(block.html)) headingish += 1;
    if (
      (block.type === 'feature_grid' ||
        block.type === 'pricing_table' ||
        block.type === 'faq' ||
        block.type === 'cta' ||
        block.type === 'testimonials' ||
        block.type === 'calendar') &&
      'title' in block &&
      block.title?.trim()
    ) {
      headingish += 1;
    }
  }

  if (headingish === 0) {
    issues.push({
      id: 'no-heading',
      severity: 'warn',
      message: 'No clear heading content found on this page',
    });
  }

  return issues;
}

function scanBlock(block: CmsBlock): A11yIssue[] {
  const out: A11yIssue[] = [];
  const id = block.id;

  if (block.type === 'image') {
    if (!block.alt?.trim()) {
      out.push({ id: `${id}-alt`, severity: 'error', message: 'Image block missing alt text', blockId: id });
    }
    if (!block.src?.trim()) {
      out.push({ id: `${id}-src`, severity: 'warn', message: 'Image block has empty src', blockId: id });
    }
  }
  if (block.type === 'image_text' && !block.imageAlt?.trim()) {
    out.push({
      id: `${id}-alt`,
      severity: 'error',
      message: 'Image+text block missing image alt',
      blockId: id,
    });
  }
  if (block.type === 'gallery') {
    block.images.forEach((img, i) => {
      if (!img.alt?.trim()) {
        out.push({
          id: `${id}-g-${i}`,
          severity: 'error',
          message: `Gallery image ${i + 1} missing alt`,
          blockId: id,
        });
      }
    });
  }
  if (block.type === 'slideshow') {
    block.slides.forEach((slide, i) => {
      if (!slide.alt?.trim()) {
        out.push({
          id: `${id}-s-${i}`,
          severity: 'error',
          message: `Slideshow slide ${i + 1} missing alt`,
          blockId: id,
        });
      }
    });
  }
  if (block.type === 'hero' && !block.headline?.trim()) {
    out.push({ id: `${id}-h`, severity: 'error', message: 'Hero missing headline', blockId: id });
  }
  if (block.type === 'cta' && !block.title?.trim()) {
    out.push({ id: `${id}-cta`, severity: 'error', message: 'CTA missing title', blockId: id });
  }
  if (block.type === 'custom_html') {
    out.push({
      id: `${id}-html`,
      severity: 'warn',
      message: 'Custom HTML — review manually for accessibility',
      blockId: id,
    });
  }
  if (block.type === 'video' && !block.embedUrl?.trim()) {
    out.push({ id: `${id}-vid`, severity: 'warn', message: 'Video block missing embed URL', blockId: id });
  }
  if (block.type === 'map' && (Number.isNaN(block.lat) || Number.isNaN(block.lng))) {
    out.push({ id: `${id}-map`, severity: 'error', message: 'Map coordinates invalid', blockId: id });
  }

  return out;
}

export function CmsA11yPanel({ page }: { page: CmsPage }) {
  const issues = scanCmsPageA11y(page);
  const errors = issues.filter((i) => i.severity === 'error').length;

  return (
    <details className="rounded-xl border border-border bg-muted/30 p-4" open={errors > 0}>
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" /> Accessibility checks
        <span className="text-xs font-normal text-muted-foreground">
          ({issues.length} issue{issues.length === 1 ? '' : 's'}
          {errors ? ` · ${errors} error${errors === 1 ? '' : 's'}` : ''})
        </span>
      </summary>
      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm">
        {!issues.length ? (
          <li className="text-emerald-700">No basic issues found.</li>
        ) : (
          issues.map((issue) => (
            <li
              key={issue.id}
              className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-800'}
            >
              {issue.severity === 'error' ? 'Error' : 'Warn'}: {issue.message}
              {issue.blockId ? (
                <span className="text-xs text-muted-foreground"> · {issue.blockId}</span>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </details>
  );
}
