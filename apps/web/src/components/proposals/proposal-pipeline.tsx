'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { proposalInYear } from '@/lib/year-filter-utils';
import { PIPELINE_COLUMNS, labelProposalStatus, formatCurrency, labelInstallType } from '@/lib/proposal-utils';
import { LoadingState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ProposalStatus } from '@clcrm/types';

export function ProposalPipeline() {
  const { toast } = useToast();
  const { year } = useAnalyticsYear();
  const { data, isLoading, refetch } = trpc.proposals360.list.useQuery();
  const updateStatus = trpc.proposals360.updateStatus.useMutation({
    onSuccess: () => { toast('Proposal moved', 'success'); refetch(); },
    onError: () => toast('Could not update status', 'error'),
  });
  const remove = trpc.proposals360.delete.useMutation({
    onSuccess: () => { toast('Proposal removed', 'success'); refetch(); setRemoveId(null); },
    onError: () => toast('Could not remove proposal', 'error'),
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const proposals = useMemo(
    () => (data ?? []).filter((p) => proposalInYear(p, year)),
    [data, year],
  );

  if (isLoading) return <LoadingState />;

  function onDrop(status: ProposalStatus) {
    if (!dragId) return;
    updateStatus.mutate({ proposalId: dragId, status });
    setDragId(null);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {PIPELINE_COLUMNS.map((status) => {
          const items = proposals.filter((p) => {
            const s = p.status === 'accepted' ? 'approved' : p.status === 'declined' ? 'rejected' : p.status;
            return s === status;
          });
          return (
            <div
              key={status}
              className="w-64 shrink-0 rounded-xl border border-border bg-muted/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(status)}
            >
              <div className="border-b border-border px-3 py-2">
                <h3 className="text-sm font-semibold">{labelProposalStatus(status)}</h3>
                <p className="text-xs text-muted-foreground">{items.length}</p>
              </div>
              <div className="space-y-2 p-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm active:cursor-grabbing"
                  >
                    <Link href={`/app/proposals/${p.id}`} className="text-sm font-medium text-primary hover:underline">{p.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{p.customerName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{labelInstallType(p.installType)} · {p.season ?? '—'}</p>
                    <p className="mt-1 text-xs font-medium">{formatCurrency(p.subtotalCents)}</p>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/app/proposals/${p.id}/edit`} className="btn-secondary px-2 py-1 text-xs">Edit</Link>
                      <button type="button" className="btn-ghost px-2 py-1 text-xs text-primary" onClick={() => setRemoveId(p.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!removeId}
        title="Remove proposal?"
        message="This removes the proposal and any linked draft job from the system."
        confirmLabel="Remove proposal"
        destructive
        onCancel={() => setRemoveId(null)}
        onConfirm={() => removeId && remove.mutate({ proposalId: removeId })}
        loading={remove.isPending}
      />
    </div>
  );
}
