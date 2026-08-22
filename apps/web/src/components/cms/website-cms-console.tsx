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
import { CmsBlockStyleEditor, applyBlockStyleToDraft } from './cms-block-style-editor';
import { CmsRichTextEditor } from './cms-rich-text-editor';
import { CmsVersionHistoryPanel } from './cms-version-history';
import { CmsSectionLibraryPanel } from './cms-section-library';
import { CmsA11yPanel } from './cms-a11y-panel';

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
  { type: 'image_text', label: 'Image + text' },
  { type: 'video', label: 'Video' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'slideshow', label: 'Slideshow' },
  { type: 'map', label: 'Map' },
  { type: 'calendar', label: 'Calendar' },
  { type: 'buttons', label: 'Buttons' },
  { type: 'contact_form', label: 'Contact form' },
  { type: 'collection_list', label: 'Collection list' },
  { type: 'site_search', label: 'Site search' },
  { type: 'spacer', label: 'Spacer' },
  { type: 'divider', label: 'Divider' },
  { type: 'custom_html', label: 'Custom HTML' },
];

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    case 'image_text':
      return {
        id,
        type,
        enabled: true,
        label: 'Image + text',
        title: 'Title',
        body: 'Supporting copy',
        imageUrl: '',
        imageAlt: '',
        imagePosition: 'left',
      };
    case 'video':
      return { id, type, enabled: true, label: 'Video', embedUrl: '', title: '' };
    case 'gallery':
      return { id, type, enabled: true, label: 'Gallery', images: [] };
    case 'slideshow':
      return {
        id,
        type,
        enabled: true,
        label: 'Slideshow',
        slides: [],
        autoplay: true,
        intervalMs: 5000,
        showDots: true,
      };
    case 'map':
      return {
        id,
        type,
        enabled: true,
        label: 'Map',
        lat: 39.8283,
        lng: -98.5795,
        zoom: 4,
        markerLabel: '',
        height: 320,
      };
    case 'calendar':
      return {
        id,
        type,
        enabled: true,
        label: 'Calendar',
        title: 'Upcoming',
        mode: 'events',
        events: [],
      };
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
    case 'site_search':
      return {
        id,
        type,
        enabled: true,
        label: 'Search',
        title: 'Search',
        placeholder: 'Search pages…',
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

  if (block.type === 'rich_text') {
    return (
      <CmsRichTextEditor
        value={block.html}
        onChange={(html) => onChange({ ...block, html })}
      />
    );
  }

  if (block.type === 'custom_html') {
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

  if (block.type === 'image') {
    const focal = block.focalPoint ?? { x: 50, y: 50 };
    return (
      <div className="space-y-3">
        <Field label="Image URL" value={block.src} onChange={(v) => onChange({ ...block, src: v })} />
        <Field label="Alt text" value={block.alt} onChange={(v) => onChange({ ...block, alt: v })} />
        <Field
          label="Caption"
          value={block.caption ?? ''}
          onChange={(v) => onChange({ ...block, caption: v })}
        />
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Focal point (%)</p>
          {block.src ? (
            <div className="relative overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.src}
                alt={block.alt || 'Preview'}
                className="max-h-40 w-full object-cover"
                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
              />
            </div>
          ) : null}
          <label className="block text-xs">
            X ({focal.x})
            <input
              type="range"
              min={0}
              max={100}
              className="w-full"
              value={focal.x}
              onChange={(e) =>
                onChange({
                  ...block,
                  focalPoint: { x: Number(e.target.value), y: focal.y },
                })
              }
            />
          </label>
          <label className="block text-xs">
            Y ({focal.y})
            <input
              type="range"
              min={0}
              max={100}
              className="w-full"
              value={focal.y}
              onChange={(e) =>
                onChange({
                  ...block,
                  focalPoint: { x: focal.x, y: Number(e.target.value) },
                })
              }
            />
          </label>
          <TextArea
            label="Responsive variants JSON ([{width,url}])"
            value={JSON.stringify(block.variants ?? [], null, 2)}
            onChange={(v) => {
              try {
                onChange({ ...block, variants: JSON.parse(v) });
              } catch {
                /* ignore */
              }
            }}
            rows={4}
          />
          <TextArea
            label="Crop JSON ({x,y,width,height} %)"
            value={JSON.stringify(block.crop ?? null, null, 2)}
            onChange={(v) => {
              try {
                onChange({ ...block, crop: JSON.parse(v) });
              } catch {
                /* ignore */
              }
            }}
            rows={3}
          />
        </div>
      </div>
    );
  }

  if (block.type === 'image_text') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <TextArea label="Body" value={block.body ?? ''} onChange={(v) => onChange({ ...block, body: v })} />
        <Field label="Image URL" value={block.imageUrl} onChange={(v) => onChange({ ...block, imageUrl: v })} />
        <Field label="Image alt" value={block.imageAlt} onChange={(v) => onChange({ ...block, imageAlt: v })} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-muted-foreground">Image position</span>
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={block.imagePosition}
            onChange={(e) =>
              onChange({ ...block, imagePosition: e.target.value as 'left' | 'right' })
            }
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
    );
  }

  if (block.type === 'video') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <Field
          label="Embed URL (YouTube/Vimeo)"
          value={block.embedUrl}
          onChange={(v) => onChange({ ...block, embedUrl: v })}
        />
      </div>
    );
  }

  if (block.type === 'gallery' || block.type === 'slideshow') {
    const key = block.type === 'gallery' ? 'images' : 'slides';
    const items = block.type === 'gallery' ? block.images : block.slides;
    return (
      <div className="space-y-3">
        {block.type === 'slideshow' ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.autoplay ?? true}
                onChange={(e) => onChange({ ...block, autoplay: e.target.checked })}
              />
              Autoplay
            </label>
            <Field
              label="Interval (ms)"
              value={String(block.intervalMs ?? 5000)}
              onChange={(v) => onChange({ ...block, intervalMs: Number(v) || 5000 })}
            />
          </>
        ) : null}
        <TextArea
          label={`${key} JSON`}
          value={JSON.stringify(items, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v);
              if (block.type === 'gallery') onChange({ ...block, images: parsed });
              else onChange({ ...block, slides: parsed });
            } catch {
              /* ignore */
            }
          }}
          rows={10}
        />
      </div>
    );
  }

  if (block.type === 'map') {
    return (
      <div className="space-y-3">
        <Field
          label="Latitude"
          value={String(block.lat)}
          onChange={(v) => onChange({ ...block, lat: Number(v) })}
        />
        <Field
          label="Longitude"
          value={String(block.lng)}
          onChange={(v) => onChange({ ...block, lng: Number(v) })}
        />
        <Field
          label="Zoom"
          value={String(block.zoom ?? 12)}
          onChange={(v) => onChange({ ...block, zoom: Number(v) || 12 })}
        />
        <Field
          label="Marker label"
          value={block.markerLabel ?? ''}
          onChange={(v) => onChange({ ...block, markerLabel: v })}
        />
        <Field
          label="Height (px)"
          value={String(block.height ?? 320)}
          onChange={(v) => onChange({ ...block, height: Number(v) || 320 })}
        />
      </div>
    );
  }

  if (block.type === 'calendar') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-muted-foreground">Mode</span>
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={block.mode}
            onChange={(e) =>
              onChange({ ...block, mode: e.target.value as 'events' | 'embed_url' })
            }
          >
            <option value="events">Event list</option>
            <option value="embed_url">Embed URL</option>
          </select>
        </label>
        {block.mode === 'embed_url' ? (
          <Field
            label="Embed URL"
            value={block.embedUrl ?? ''}
            onChange={(v) => onChange({ ...block, embedUrl: v })}
          />
        ) : (
          <TextArea
            label="Events JSON"
            value={JSON.stringify(block.events ?? [], null, 2)}
            onChange={(v) => {
              try {
                onChange({ ...block, events: JSON.parse(v) });
              } catch {
                /* ignore */
              }
            }}
            rows={8}
          />
        )}
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

  if (block.type === 'site_search') {
    return (
      <div className="space-y-3">
        <Field label="Title" value={block.title ?? ''} onChange={(v) => onChange({ ...block, title: v })} />
        <Field
          label="Placeholder"
          value={block.placeholder ?? ''}
          onChange={(v) => onChange({ ...block, placeholder: v })}
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
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      <input
        className="w-full rounded-lg border border-border px-3 py-2"
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
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      <textarea
        className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
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
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [orderBreakpoint, setOrderBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [message, setMessage] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [globalsJson, setGlobalsJson] = useState('');

  const pageQuery = trpc.websiteCms.pages.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const { data: namedFooters } = trpc.websiteCms.footers.list.useQuery();

  const activePage = draft?.id === selectedId ? draft : pageQuery.data ?? null;
  const previewHref = activePage
    ? `/creator/website/preview?pageId=${encodeURIComponent(activePage.id)}&cmsEdit=1&lang=${encodeURIComponent(activePage.locale || 'en')}`
    : '/';
  const previewWidth =
    device === 'mobile' ? 390 : device === 'tablet' ? 768 : 1200;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; blockId?: string } | null;
      if (!data || data.type !== 'yl-cms-select-block' || !data.blockId) return;
      setSelectedBlockId(data.blockId);
      setMessage(`Selected block ${data.blockId}`);
      const el = document.getElementById(`cms-editor-block-${data.blockId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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
            <h1 className="page-title">Website CMS</h1>
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
            className={device === d ? 'pill-tab-active px-3 py-1 text-xs' : 'pill-tab-idle px-3 py-1 text-xs'}
            onClick={() => setDevice(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className={showLivePreview ? 'pill-tab-active px-3 py-1 text-xs' : 'pill-tab-idle px-3 py-1 text-xs'}
          onClick={() => setShowLivePreview((v) => !v)}
        >
          Live preview
        </button>
        {activePage ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Open tab
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pages</p>
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
              className={`flex w-full items-center justify-between ${selectedId === page.id ? 'list-item-active' : 'list-item-idle'}`}
            >
              <span>{page.title}</span>
              <span className="text-xs opacity-70">{page.status}</span>
            </button>
          ))}
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New page</p>
            <input
              className="input mb-2 w-full text-sm"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="input mb-2 w-full text-sm"
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
                    <span className="mb-1 block font-medium text-muted-foreground">Status</span>
                    <select
                      className="w-full rounded-lg border border-border px-3 py-2"
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
                  {activePage.status === 'scheduled' ? (
                    <label className="block text-sm sm:col-span-3">
                      <span className="mb-1 block font-medium text-muted-foreground">
                        Publish at (local time)
                      </span>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-border px-3 py-2"
                        value={
                          activePage.scheduledPublishAt
                            ? toDatetimeLocalValue(
                                activePage.scheduledPublishAt instanceof Date
                                  ? activePage.scheduledPublishAt
                                  : new Date(activePage.scheduledPublishAt),
                              )
                            : ''
                        }
                        onChange={(e) =>
                          setDraft({
                            ...activePage,
                            scheduledPublishAt: e.target.value
                              ? new Date(e.target.value)
                              : null,
                          })
                        }
                      />
                    </label>
                  ) : null}
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
                        scheduledPublishAt:
                          activePage.status === 'scheduled'
                            ? activePage.scheduledPublishAt
                              ? activePage.scheduledPublishAt instanceof Date
                                ? activePage.scheduledPublishAt
                                : new Date(activePage.scheduledPublishAt)
                              : null
                            : null,
                        footerId: activePage.footerId ?? null,
                        blockOrderByBreakpoint: activePage.blockOrderByBreakpoint ?? null,
                        locale: activePage.locale || 'en',
                        translations: activePage.translations ?? null,
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
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-muted-foreground">Footer</span>
                  <select
                    className="w-full rounded-lg border border-border px-3 py-2"
                    value={activePage.footerId ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...activePage,
                        footerId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Site default</option>
                    {namedFooters?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Locale"
                  value={activePage.locale || 'en'}
                  onChange={(v) => setDraft({ ...activePage, locale: v || 'en' })}
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-muted-foreground">
                    Order for breakpoint
                  </span>
                  <select
                    className="mb-2 w-full rounded-lg border border-border px-3 py-2"
                    value={orderBreakpoint}
                    onChange={(e) =>
                      setOrderBreakpoint(e.target.value as 'desktop' | 'tablet' | 'mobile')
                    }
                  >
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                  </select>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() =>
                      setDraft({
                        ...activePage,
                        blockOrderByBreakpoint: {
                          ...(activePage.blockOrderByBreakpoint ?? {}),
                          [orderBreakpoint]: activePage.blocks.map((b) => b.id),
                        },
                      })
                    }
                  >
                    Capture current block order for {orderBreakpoint}
                  </button>
                </label>
              </div>

              {showLivePreview ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Draft preview ({device}) with click-to-select — save page first so the iframe loads
                    current draft.
                    {selectedBlockId ? ` Selected: ${selectedBlockId}` : ''}
                  </p>
                  <div className="mx-auto overflow-hidden rounded-lg border bg-background shadow-sm" style={{ width: previewWidth, maxWidth: '100%' }}>
                    <iframe
                      title="CMS live preview"
                      src={previewHref}
                      className="h-[640px] w-full border-0"
                    />
                  </div>
                </div>
              ) : null}

              <CmsA11yPanel page={activePage} />

              <CmsSectionLibraryPanel
                selectedBlocks={activePage.blocks}
                onInsert={(blocks) =>
                  pushDraft({ ...activePage, blocks: [...activePage.blocks, ...blocks] })
                }
              />

              <CmsVersionHistoryPanel
                pageId={activePage.id}
                onRestored={() => {
                  setDraft(null);
                  setMessage('Version restored');
                  void pageQuery.refetch();
                }}
              />

              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                <span className="text-sm font-medium text-muted-foreground">Add block:</span>
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
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
                  <div
                    key={block.id}
                    id={`cms-editor-block-${block.id}`}
                    className={`rounded-xl border p-4 ${
                      selectedBlockId === block.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-muted/40'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {block.label || block.type}{' '}
                          <span className="text-xs font-normal text-muted-foreground">({block.type})</span>
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
                    <CmsBlockStyleEditor
                      style={block.style}
                      onChange={(style) =>
                        updateBlock(index, applyBlockStyleToDraft(block, style))
                      }
                    />
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
              className="min-h-[280px] w-full rounded-lg border border-border p-3 font-mono text-xs"
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
