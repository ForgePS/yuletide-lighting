'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ACTIVITY_TYPE_LABELS, formatDate } from '@/lib/customer360-utils';
import type { ActivityType } from '@clcrm/types';

export function ActivityTimeline({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.customer360.activities.unified.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const create = trpc.customer360.activities.create.useMutation({
    onSuccess: () => {
      toast('Activity logged', 'success');
      refetch();
      setShowForm(false);
    },
    onError: () => toast('Could not log activity', 'error'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load timeline.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="font-semibold">Unified timeline</h2>
          <p className="text-sm text-muted-foreground">Activities, proposal events, and messages in one stream.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add activity'}
        </button>
      </div>
      {showForm && (
        <ActivityForm
          onSubmit={(payload) => create.mutate({ customerId, data: payload })}
          loading={create.isPending}
        />
      )}
      {!data?.length ? (
        <EmptyState title="No activity yet" description="Customer interactions and milestones will appear here." />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {data.map((item) => (
            <li key={`${item.source}-${item.id}`} className="relative">
              <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
              <div className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {ACTIVITY_TYPE_LABELS[item.title as ActivityType] ?? item.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(item.occurredAt)}</span>
                </div>
                {item.description && <p className="mt-2 text-sm">{item.description}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{item.source}</span>
                  {item.userName && <span>By {item.userName}</span>}
                  {item.relatedRecordLabel && <span className="text-primary">{item.relatedRecordLabel}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: { activityType: ActivityType; description: string }) => void;
  loading?: boolean;
}) {
  const [activityType, setActivityType] = useState<ActivityType>('note_added');
  const [description, setDescription] = useState('');
  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ activityType, description });
      }}
    >
      <select
        value={activityType}
        onChange={(e) => setActivityType(e.target.value as ActivityType)}
        className="input"
      >
        {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input min-h-[80px]"
        placeholder="Description..."
      />
      <button type="submit" className="btn-primary" disabled={loading}>
        Log activity
      </button>
    </form>
  );
}
