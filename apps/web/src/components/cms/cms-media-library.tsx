'use client';

import { useRef, useState } from 'react';
import { Copy, FolderOpen, Save, Search, Trash2, Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function CmsMediaLibraryPanel() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('library');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: assets, isLoading } = trpc.siteCms.media.list.useQuery({ search, folder });
  const register = trpc.siteCms.media.registerFromUpload.useMutation({
    onSuccess: () => {
      setMessage('Uploaded');
      void utils.siteCms.media.list.invalidate();
    },
  });
  const update = trpc.siteCms.media.update.useMutation({
    onSuccess: () => {
      setMessage('Saved');
      void utils.siteCms.media.list.invalidate();
    },
  });
  const remove = trpc.siteCms.media.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null);
      setMessage('Deleted');
      void utils.siteCms.media.list.invalidate();
    },
    onError: (e) => setMessage(e.message),
  });

  const selected = assets?.find((a) => a.id === selectedId) ?? null;

  async function onUpload(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const res = await fetch('/api/upload/platform', { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) {
      setMessage((await res.json()).error || 'Upload failed');
      return;
    }
    const data = await res.json();
    register.mutate({
      path: data.path,
      url: data.url,
      filename: data.filename,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      folder: data.folder,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
            placeholder="Search media…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="folder"
        />
        <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = '';
          }}
        />
      </div>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {assets?.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedId(asset.id)}
              className={`overflow-hidden rounded-xl border text-left ${
                selectedId === asset.id ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200'
              }`}
            >
              <div className="flex aspect-square items-center justify-center bg-slate-100">
                {asset.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-cover" />
                ) : (
                  <FolderOpen className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{asset.name}</p>
                <p className="text-[10px] text-muted-foreground">{asset.kind}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="card space-y-3 p-4">
          {selected ? (
            <>
              <p className="font-semibold">{selected.originalName}</p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Name</span>
                <input
                  className="w-full rounded border px-2 py-1.5"
                  value={selected.name}
                  onChange={(e) =>
                    update.mutate({ id: selected.id, name: e.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Alt text</span>
                <input
                  className="w-full rounded border px-2 py-1.5"
                  defaultValue={selected.altText}
                  onBlur={(e) => update.mutate({ id: selected.id, altText: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Caption</span>
                <input
                  className="w-full rounded border px-2 py-1.5"
                  defaultValue={selected.caption}
                  onBlur={(e) => update.mutate({ id: selected.id, caption: e.target.value })}
                />
              </label>
              <p className="break-all text-xs text-muted-foreground">{selected.url}</p>
              <p className="text-xs text-muted-foreground">
                {(selected.sizeBytes / 1024).toFixed(1)} KB · used in {selected.usedBy?.length ?? 0} places
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(selected.url);
                    setMessage('URL copied');
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy URL
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => {
                    if (confirm('Delete this file?')) remove.mutate({ id: selected.id });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a file to edit metadata.</p>
          )}
        </div>
      </div>
    </div>
  );
}
