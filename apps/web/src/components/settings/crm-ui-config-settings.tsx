'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import type { CrmNavItemConfig, CrmUiConfig } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

export function CrmUiConfigSettingsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.crmUiConfig.get.useQuery();
  const [draft, setDraft] = useState<CrmUiConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [labelKey, setLabelKey] = useState('');
  const [labelValue, setLabelValue] = useState('');

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const update = trpc.crmUiConfig.update.useMutation({
    onSuccess: (next) => {
      setDraft(next);
      setMessage('UI configuration saved');
      void utils.crmUiConfig.get.invalidate();
      void utils.crmUiConfig.resolvedNav.invalidate();
    },
    onError: (err) => setMessage(err.message),
  });

  if (isLoading || !draft) {
    return <p className="text-sm text-muted-foreground">Loading UI configuration…</p>;
  }

  function patchNav(key: string, patch: Partial<CrmNavItemConfig>) {
    setDraft({
      ...draft!,
      navItems: draft!.navItems.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    });
  }

  function move(key: string, dir: -1 | 1) {
    const items = [...draft!.navItems].sort((a, b) => a.order - b.order);
    const index = items.findIndex((item) => item.key === key);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= items.length) return;
    const swapped = [...items];
    const tmp = swapped[index]!;
    swapped[index] = swapped[next]!;
    swapped[next] = tmp;
    setDraft({
      ...draft!,
      navItems: swapped.map((item, i) => ({ ...item, order: i })),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM navigation & labels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename, reorder, and hide sidebar items. Module gates still apply when modules are disabled.
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Navigation</h2>
        {draft.navItems
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => patchNav(item.key, { enabled: e.target.checked })}
                aria-label={`Enable ${item.label}`}
              />
              <input
                className="min-w-[140px] flex-1 rounded border border-border bg-surface px-2 py-1 text-sm"
                value={item.label}
                onChange={(e) => patchNav(item.key, { label: e.target.value })}
              />
              <code className="text-xs text-muted-foreground">{item.href}</code>
              {item.moduleKey ? (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase">
                  {item.moduleKey}
                </span>
              ) : null}
              <button type="button" className="btn-ghost p-1" onClick={() => move(item.key, -1)}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="btn-ghost p-1" onClick={() => move(item.key, 1)}>
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ))}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Label overrides</h2>
        <p className="text-sm text-muted-foreground">
          Optional key → display string map for CRM copy (e.g. <code>customer.singular</code> → Client).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border border-border px-2 py-1.5 text-sm"
            placeholder="key"
            value={labelKey}
            onChange={(e) => setLabelKey(e.target.value)}
          />
          <input
            className="rounded border border-border px-2 py-1.5 text-sm"
            placeholder="label"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!labelKey.trim()) return;
              setDraft({
                ...draft,
                labelOverrides: { ...draft.labelOverrides, [labelKey.trim()]: labelValue },
              });
              setLabelKey('');
              setLabelValue('');
            }}
          >
            Add
          </button>
        </div>
        <ul className="space-y-1 text-sm">
          {Object.entries(draft.labelOverrides).map(([key, value]) => (
            <li key={key} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1">
              <span>
                <code>{key}</code> → {value}
              </span>
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() => {
                  const next = { ...draft.labelOverrides };
                  delete next[key];
                  setDraft({ ...draft, labelOverrides: next });
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">App theme</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.theme.useOrgBrandingInApp ?? true}
            onChange={(e) =>
              setDraft({
                ...draft,
                theme: { ...draft.theme, useOrgBrandingInApp: e.target.checked },
              })
            }
          />
          Apply organization branding colors in the CRM shell
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['sidebarBackground', 'Sidebar background'],
              ['sidebarText', 'Sidebar text'],
              ['accentColor', 'Accent'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium">{label}</span>
              <input
                className="w-full rounded border border-border px-2 py-1.5"
                value={draft.theme[key] ?? ''}
                placeholder="#0f172a"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, [key]: e.target.value || null },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Custom fields</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setDraft({
                ...draft,
                customFields: [
                  ...draft.customFields,
                  {
                    id: `cf_${Date.now()}`,
                    entity: 'customer',
                    key: `field_${draft.customFields.length + 1}`,
                    label: 'New field',
                    type: 'text',
                    required: false,
                    enabled: true,
                    order: draft.customFields.length,
                  },
                ],
              })
            }
          >
            Add customer field
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Fields appear on customer create/edit forms. Manage definitions here without code.
        </p>
        {draft.customFields.map((field, index) => (
          <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={field.label}
              onChange={(e) => {
                const customFields = [...draft.customFields];
                customFields[index] = { ...field, label: e.target.value };
                setDraft({ ...draft, customFields });
              }}
            />
            <input
              className="rounded border px-2 py-1 font-mono text-sm"
              value={field.key}
              onChange={(e) => {
                const customFields = [...draft.customFields];
                customFields[index] = {
                  ...field,
                  key: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
                };
                setDraft({ ...draft, customFields });
              }}
            />
            <select
              className="rounded border px-2 py-1 text-sm"
              value={field.type}
              onChange={(e) => {
                const customFields = [...draft.customFields];
                customFields[index] = {
                  ...field,
                  type: e.target.value as typeof field.type,
                };
                setDraft({ ...draft, customFields });
              }}
            >
              {['text', 'number', 'date', 'select', 'checkbox', 'textarea'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(e) => {
                  const customFields = [...draft.customFields];
                  customFields[index] = { ...field, enabled: e.target.checked };
                  setDraft({ ...draft, customFields });
                }}
              />
              Enabled
            </label>
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() =>
                setDraft({
                  ...draft,
                  customFields: draft.customFields.filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={update.isPending}
        onClick={() =>
          update.mutate({
            navItems: draft.navItems,
            labelOverrides: draft.labelOverrides,
            theme: draft.theme,
            customFields: draft.customFields,
          })
        }
      >
        <Save className="h-4 w-4" /> Save UI configuration
      </button>
    </div>
  );
}
