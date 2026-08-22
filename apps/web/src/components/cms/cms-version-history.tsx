'use client';

import { History, RotateCcw } from 'lucide-react';
import { formatDate } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';

type Props = {
  pageId: string;
  onRestored: () => void;
};

export function CmsVersionHistoryPanel({ pageId, onRestored }: Props) {
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.websiteCms.pages.versions.useQuery(
    { pageId, limit: 20 },
    { enabled: !!pageId },
  );
  const restore = trpc.websiteCms.pages.restoreVersion.useMutation({
    onSuccess: () => {
      void utils.websiteCms.pages.list.invalidate();
      void utils.websiteCms.pages.get.invalidate({ id: pageId });
      void utils.websiteCms.pages.versions.invalidate({ pageId });
      onRestored();
    },
  });

  return (
    <details className="rounded-xl border border-border bg-muted/30 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
        <History className="h-4 w-4" /> Version history
      </summary>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading versions…</p> : null}
        {!isLoading && !versions?.length ? (
          <p className="text-sm text-muted-foreground">No versions yet. Save the page to create one.</p>
        ) : null}
        {versions?.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">v{v.version}</p>
              <p className="text-xs text-muted-foreground">
                {v.summary} · {formatDate(v.createdAt)} · {v.createdByEmail}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={restore.isPending}
              onClick={() => {
                if (confirm(`Restore version ${v.version}? Current content will be saved as a new version.`)) {
                  restore.mutate({ versionId: v.id });
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
