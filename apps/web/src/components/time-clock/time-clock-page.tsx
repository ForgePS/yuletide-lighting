'use client';

import { useState } from 'react';
import { CheckCircle, Clock, Plus, Search, Timer } from 'lucide-react';
import type { TimeClockEntry, TimeEntryStatus, TimeEntryWorkType } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const STATUS_OPTIONS: Array<{ value: TimeEntryStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const WORK_TYPE_OPTIONS: Array<{ value: TimeEntryWorkType; label: string }> = [
  { value: 'installation', label: 'Installation' },
  { value: 'takedown', label: 'Takedown' },
  { value: 'service', label: 'Service' },
  { value: 'project_prep', label: 'Project prep' },
  { value: 'drive_time', label: 'Drive time' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function statusLabel(status: TimeEntryStatus) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: TimeEntryStatus) {
  if (status === 'active') return 'bg-blue-500/10 text-blue-700';
  if (status === 'approved') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'rejected') return 'bg-red-500/10 text-red-700';
  return 'bg-amber-500/10 text-amber-700';
}

function workTypeLabel(type: TimeEntryWorkType) {
  return WORK_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function ManualEntryForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [workType, setWorkType] = useState<TimeEntryWorkType>('installation');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [hourlyRate, setHourlyRate] = useState('');
  const create = trpc.timeClock360.create.useMutation({
    onSuccess: () => {
      toast('Time entry added', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not add time entry', 'error'),
  });

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          userName,
          userId: '',
          customerName,
          customerId: '',
          jobTitle,
          jobId: '',
          workType,
          status: clockOut ? 'submitted' : 'active',
          clockIn: new Date(clockIn),
          clockOut: clockOut ? new Date(clockOut) : null,
          breakMinutes,
          hourlyRateCents: Math.round((Number(hourlyRate) || 0) * 100),
          notes: '',
          startLocation: '',
          endLocation: '',
        });
      }}
    >
      <input className="input" placeholder="Employee name" value={userName} onChange={(e) => setUserName(e.target.value)} required />
      <select className="input" value={workType} onChange={(e) => setWorkType(e.target.value as TimeEntryWorkType)}>
        {WORK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <input className="input" placeholder="Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <input className="input" placeholder="Job / task" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Clock in</span>
        <input className="input" type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Clock out</span>
        <input className="input" type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
      </label>
      <input className="input" type="number" min="0" placeholder="Break minutes" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
      <input className="input" type="number" min="0" step="0.01" placeholder="Hourly rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Save time entry'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function TimeEntriesTable({ entries, onChanged }: { entries: TimeClockEntry[]; onChanged: () => void }) {
  const { toast } = useToast();
  const clockOut = trpc.timeClock360.clockOut.useMutation({
    onSuccess: () => {
      toast('Clocked out', 'success');
      onChanged();
    },
    onError: () => toast('Could not clock out', 'error'),
  });
  const approve = trpc.timeClock360.approve.useMutation({
    onSuccess: () => {
      toast('Time entry approved', 'success');
      onChanged();
    },
    onError: () => toast('Could not approve entry', 'error'),
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No time entries found"
        description="Track employee hours for installs, takedowns, prep, warehouse work, drive time, and admin tasks."
        icon={Timer}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Work</th>
            <th>Customer / job</th>
            <th>Clock in</th>
            <th>Clock out</th>
            <th>Hours</th>
            <th>Labor</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="font-medium">{entry.userName}</td>
              <td className="text-muted-foreground">{workTypeLabel(entry.workType)}</td>
              <td>
                <p>{entry.customerName || '—'}</p>
                <p className="text-xs text-muted-foreground">{entry.jobTitle || 'No job linked'}</p>
              </td>
              <td className="text-muted-foreground">{formatDateTime(entry.clockIn)}</td>
              <td className="text-muted-foreground">{formatDateTime(entry.clockOut)}</td>
              <td>{entry.hours.toFixed(2)}</td>
              <td>{formatCurrency(entry.laborCostCents)}</td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(entry.status)}`}>
                  {statusLabel(entry.status)}
                </span>
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {entry.status === 'active' && (
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => clockOut.mutate({ entryId: entry.id })}
                      disabled={clockOut.isPending}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Out
                    </button>
                  )}
                  {entry.status === 'submitted' && (
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => approve.mutate({ entryId: entry.id })}
                      disabled={approve.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimeClockPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TimeEntryStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = trpc.timeClock360.list.useQuery(
    { page: 1, pageSize: 100, search: search || undefined, status: status || undefined },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Time Clock</h1>
          <p className="page-subtitle">Track crew, prep, warehouse, and admin labor.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Add time entry
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.totalEntries ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.activeEntries ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Hours</p>
          <p className="mt-1 text-2xl font-bold">{(data?.summary.totalHours ?? 0).toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Labor cost</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(data?.summary.laborCostCents ?? 0)}</p>
        </div>
      </div>

      {creating && <ManualEntryForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search employee, customer, job, work type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as TimeEntryStatus | '')}>
          {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading time entries..." />}
        {isError && <ErrorState message="Could not load time entries." onRetry={() => refetch()} />}
        {!isLoading && !isError && <TimeEntriesTable entries={data?.items ?? []} onChanged={() => refetch()} />}
      </div>
    </div>
  );
}
