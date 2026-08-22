'use client';

import { Library, Plus, Trash2 } from 'lucide-react';
import { createBlockId, type CmsBlock, type CmsSavedSection } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

type Props = {
  onInsert: (blocks: CmsBlock[]) => void;
  selectedBlocks?: CmsBlock[];
};

function cloneBlocks(blocks: CmsBlock[]): CmsBlock[] {
  return blocks.map((b) => ({
    ...JSON.parse(JSON.stringify(b)),
    id: createBlockId(),
  })) as CmsBlock[];
}

export function CmsSectionLibraryPanel({ onInsert, selectedBlocks }: Props) {
  const utils = trpc.useUtils();
  const { data: sections, isLoading } = trpc.websiteCms.sections.list.useQuery();
  const create = trpc.websiteCms.sections.create.useMutation({
    onSuccess: () => void utils.websiteCms.sections.list.invalidate(),
  });
  const remove = trpc.websiteCms.sections.delete.useMutation({
    onSuccess: () => void utils.websiteCms.sections.list.invalidate(),
  });

  return (
    <details className="rounded-xl border border-border bg-muted/30 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <Library className="h-4 w-4" /> Section library
      </summary>
      <div className="mt-3 space-y-3">
        {selectedBlocks?.length ? (
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={create.isPending}
            onClick={() => {
              const name = window.prompt('Section name', selectedBlocks[0]?.label || 'Saved section');
              if (!name) return;
              create.mutate({ name, blocks: selectedBlocks });
            }}
          >
            <Plus className="h-4 w-4" /> Save selected / page blocks as section
          </button>
        ) : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!isLoading && !sections?.length ? (
          <p className="text-sm text-muted-foreground">No saved sections yet.</p>
        ) : null}
        <ul className="space-y-2">
          {sections?.map((sec: CmsSavedSection) => (
            <li
              key={sec.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{sec.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sec.blocks.length} block{sec.blocks.length === 1 ? '' : 's'}
                  {sec.description ? ` · ${sec.description}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => onInsert(cloneBlocks(sec.blocks))}
                >
                  Insert
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => {
                    if (confirm(`Delete section “${sec.name}”?`)) remove.mutate({ id: sec.id });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
