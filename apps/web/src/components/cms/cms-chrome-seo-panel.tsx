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
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="font-semibold">Header navigation</h3>
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
