'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import type { CustomerStage } from '@clcrm/types';
import {
  formatCurrency,
  labelPipelineStage,
  pipelineStageColor,
  PIPELINE_STAGES,
} from '@/lib/pipeline-utils';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { CustomerPipelineCard } from './customer-pipeline-card';
import { StageRevenueSummary } from './stage-revenue-summary';

export function PipelineBoard() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<CustomerStage[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.customer360.pipeline.useQuery({
    search: search.trim() || undefined,
    stages: stageFilter.length ? stageFilter : undefined,
    overdueOnly: overdueOnly || undefined,
  });

  const updateStage = trpc.customer360.updatePipelineStage.useMutation({
    onSuccess: () => {
      toast('Customer moved', 'success');
      refetch();
    },
    onError: () => toast('Could not update stage', 'error'),
  });

  const columns = useMemo(() => {
    if (!data) return [];
    if (stageFilter.length) return data.columns;
    return data.columns;
  }, [data, stageFilter]);

  if (isLoading) return <LoadingState />;

  if (!data) return <EmptyState title="No pipeline data" description="Could not load the customer pipeline." />;

  function onDrop(stage: CustomerStage) {
    if (!dragId) return;
    updateStage.mutate({ customerId: dragId, stage });
    setDragId(null);
  }

  function toggleStageFilter(stage: CustomerStage) {
    setStageFilter((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
    );
  }

  return (
    <div className="space-y-6">
      <StageRevenueSummary
        count={data.totals.count}
        revenueCents={data.totals.revenueCents}
        overdueCount={data.totals.overdueCount}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-border"
          />
          Overdue only
        </label>
        {stageFilter.length > 0 && (
          <button type="button" className="btn-ghost text-sm" onClick={() => setStageFilter([])}>
            Clear stage filters ({stageFilter.length})
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-3">
          {columns.map((col) => (
            <div
              key={col.stage}
              className={`w-72 shrink-0 rounded-xl border ${pipelineStageColor(col.stage)}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.stage)}
            >
              <div className="border-b border-border/60 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{labelPipelineStage(col.stage)}</h3>
                  <button
                    type="button"
                    title="Filter to this stage"
                    onClick={() => toggleStageFilter(col.stage)}
                    className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                      stageFilter.includes(col.stage)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {col.count}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{formatCurrency(col.revenueCents)}</p>
              </div>
              <div className="max-h-[calc(100vh-22rem)] space-y-2 overflow-y-auto p-2">
                {col.customers.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">No customers</p>
                ) : (
                  col.customers.map((customer) => (
                    <CustomerPipelineCard
                      key={customer.id}
                      customer={customer}
                      onDragStart={() => setDragId(customer.customerId)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">All stages</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {PIPELINE_STAGES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleStageFilter(value)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                stageFilter.includes(value) ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
