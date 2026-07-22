'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { createBlockId, type CmsBlock, type CmsPage } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

const BLOCK_TYPES: Array<{ type: CmsBlock['type']; label: string }> = [
  { type: 'hero', label: 'Hero' },
  { type: 'feature_grid', label: 'Feature grid' },
  { type: 'preview_dashboard', label: 'Preview dashboard' },
  { type: 'pricing_table', label: 'Pricing table' },
  { type: 'cta', label: 'Call to action' },
  { type: 'faq', label: 'FAQ' },
  { type: 'rich_text', label: 'Rich text' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'image', label: 'Image' },
  { type: 'buttons', label: 'Buttons' },
  { type: 'contact_form', label: 'Contact form' },
  { type: 'collection_list', label: 'Collection list' },
  { type: 'spacer', label: 'Spacer' },
  { type: 'divider', label: 'Divider' },
  { type: 'custom_html', label: 'Custom HTML' },
];

function emptyBlock(type: CmsBlock['type']): CmsBlock {
  const id = createBlockId();
  switch (type) {
    case 'hero':
      return {
        id,
        type,
        enabled: true,
        label: 'Hero',
        headline: 'New headline',
        headlineAccent: '',
        subheadline: '',
        primaryCta: { label: 'Get started', href: '/sign-up', style: 'primary' },
      };
    case 'feature_grid':
      return { id, type, enabled: true, label: 'Features', title: 'Features', features: [] };
    case 'preview_dashboard':
      return { id, type, enabled: true, label: 'Preview', stats: [] };
    case 'pricing_table':
      return { id, type, enabled: true, label: 'Pricing', title: 'Pricing', plans: [] };
    case 'cta':
      return {
        id,
        type,
        enabled: true,
        label: 'CTA',
        title: 'Ready to start?',
        button: { label: 'Get started', href: '/sign-up', style: 'primary' },
      };
    case 'faq':
      return { id, type, enabled: true, label: 'FAQ', title: 'FAQ', items: [] };
    case 'rich_text':
      return { id, type, enabled: true, label: 'Text', html: '<p>New content</p>' };
    case 'testimonials':
      return { id, type, enabled: true, label: 'Testimonials', items: [] };
    case 'image':
      return { id, type, enabled: true, label: 'Image', src: '', alt: '' };
    case 'buttons':
      return { id, type, enabled: true, label: 'Buttons', buttons: [] };
    case 'contact_form':
      return { id, type, enabled: true, label: 'Contact form', title: 'Contact us' };
    case 'collection_list':
      return {
        id,
        type,
        enabled: true,
        label: 'Collection',
        collectionId: '',
        title: 'Latest',
        limit: 6,
        layout: 'grid',
      };
    case 'spacer':
      return { id, type, enabled: true, label: 'Spacer', height: 48 };
    case 'divider':
      return { id, type, enabled: true, label: 'Divider' };
    case 'custom_html':
      return { id, type, enabled: true, label: 'HTML', html: '' };
    default:
      return { id, type: 'spacer', enabled: true, label: 'Spacer', height: 24 };
  }
}

function BlockEditor({
  block,
  onChange,
}: {
  block: CmsBlock;
  onChange: (next: CmsBlock) => void;
}) {
  if (block.type === 'hero') {
    return (
      <div className="space-y-3">
        <Field label="Eyebrow" value={block.eyebrow ?? ''} onChange={(v) => onChange({ ...block, eyebrow: v })} />
        <Field label="Headline" value={block.headline} onChange={(v) => onChange({ ...block, headline: v })} />
        <Field
          label="Headline accent"
          value={block.headlineAccent ?? ''}
          onChange={(v) => onChange({ ...block, headlineAccent: v })}
        />
        <TextArea
          label="Subheadline"
          value={block.subheadline ?? ''}
          onChange={(v) => onChange({ ...block, subheadline: v })}
        />
        <Field
          label="Primary CTA label"
          value={block.primaryCta?.label ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              primaryCta: { ...(block.primaryCta ?? { href: '/sign-up', style: 'primary' }), label: v },
            })
          }
        />
        <Field
          label="Primary CTA href"
          value={block.primaryCta?.href ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              primaryCta: { ...(block.primaryCta ?? { label: 'CTA', style: 'primary' }), href: v },
            })
          }
        />
        <Field
          label="Secondary CTA label"
          value={block.secondaryCta?.label ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              secondaryCta: { ...(block.secondaryCta ?? { href: '/pricing', style: 'secondary' }), label: v },
            })
          }
        />
        <Field
          label="Secondary CTA href"
          value={block.secondaryCta?.href ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              secondaryCta: { ...(block.secondaryCta ?? { label: 'Learn more', style: 'secondary' }), href: v },
            })
          }
        />
      </div>
    );
  }

  if (block.type === 'cta') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
        <TextArea label="Body" value={block.body ?? ''} onChange={(v) => onChange({ ...block, body: v })} />
        <Field
          label="Button label"
          value={block.button?.label ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              button: { ...(block.button ?? { href: '/sign-up', style: 'primary' }), label: v },
            })
          }
        />
        <Field
          label="Button href"
          value={block.button?.href ?? ''}
          onChange={(v) =>
            onChange({
              ...block,
              button: { ...(block.button ?? { label: 'Go', style: 'primary' }), href: v },
            })
          }
        />
      </div>
    );
  }

  if (block.type === 'feature_grid') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <TextArea
          label="Subtitle"
          value={block.subtitle ?? ''}
          onChange={(v) => onChange({ ...block, subtitle: v })}
        />
        <p className="text-xs text-muted-foreground">
          {block.features.length} features — edit JSON for advanced structure or use reorder in list.
        </p>
        <TextArea
          label="Features JSON"
          value={JSON.stringify(block.features, null, 2)}
          onChange={(v) => {
            try {
              onChange({ ...block, features: JSON.parse(v) });
            } catch {
              /* ignore while typing */
            }
          }}
          rows={10}
        />
      </div>
    );
  }

  if (block.type === 'pricing_table') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <TextArea
          label="Subtitle"
          value={block.subtitle ?? ''}
          onChange={(v) => onChange({ ...block, subtitle: v })}
        />
        <TextArea
          label="Plans JSON"
          value={JSON.stringify(block.plans, null, 2)}
          onChange={(v) => {
            try {
              onChange({ ...block, plans: JSON.parse(v) });
            } catch {
              /* ignore */
            }
          }}
          rows={14}
        />
      </div>
    );
  }

  if (block.type === 'preview_dashboard') {
    return (
      <div className="space-y-3">
        <Field
          label="Route text"
          value={block.routeText ?? ''}
          onChange={(v) => onChange({ ...block, routeText: v })}
        />
        <TextArea
          label="Stats JSON"
          value={JSON.stringify(block.stats, null, 2)}
          onChange={(v) => {
            try {
              onChange({ ...block, stats: JSON.parse(v) });
            } catch {
              /* ignore */
            }
          }}
          rows={8}
        />
      </div>
    );
  }

  if (block.type === 'rich_text' || block.type === 'custom_html') {
    return (
      <TextArea
        label="HTML"
        value={block.html}
        onChange={(v) => onChange({ ...block, html: v })}
        rows={8}
      />
    );
  }

  if (block.type === 'spacer') {
    return (
      <Field
        label="Height (px)"
        value={String(block.height)}
        onChange={(v) => onChange({ ...block, height: Number(v) || 0 })}
      />
    );
  }

  if (block.type === 'faq') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <TextArea
          label="Items JSON"
          value={JSON.stringify(block.items, null, 2)}
          onChange={(v) => {
            try {
              onChange({ ...block, items: JSON.parse(v) });
            } catch {
              /* ignore */
            }
          }}
          rows={10}
        />
      </div>
    );
  }

  if (block.type === 'contact_form') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <Field
          label="Form ID (from Forms tab)"
          value={block.formId ?? ''}
          onChange={(v) => onChange({ ...block, formId: v || null })}
        />
        <Field
          label="Submit label override"
          value={block.submitLabel ?? ''}
          onChange={(v) => onChange({ ...block, submitLabel: v })}
        />
      </div>
    );
  }

  if (block.type === 'collection_list') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <Field
          label="Collection ID"
          value={block.collectionId}
          onChange={(v) => onChange({ ...block, collectionId: v })}
        />
        <Field
          label="Limit"
          value={String(block.limit ?? 6)}
          onChange={(v) => onChange({ ...block, limit: Number(v) || 6 })}
        />
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Editor for <code>{block.type}</code> — use status/enable controls and save. Expand fields in a later
      iteration.
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function WebsiteCmsConsole({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const { data: pages, isLoading } = trpc.websiteCms.pages.list.useQuery();
  const { data: globals } = trpc.websiteCms.globals.get.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>('page_home');
  const [draft, setDraft] = useState<CmsPage | null>(null);
  const [history, setHistory] = useState<CmsPage[]>([]);
  const [future, setFuture] = useState<CmsPage[]>([]);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [message, setMessage] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [globalsJson, setGlobalsJson] = useState('');

  const pageQuery = trpc.websiteCms.pages.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  const activePage = draft?.id === selectedId ? draft : pageQuery.data ?? null;

  const savePage = trpc.websiteCms.pages.update.useMutation({
    onSuccess: (page) => {
      setDraft(page);
      setMessage(`Saved ${page.title} (v${page.version})`);
      void utils.websiteCms.pages.list.invalidate();
      void utils.websiteCms.pages.get.invalidate({ id: page.id });
    },
    onError: (err) => setMessage(err.message),
  });

  const createPage = trpc.websiteCms.pages.create.useMutation({
    onSuccess: (page) => {
      setSelectedId(page.id);
      setDraft(page);
      setNewTitle('');
      setNewSlug('');
      setMessage(`Created ${page.title}`);
      void utils.websiteCms.pages.list.invalidate();
    },
    onError: (err) => setMessage(err.message),
  });

  const deletePage = trpc.websiteCms.pages.delete.useMutation({
    onSuccess: () => {
      setSelectedId('page_home');
      setDraft(null);
      setMessage('Page deleted');
      void utils.websiteCms.pages.list.invalidate();
    },
    onError: (err) => setMessage(err.message),
  });

  const saveGlobals = trpc.websiteCms.globals.update.useMutation({
    onSuccess: () => {
      setMessage('Site globals saved');
      void utils.websiteCms.globals.get.invalidate();
    },
    onError: (err) => setMessage(err.message),
  });

  const seed = trpc.websiteCms.seed.useMutation({
    onSuccess: () => {
      setMessage('CMS seeded');
      void utils.websiteCms.pages.list.invalidate();
      void utils.websiteCms.globals.get.invalidate();
    },
  });

  useEffect(() => {
    if (pageQuery.data && (!draft || draft.id !== pageQuery.data.id)) {
      setDraft(pageQuery.data);
    }
  }, [pageQuery.data, draft]);

  useEffect(() => {
    if (globals && !globalsJson) {
      setGlobalsJson(JSON.stringify(globals, null, 2));
    }
  }, [globals, globalsJson]);

  function pushDraft(next: CmsPage) {
    if (activePage) {
      setHistory((h) => [...h.slice(-40), activePage]);
      setFuture([]);
    }
    setDraft(next);
  }

  function undo() {
    if (!history.length || !activePage) return;
    const prev = history[history.length - 1]!;
    setFuture((f) => [activePage, ...f]);
    setHistory((h) => h.slice(0, -1));
    setDraft(prev);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0]!;
    if (activePage) setHistory((h) => [...h, activePage]);
    setFuture((f) => f.slice(1));
    setDraft(next);
  }

  function updateBlock(index: number, next: CmsBlock) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    blocks[index] = next;
    pushDraft({ ...activePage, blocks });
  }

  function moveBlock(index: number, dir: -1 | 1) {
    if (!activePage) return;
    const next = index + dir;
    if (next < 0 || next >= activePage.blocks.length) return;
    const blocks = [...activePage.blocks];
    const tmp = blocks[index]!;
    blocks[index] = blocks[next]!;
    blocks[next] = tmp;
    pushDraft({ ...activePage, blocks });
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Website CMS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit marketing pages, sections, navigation, footer, and branding without code.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => seed.mutate()}>
          Seed defaults
        </button>
        <button type="button" className="btn-ghost" disabled={!history.length} onClick={undo}>
          Undo
        </button>
        <button type="button" className="btn-ghost" disabled={!future.length} onClick={redo}>
          Redo
        </button>
        {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
          <button
            key={d}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${device === d ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            onClick={() => setDevice(d)}
          >
            {d}
          </button>
        ))}
        {activePage ? (
          <a
            href={activePage.slug === 'home' ? '/' : `/${activePage.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Preview
          </a>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div
        className={`mx-auto grid gap-6 xl:grid-cols-[240px_1fr] ${
          device === 'mobile' ? 'max-w-md' : device === 'tablet' ? 'max-w-3xl' : ''
        }`}
      >
        <aside className="card space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</p>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {pages?.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => {
                setSelectedId(page.id);
                setDraft(null);
                setHistory([]);
                setFuture([]);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                selectedId === page.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
            >
              <span>{page.title}</span>
              <span className="text-xs opacity-70">{page.status}</span>
            </button>
          ))}
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">New page</p>
            <input
              className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary w-full justify-center text-sm"
              disabled={!newTitle || !newSlug || createPage.isPending}
              onClick={() => createPage.mutate({ title: newTitle, slug: newSlug })}
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </aside>

        <div className="space-y-6">
          {activePage ? (
            <div className="card space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <Field
                    label="Title"
                    value={activePage.title}
                    onChange={(v) => setDraft({ ...activePage, title: v })}
                  />
                  <Field
                    label="Slug"
                    value={activePage.slug}
                    onChange={(v) => setDraft({ ...activePage, slug: v })}
                  />
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Status</span>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={activePage.status}
                      onChange={(e) =>
                        setDraft({
                          ...activePage,
                          status: e.target.value as CmsPage['status'],
                        })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={savePage.isPending}
                    onClick={() =>
                      savePage.mutate({
                        id: activePage.id,
                        title: activePage.title,
                        slug: activePage.slug,
                        status: activePage.status,
                        blocks: activePage.blocks,
                        seo: { ...activePage.seo, slug: activePage.slug },
                        changeSummary: 'Editor save',
                      })
                    }
                  >
                    <Save className="h-4 w-4" /> Save page
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-red-600"
                    disabled={deletePage.isPending}
                    onClick={() => {
                      if (confirm('Delete this page?')) deletePage.mutate({ id: activePage.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="SEO title"
                  value={activePage.seo.title}
                  onChange={(v) =>
                    setDraft({ ...activePage, seo: { ...activePage.seo, title: v } })
                  }
                />
                <Field
                  label="Meta description"
                  value={activePage.seo.description}
                  onChange={(v) =>
                    setDraft({ ...activePage, seo: { ...activePage.seo, description: v } })
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <span className="text-sm font-medium text-slate-700">Add block:</span>
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50"
                    onClick={() =>
                      pushDraft({
                        ...activePage,
                        blocks: [...activePage.blocks, emptyBlock(bt.type)],
                      })
                    }
                  >
                    {bt.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {activePage.blocks.map((block, index) => (
                  <div key={block.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {block.label || block.type}{' '}
                          <span className="text-xs font-normal text-slate-500">({block.type})</span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" className="btn-ghost p-2" onClick={() => moveBlock(index, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-ghost p-2" onClick={() => moveBlock(index, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2"
                          onClick={() =>
                            updateBlock(index, {
                              ...block,
                              enabled: !block.enabled,
                            } as CmsBlock)
                          }
                        >
                          {block.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2"
                          onClick={() =>
                            pushDraft({
                              ...activePage,
                              blocks: [
                                ...activePage.blocks.slice(0, index + 1),
                                { ...JSON.parse(JSON.stringify(block)), id: createBlockId() },
                                ...activePage.blocks.slice(index + 1),
                              ],
                            })
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 text-red-600"
                          onClick={() =>
                            pushDraft({
                              ...activePage,
                              blocks: activePage.blocks.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <BlockEditor block={block} onChange={(next) => updateBlock(index, next)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-sm text-muted-foreground">Select a page to edit.</div>
          )}

          {!embedded ? (
          <div className="card space-y-3 p-5">
            <h2 className="text-lg font-semibold">Site globals (header, footer, branding)</h2>
            <p className="text-sm text-muted-foreground">
              Prefer the Chrome & SEO tab for visual editing. Raw JSON fallback:
            </p>
            <textarea
              className="min-h-[280px] w-full rounded-lg border border-slate-200 p-3 font-mono text-xs"
              value={globalsJson || (globals ? JSON.stringify(globals, null, 2) : '')}
              onChange={(e) => setGlobalsJson(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={saveGlobals.isPending}
              onClick={() => {
                try {
                  const parsed = JSON.parse(globalsJson);
                  const { updatedAt: _u, ...rest } = parsed;
                  saveGlobals.mutate(rest);
                } catch {
                  setMessage('Globals JSON is invalid');
                }
              }}
            >
              <Save className="h-4 w-4" /> Save globals
            </button>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
