'use client';

import { useState } from 'react';
import { WebsiteCmsConsole } from '@/components/cms/website-cms-console';
import { CmsMediaLibraryPanel } from '@/components/cms/cms-media-library';
import { CmsFormsPanel } from '@/components/cms/cms-forms-panel';
import { CmsCollectionsPanel } from '@/components/cms/cms-collections-panel';
import { CmsChromeSeoNoticesPanel } from '@/components/cms/cms-chrome-seo-panel';
import { CUSTOMIZATION_AUDIT } from '@/lib/customization-audit';

const TABS = [
  { id: 'pages', label: 'Pages' },
  { id: 'chrome', label: 'Chrome & SEO' },
  { id: 'media', label: 'Media' },
  { id: 'forms', label: 'Forms' },
  { id: 'collections', label: 'Collections' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function WebsiteCmsHub() {
  const [tab, setTab] = useState<TabId>('pages');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Website CMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full control over marketing pages, navigation, branding, media, forms, collections, SEO, and
          announcements — without code changes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pages' ? <WebsiteCmsConsole embedded /> : null}
      {tab === 'chrome' ? <CmsChromeSeoNoticesPanel /> : null}
      {tab === 'media' ? <CmsMediaLibraryPanel /> : null}
      {tab === 'forms' ? <CmsFormsPanel /> : null}
      {tab === 'collections' ? <CmsCollectionsPanel /> : null}
      {tab === 'pages' || tab === 'chrome' || tab === 'media' || tab === 'forms' || tab === 'collections' ? (
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium">Customization audit (live checklist)</summary>
          <AuditTable />
        </details>
      ) : null}
    </div>
  );
}

function AuditTable() {
  return (
    <div className="mt-3 max-h-80 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-1 pr-2">Area</th>
            <th className="py-1 pr-2">Status</th>
            <th className="py-1">Where</th>
          </tr>
        </thead>
        <tbody>
          {CUSTOMIZATION_AUDIT.map((row) => (
            <tr key={row.area} className="border-b border-slate-100">
              <td className="py-1.5 pr-2">{row.area}</td>
              <td className="py-1.5 pr-2">
                <span
                  className={
                    row.status === 'done'
                      ? 'text-emerald-700'
                      : row.status === 'partial'
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }
                >
                  {row.status}
                </span>
              </td>
              <td className="py-1.5 text-muted-foreground">{row.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
