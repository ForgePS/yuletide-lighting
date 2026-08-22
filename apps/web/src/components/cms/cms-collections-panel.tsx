'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { CmsCollection, CmsCollectionEntry } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

export function CmsCollectionsPanel() {
  const utils = trpc.useUtils();
  const { data: collections } = trpc.siteCms.collections.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CmsCollection | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const colQuery = trpc.siteCms.collections.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const { data: entries } = trpc.siteCms.collections.entries.useQuery(
    { collectionId: selectedId! },
    { enabled: !!selectedId },
  );

  useEffect(() => {
    if (colQuery.data) setDraft(colQuery.data);
  }, [colQuery.data]);

  const create = trpc.siteCms.collections.create.useMutation({
    onSuccess: (col) => {
      setSelectedId(col.id);
      void utils.siteCms.collections.list.invalidate();
    },
  });
  const update = trpc.siteCms.collections.update.useMutation({
    onSuccess: () => {
      setMessage('Collection saved');
      void utils.siteCms.collections.list.invalidate();
    },
  });
  const remove = trpc.siteCms.collections.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null);
      setDraft(null);
      void utils.siteCms.collections.list.invalidate();
    },
  });
  const upsertEntry = trpc.siteCms.collections.upsertEntry.useMutation({
    onSuccess: () => {
      setEntryTitle('');
      setEntryBody('');
      void utils.siteCms.collections.entries.invalidate();
    },
  });
  const deleteEntry = trpc.siteCms.collections.deleteEntry.useMutation({
    onSuccess: () => void utils.siteCms.collections.entries.invalidate(),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const name = prompt('Collection name (e.g. Testimonials, Services)');
            if (!name) return;
            create.mutate({
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            });
          }}
        >
          <Plus className="h-4 w-4" /> New collection
        </button>
      </div>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <aside className="card space-y-1 p-3">
          {collections?.map((col) => (
            <button
              key={col.id}
              type="button"
              className={selectedId === col.id ? 'list-item-active' : 'list-item-idle'}
              onClick={() => setSelectedId(col.id)}
            >
              {col.name}
            </button>
          ))}
        </aside>

        {draft ? (
          <div className="space-y-4">
            <div className="card space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Name</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Slug</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Fields: {draft.fields.map((f) => f.label).join(', ')}. Use collection_list blocks on pages
                with ID <code>{draft.id}</code>.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    update.mutate({
                      id: draft.id,
                      name: draft.name,
                      slug: draft.slug,
                      description: draft.description,
                      fields: draft.fields,
                    })
                  }
                >
                  <Save className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => {
                    if (confirm('Delete collection and entries?')) remove.mutate({ id: draft.id });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="card space-y-3 p-4">
              <h3 className="font-semibold">Entries</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border px-2 py-1.5 text-sm"
                  placeholder="Title"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                />
                <input
                  className="rounded border px-2 py-1.5 text-sm"
                  placeholder="Body / quote"
                  value={entryBody}
                  onChange={(e) => setEntryBody(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!entryTitle}
                onClick={() =>
                  upsertEntry.mutate({
                    collectionId: draft.id,
                    title: entryTitle,
                    slug: entryTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    status: 'published',
                    data: { body: entryBody, title: entryTitle },
                    tags: [],
                    featured: false,
                    sortOrder: entries?.length ?? 0,
                    publishedAt: new Date(),
                  })
                }
              >
                <Plus className="h-4 w-4" /> Add published entry
              </button>
              <div className="space-y-2">
                {(entries as CmsCollectionEntry[] | undefined)?.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.status}
                        {entry.featured ? ' · featured' : ''}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {String(entry.data.body ?? '')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() =>
                        deleteEntry.mutate({ collectionId: draft.id, entryId: entry.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a collection.</p>
        )}
      </div>
    </div>
  );
}
