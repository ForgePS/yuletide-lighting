'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { ACTIVITY_TYPE_LABELS, formatDate } from '@/lib/customer360-utils';
import type { ActivityType, CustomerActivity } from '@clcrm/types';

export function ActivityTimeline({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.customer360.activities.list.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const create = trpc.customer360.activities.create.useMutation({
    onSuccess: () => { toast('Activity logged', 'success'); refetch(); setShowForm(false); },
    onError: () => toast('Could not log activity', 'error'),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-semibold">Activity timeline</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add activity'}</button>
      </div>
      {showForm && (
        <ActivityForm
          onSubmit={(data) => create.mutate({ customerId, data })}
          loading={create.isPending}
        />
      )}
      {!data?.length ? (
        <EmptyState title="No activity yet" description="Customer interactions and milestones will appear here." />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {data.map((item) => (
            <TimelineItem key={item.id} item={item as CustomerActivity} />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: CustomerActivity }) {
  return (
    <li className="relative">
      <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">{ACTIVITY_TYPE_LABELS[item.activityType] ?? item.activityType}</span>
          <span className="text-xs text-muted-foreground">{formatDate(item.occurredAt)}</span>
        </div>
        <p className="mt-2 text-sm">{item.description}</p>
        {item.userName && <p className="mt-1 text-xs text-muted-foreground">By {item.userName}</p>}
        {item.relatedRecordLabel && (
          <p className="mt-1 text-xs text-primary">{item.relatedRecordType}: {item.relatedRecordLabel}</p>
        )}
      </div>
    </li>
  );
}

function ActivityForm({ onSubmit, loading }: { onSubmit: (data: { activityType: ActivityType; description: string }) => void; loading?: boolean }) {
  const [activityType, setActivityType] = useState<ActivityType>('note_added');
  const [description, setDescription] = useState('');
  return (
    <form className="card space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); onSubmit({ activityType, description }); }}>
      <select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)} className="input">
        {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px]" placeholder="Description..." />
      <button type="submit" className="btn-primary" disabled={loading}>Log activity</button>
    </form>
  );
}
