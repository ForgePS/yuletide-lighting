'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate, JOB_STATUS_OPTIONS, JOB_TYPE_OPTIONS } from '@/lib/customer360-utils';
import type { JobRecord, JobType, JobStatus } from '@clcrm/types';

export function JobHistory({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.customer360.jobs.list.useQuery({ customerId });
  const [showForm, setShowForm] = useState(false);
  const create = trpc.customer360.jobs.create.useMutation({
    onSuccess: () => { toast('Job added', 'success'); refetch(); setShowForm(false); },
    onError: () => toast('Could not add job', 'error'),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-semibold">Jobs & installation history</h2>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add job'}</button>
      </div>
      {showForm && <JobForm onSubmit={(data) => create.mutate({ customerId, data: data as never })} loading={create.isPending} />}
      {!data?.length && !showForm ? (
        <EmptyState title="No jobs yet" description="Track installs, takedowns, and service calls." />
      ) : (
        <div className="space-y-3">
          {data?.map((job) => (
            <JobCard key={job.id} customerId={customerId} job={job as JobRecord} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function toDateInput(date?: Date | string | null) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function JobCard({ customerId, job, onChanged }: { customerId: string; job: JobRecord; onChanged: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const update = trpc.customer360.jobs.update.useMutation({
    onSuccess: () => { toast('Job updated', 'success'); onChanged(); setEditing(false); },
    onError: () => toast('Could not update job', 'error'),
  });
  const remove = trpc.customer360.jobs.delete.useMutation({
    onSuccess: () => { toast('Job removed', 'success'); onChanged(); setRemoveOpen(false); },
    onError: () => toast('Could not remove job', 'error'),
  });

  if (editing) {
    return (
      <JobForm
        initialJob={job}
        onCancel={() => setEditing(false)}
        onSubmit={(data) => update.mutate({ customerId, jobId: job.id, data: data as never })}
        loading={update.isPending}
      />
    );
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{job.title}</p>
          <p className="text-sm text-muted-foreground capitalize">{job.jobType.replace(/_/g, ' ')} · {job.propertyName ?? '—'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{job.status.replace(/_/g, ' ')}</span>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className="btn-ghost px-2 py-1 text-xs text-primary" onClick={() => setRemoveOpen(true)}>Remove</button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div><span className="text-muted-foreground">Scheduled</span><p>{job.scheduledDate ? formatDate(job.scheduledDate) : '—'}</p></div>
        <div><span className="text-muted-foreground">Completed</span><p>{job.completionDate ? formatDate(job.completionDate) : '—'}</p></div>
        <div><span className="text-muted-foreground">Revenue</span><p>{formatCurrency(job.revenueCents)}</p></div>
      </div>
      {job.crewNotes && <p className="mt-2 text-sm text-muted-foreground">{job.crewNotes}</p>}
      <ConfirmDialog
        open={removeOpen}
        title="Remove job?"
        message={`This removes "${job.title}" from this customer's job history.`}
        confirmLabel="Remove job"
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => remove.mutate({ customerId, jobId: job.id })}
        loading={remove.isPending}
      />
    </div>
  );
}

function JobForm({
  onSubmit,
  loading,
  initialJob,
  onCancel,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  initialJob?: JobRecord;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: initialJob?.title ?? '',
    jobType: initialJob?.jobType ?? 'installation' as JobType,
    propertyName: initialJob?.propertyName ?? '',
    status: initialJob?.status ?? 'draft' as JobStatus,
    scheduledDate: toDateInput(initialJob?.scheduledDate),
    completionDate: toDateInput(initialJob?.completionDate),
    revenueCents: initialJob?.revenueCents ?? 0,
    crewNotes: initialJob?.crewNotes ?? '',
    materialsUsed: initialJob?.materialsUsed ?? '',
    assignedCrewNames: initialJob?.assignedCrewNames ?? [] as string[],
  });
  return (
    <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate) : null,
        completionDate: form.completionDate ? new Date(form.completionDate) : null,
        revenueCents: Number(form.revenueCents) || 0,
      });
    }}>
      <input required placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input sm:col-span-2" />
      <select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value as JobType })} className="input">
        {JOB_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })} className="input">
        {JOB_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input placeholder="Property" value={form.propertyName} onChange={(e) => setForm({ ...form, propertyName: e.target.value })} className="input" />
      <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="input" />
      <input type="date" value={form.completionDate} onChange={(e) => setForm({ ...form, completionDate: e.target.value })} className="input" />
      <input type="number" placeholder="Revenue (cents)" value={form.revenueCents} onChange={(e) => setForm({ ...form, revenueCents: Number(e.target.value) })} className="input" />
      <textarea placeholder="Materials used" value={form.materialsUsed} onChange={(e) => setForm({ ...form, materialsUsed: e.target.value })} className="input sm:col-span-2" rows={2} />
      <textarea placeholder="Crew notes" value={form.crewNotes} onChange={(e) => setForm({ ...form, crewNotes: e.target.value })} className="input sm:col-span-2" rows={2} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={loading}>Save job</button>
      </div>
    </form>
  );
}
