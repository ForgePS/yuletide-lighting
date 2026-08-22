'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { CmsNotice, CmsRedirect, CmsSeoGlobals, CmsSiteGlobals } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

export function CmsChromeSeoNoticesPanel() {
  const utils = trpc.useUtils();
  const { data: globals } = trpc.websiteCms.globals.get.useQuery();
  const { data: seo } = trpc.siteCms.seo.get.useQuery();
  const { data: notices } = trpc.siteCms.notices.list.useQuery();
  const { data: redirects } = trpc.siteCms.redirects.list.useQuery();

  const [chrome, setChrome] = useState<CmsSiteGlobals | null>(null);
  const [seoDraft, setSeoDraft] = useState<CmsSeoGlobals | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');

  useEffect(() => {
    if (globals) setChrome(globals);
  }, [globals]);
  useEffect(() => {
    if (seo) setSeoDraft(seo);
  }, [seo]);

  const saveGlobals = trpc.websiteCms.globals.update.useMutation({
    onSuccess: () => {
      setMessage('Header/footer/branding saved');
      void utils.websiteCms.globals.get.invalidate();
    },
  });
  const saveSeo = trpc.siteCms.seo.update.useMutation({
    onSuccess: () => {
      setMessage('SEO globals saved');
      void utils.siteCms.seo.get.invalidate();
    },
  });
  const upsertNotice = trpc.siteCms.notices.upsert.useMutation({
    onSuccess: () => void utils.siteCms.notices.list.invalidate(),
  });
  const deleteNotice = trpc.siteCms.notices.delete.useMutation({
    onSuccess: () => void utils.siteCms.notices.list.invalidate(),
  });
  const upsertRedirect = trpc.siteCms.redirects.upsert.useMutation({
    onSuccess: () => {
      setFromPath('');
      setToPath('');
      void utils.siteCms.redirects.list.invalidate();
    },
  });
  const deleteRedirect = trpc.siteCms.redirects.delete.useMutation({
    onSuccess: () => void utils.siteCms.redirects.list.invalidate(),
  });

  if (!chrome || !seoDraft) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Branding</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['companyName', 'Company name'],
              ['primaryLogoUrl', 'Primary logo URL'],
              ['faviconUrl', 'Favicon URL'],
              ['primaryColor', 'Primary color'],
              ['secondaryColor', 'Secondary color'],
              ['accentColor', 'Accent color'],
              ['backgroundColor', 'Background'],
              ['textColor', 'Text color'],
              ['linkColor', 'Link color'],
              ['headingFont', 'Heading font'],
              ['bodyFont', 'Body font'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block font-medium">{label}</span>
              <input
                className="w-full rounded border px-2 py-1.5"
                value={String(chrome.branding[key] ?? '')}
                onChange={(e) =>
                  setChrome({
                    ...chrome,
                    branding: { ...chrome.branding, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
        {(chrome.branding.primaryLogoUrl || chrome.header.logoUrl) ? (
          <div className="rounded border border-border bg-muted/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chrome.header.logoUrl || chrome.branding.primaryLogoUrl || '/logo.png'}
              alt="Logo preview"
              className="h-14 w-auto object-contain"
            />
          </div>
        ) : null}
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Header navigation</h3>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Header logo URL</span>
          <input
            className="w-full rounded border px-2 py-1.5"
            value={chrome.header.logoUrl ?? ''}
            placeholder="/logo.png or uploaded media URL"
            onChange={(e) =>
              setChrome({
                ...chrome,
                header: { ...chrome.header, logoUrl: e.target.value || null },
              })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={chrome.header.sticky}
            onChange={(e) =>
              setChrome({ ...chrome, header: { ...chrome.header, sticky: e.target.checked } })
            }
          />
          Sticky header
        </label>
        {chrome.header.navItems.map((item, index) => (
          <div key={item.id} className="flex flex-wrap gap-2">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={item.label}
              onChange={(e) => {
                const navItems = [...chrome.header.navItems];
                navItems[index] = { ...item, label: e.target.value };
                setChrome({ ...chrome, header: { ...chrome.header, navItems } });
              }}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={item.href}
              onChange={(e) => {
                const navItems = [...chrome.header.navItems];
                navItems[index] = { ...item, href: e.target.value };
                setChrome({ ...chrome, header: { ...chrome.header, navItems } });
              }}
            />
            <button
              type="button"
              className="text-red-600"
              onClick={() =>
                setChrome({
                  ...chrome,
                  header: {
                    ...chrome.header,
                    navItems: chrome.header.navItems.filter((_, i) => i !== index),
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setChrome({
              ...chrome,
              header: {
                ...chrome.header,
                navItems: [
                  ...chrome.header.navItems,
                  {
                    id: `nav_${Date.now()}`,
                    label: 'New link',
                    href: '/',
                    showWhen: 'always',
                  },
                ],
              },
            })
          }
        >
          <Plus className="h-4 w-4" /> Add nav item
        </button>

        <h4 className="pt-2 font-medium">Header CTAs</h4>
        {chrome.header.ctaButtons.map((btn, index) => (
          <div key={`${btn.label}-${index}`} className="flex flex-wrap gap-2">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={btn.label}
              onChange={(e) => {
                const ctaButtons = [...chrome.header.ctaButtons];
                ctaButtons[index] = { ...btn, label: e.target.value };
                setChrome({ ...chrome, header: { ...chrome.header, ctaButtons } });
              }}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={btn.href}
              onChange={(e) => {
                const ctaButtons = [...chrome.header.ctaButtons];
                ctaButtons[index] = { ...btn, href: e.target.value };
                setChrome({ ...chrome, header: { ...chrome.header, ctaButtons } });
              }}
            />
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Footer</h3>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Copyright text</span>
          <input
            className="w-full rounded border px-2 py-1.5"
            value={chrome.footer.copyrightText}
            onChange={(e) =>
              setChrome({
                ...chrome,
                footer: { ...chrome.footer, copyrightText: e.target.value },
              })
            }
          />
        </label>
        {chrome.footer.columns.map((col, index) => (
          <div key={col.id} className="rounded-lg border p-3">
            <input
              className="mb-2 w-full rounded border px-2 py-1 text-sm font-medium"
              value={col.title}
              onChange={(e) => {
                const columns = [...chrome.footer.columns];
                columns[index] = { ...col, title: e.target.value };
                setChrome({ ...chrome, footer: { ...chrome.footer, columns } });
              }}
            />
            <textarea
              className="w-full rounded border px-2 py-1 font-mono text-xs"
              rows={4}
              value={JSON.stringify(col.links ?? [], null, 2)}
              onChange={(e) => {
                try {
                  const columns = [...chrome.footer.columns];
                  columns[index] = { ...col, links: JSON.parse(e.target.value) };
                  setChrome({ ...chrome, footer: { ...chrome.footer, columns } });
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const { updatedAt: _u, ...rest } = chrome;
            saveGlobals.mutate(rest);
          }}
        >
          <Save className="h-4 w-4" /> Save chrome & branding
        </button>
      </section>

      <NamedFootersSection />

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Marketing tags</h3>
        <p className="text-xs text-muted-foreground">
          Optional GTM / Meta Pixel. Prefer Custom CSS/JS for arbitrary scripts.
        </p>
        <label className="text-sm">
          <span className="mb-1 block font-medium">GTM container ID</span>
          <input
            className="w-full rounded border px-2 py-1.5 font-mono text-sm"
            placeholder="GTM-XXXX"
            value={chrome.gtmContainerId ?? ''}
            onChange={(e) => setChrome({ ...chrome, gtmContainerId: e.target.value || null })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Meta Pixel ID</span>
          <input
            className="w-full rounded border px-2 py-1.5 font-mono text-sm"
            value={chrome.metaPixelId ?? ''}
            onChange={(e) => setChrome({ ...chrome, metaPixelId: e.target.value || null })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Theme mode</span>
          <select
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={chrome.themeMode ?? 'light'}
            onChange={(e) =>
              setChrome({
                ...chrome,
                themeMode: e.target.value as NonNullable<CmsSiteGlobals['themeMode']>,
              })
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Theme preset</span>
          <select
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={chrome.themePreset ?? 'default'}
            onChange={(e) =>
              setChrome({
                ...chrome,
                themePreset: e.target.value as NonNullable<CmsSiteGlobals['themePreset']>,
              })
            }
          >
            <option value="default">Default</option>
            <option value="midnight">Midnight</option>
            <option value="forest">Forest</option>
            <option value="snow">Snow</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Layout template</span>
          <select
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={chrome.layoutTemplate ?? 'classic'}
            onChange={(e) =>
              setChrome({
                ...chrome,
                layoutTemplate: e.target.value as NonNullable<CmsSiteGlobals['layoutTemplate']>,
              })
            }
          >
            <option value="classic">Classic</option>
            <option value="centered">Centered</option>
            <option value="minimal">Minimal</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Default locale</span>
          <input
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={chrome.defaultLocale ?? 'en'}
            onChange={(e) => setChrome({ ...chrome, defaultLocale: e.target.value || 'en' })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Available locales (comma-separated)</span>
          <input
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={(chrome.availableLocales ?? ['en']).join(', ')}
            onChange={(e) =>
              setChrome({
                ...chrome,
                availableLocales: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const { updatedAt: _u, ...rest } = chrome;
            saveGlobals.mutate(rest);
          }}
        >
          Save marketing tags
        </button>
      </section>

      <BrokenLinksSection />

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Custom CSS / JS</h3>
        <p className="text-xs text-muted-foreground">
          Injected on all CMS marketing pages. Scripts run as trusted Creator content — do not paste
          untrusted third-party code without review.
        </p>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Head CSS</span>
          <textarea
            className="w-full rounded border px-2 py-1.5 font-mono text-xs"
            rows={4}
            value={chrome.customHeadCss ?? ''}
            onChange={(e) => setChrome({ ...chrome, customHeadCss: e.target.value || null })}
            placeholder={'.hero { /* … */ }'}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Custom JS</span>
          <textarea
            className="w-full rounded border px-2 py-1.5 font-mono text-xs"
            rows={4}
            value={chrome.customHeadJs ?? ''}
            onChange={(e) => setChrome({ ...chrome, customHeadJs: e.target.value || null })}
            placeholder={'console.log("marketing");'}
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const { updatedAt: _u, ...rest } = chrome;
            saveGlobals.mutate(rest);
          }}
        >
          <Save className="h-4 w-4" /> Save CSS / JS
        </button>
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">SEO globals & robots.txt</h3>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Title template</span>
          <input
            className="w-full rounded border px-2 py-1.5"
            value={seoDraft.defaultTitleTemplate}
            onChange={(e) => setSeoDraft({ ...seoDraft, defaultTitleTemplate: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Default description</span>
          <textarea
            className="w-full rounded border px-2 py-1.5"
            rows={2}
            value={seoDraft.defaultDescription}
            onChange={(e) => setSeoDraft({ ...seoDraft, defaultDescription: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">robots.txt</span>
          <textarea
            className="w-full rounded border px-2 py-1.5 font-mono text-xs"
            rows={6}
            value={seoDraft.robotsTxt}
            onChange={(e) => setSeoDraft({ ...seoDraft, robotsTxt: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const { updatedAt: _u, ...rest } = seoDraft;
            saveSeo.mutate(rest);
          }}
        >
          <Save className="h-4 w-4" /> Save SEO
        </button>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Announcements & popups</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              upsertNotice.mutate({
                name: 'New announcement',
                type: 'announcement_bar',
                enabled: true,
                title: 'Announcement',
                body: 'Your message here',
                priority: 1,
                targetPages: 'all',
                targetDevices: ['desktop', 'tablet', 'mobile'],
                displayFrequency: 'always',
                dismissible: true,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add notice
          </button>
        </div>
        {notices?.map((notice: CmsNotice) => (
          <div key={notice.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded border px-2 py-1 text-sm"
                value={notice.title}
                onChange={(e) => upsertNotice.mutate({ ...notice, title: e.target.value })}
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                value={notice.type}
                onChange={(e) =>
                  upsertNotice.mutate({
                    ...notice,
                    type: e.target.value as CmsNotice['type'],
                  })
                }
              >
                {[
                  'announcement_bar',
                  'emergency',
                  'promo_banner',
                  'modal',
                  'exit_intent',
                  'cookie',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={notice.enabled}
                  onChange={(e) => upsertNotice.mutate({ ...notice, enabled: e.target.checked })}
                />
                Enabled
              </label>
              <button
                type="button"
                className="ml-auto text-red-600"
                onClick={() => deleteNotice.mutate({ id: notice.id })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              className="w-full rounded border px-2 py-1 text-sm"
              rows={2}
              value={notice.body}
              onChange={(e) => upsertNotice.mutate({ ...notice, body: e.target.value })}
            />
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">301 / 302 redirects</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="/old-path"
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="/new-path"
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={!fromPath || !toPath}
            onClick={() =>
              upsertRedirect.mutate({
                fromPath,
                toPath,
                statusCode: 301,
                enabled: true,
              })
            }
          >
            Add redirect
          </button>
        </div>
        {(redirects as CmsRedirect[] | undefined)?.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              <code>{r.fromPath}</code> → <code>{r.toPath}</code> ({r.statusCode})
            </span>
            <button type="button" className="text-red-600" onClick={() => deleteRedirect.mutate({ id: r.id })}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function NamedFootersSection() {
  const utils = trpc.useUtils();
  const { data: footers } = trpc.websiteCms.footers.list.useQuery();
  const { data: globals } = trpc.websiteCms.globals.get.useQuery();
  const [name, setName] = useState('');
  const upsert = trpc.websiteCms.footers.upsert.useMutation({
    onSuccess: () => {
      setName('');
      void utils.websiteCms.footers.list.invalidate();
    },
  });
  const remove = trpc.websiteCms.footers.delete.useMutation({
    onSuccess: () => void utils.websiteCms.footers.list.invalidate(),
  });

  return (
    <section className="card space-y-3 p-4">
      <h3 className="font-semibold">Named footers</h3>
      <p className="text-xs text-muted-foreground">
        Create alternate footers and assign them per page in the Pages editor. Default footer is
        edited above.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded border px-2 py-1.5 text-sm"
          placeholder="Footer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={!name || !globals || upsert.isPending}
          onClick={() =>
            upsert.mutate({
              name,
              footer: globals!.footer,
            })
          }
        >
          <Plus className="h-4 w-4" /> Snapshot default as named footer
        </button>
      </div>
      <ul className="space-y-2">
        {footers?.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span>
              {f.name} <code className="text-xs text-muted-foreground">{f.id}</code>
            </span>
            <button
              type="button"
              className="text-red-600"
              onClick={() => {
                if (confirm(`Delete footer “${f.name}”?`)) remove.mutate({ id: f.id });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BrokenLinksSection() {
  const utils = trpc.useUtils();
  const { data: report } = trpc.websiteCms.links.report.useQuery();
  const run = trpc.websiteCms.links.runCheck.useMutation({
    onSuccess: () => void utils.websiteCms.links.report.invalidate(),
  });

  return (
    <section className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Broken link monitor</h3>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={run.isPending}
          onClick={() => run.mutate()}
        >
          {run.isPending ? 'Checking…' : 'Run check'}
        </button>
      </div>
      {report ? (
        <p className="text-xs text-muted-foreground">
          Last run {new Date(report.ranAt).toLocaleString()} — {report.checked} checked,{' '}
          {report.broken} broken
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No report yet.</p>
      )}
      <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
        {report?.items
          .filter((i) => i.status !== 'ok')
          .map((item) => (
            <li key={`${item.url}-${item.source}`} className="rounded border px-2 py-1">
              <span className="font-medium text-red-700">{item.status}</span> ·{' '}
              <code className="text-xs">{item.url}</code>
              <span className="text-xs text-muted-foreground"> · {item.source}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
