'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { DESIGN_STATUS_OPTIONS, formatDate } from '@/lib/customer360-utils';
import type { DesignRecord, DesignStatus } from '@clcrm/types';

export function DesignHistory({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.customer360.designs.list.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const [compare, setCompare] = useState<[string, string] | null>(null);
  const create = trpc.customer360.designs.create.useMutation({
    onSuccess: () => { toast('Design added', 'success'); refetch(); setShowForm(false); },
    onError: () => toast('Could not add design', 'error'),
  });
  const update = trpc.customer360.designs.update.useMutation({
    onSuccess: () => { toast('Design updated', 'success'); refetch(); },
  });

  if (isLoading) return <LoadingState />;

  const selected = compare ? data?.filter((d) => compare.includes(d.id)) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">Design history</h2>
        <div className="flex gap-2">
          {compare && <button type="button" className="btn-secondary" onClick={() => setCompare(null)}>Clear compare</button>}
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add design'}</button>
        </div>
      </div>
      {showForm && <DesignForm onSubmit={(data) => create.mutate({ customerId, data: data as never })} loading={create.isPending} />}
      {compare && selected?.length === 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          {selected.map((d) => (
            <div key={d.id} className="card p-4">
              <h3 className="font-semibold">{d.designName} v{d.versionNumber}</h3>
              <p className="text-sm text-muted-foreground">{d.revisionNotes ?? 'No notes'}</p>
            </div>
          ))}
        </div>
      )}
      {!data?.length && !showForm ? (
        <EmptyState title="No designs yet" description="Track mockups, revisions, and approvals here." />
      ) : (
        <div className="space-y-3">
          {data?.map((d) => (
            <div key={d.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{d.designName} <span className="text-muted-foreground">v{d.versionNumber}</span></p>
                <p className="text-sm text-muted-foreground">{d.propertyName ?? '—'} · {d.designerName ?? '—'} · {formatDate(d.createdAt)}</p>
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">{d.status}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-sm" onClick={() => setCompare((prev) => (prev ? [prev[0], d.id] : [d.id, d.id]))}>Compare</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => update.mutate({ customerId, designId: d.id, data: { status: 'approved' as DesignStatus } })}>Approve</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => create.mutate({ customerId, data: { designName: d.designName, versionNumber: d.versionNumber + 1, propertyName: d.propertyName ?? '', status: 'draft', revisionNotes: 'Duplicate' } })}>Duplicate</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DesignForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading?: boolean }) {
  const [form, setForm] = useState({ designName: '', propertyName: '', versionNumber: 1, status: 'draft' as DesignStatus, revisionNotes: '' });
  return (
    <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <input required placeholder="Design name *" value={form.designName} onChange={(e) => setForm({ ...form, designName: e.target.value })} className="input" />
      <input placeholder="Property" value={form.propertyName} onChange={(e) => setForm({ ...form, propertyName: e.target.value })} className="input" />
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DesignStatus })} className="input">
        {DESIGN_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <textarea placeholder="Revision notes" value={form.revisionNotes} onChange={(e) => setForm({ ...form, revisionNotes: e.target.value })} className="input sm:col-span-2" rows={2} />
      <button type="submit" className="btn-primary sm:col-span-2" disabled={loading}>Save design</button>
    </form>
  );
}
