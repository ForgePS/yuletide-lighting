'use client';

import { useState } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import type { ServiceIssue, ServiceIssueCategory, ServiceIssuePriority, ServiceIssueStatus } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const STATUS_OPTIONS: Array<{ value: ServiceIssueStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'reported', label: 'Reported' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: Array<{ value: ServiceIssuePriority | ''; label: string }> = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CATEGORY_OPTIONS: Array<{ value: ServiceIssueCategory; label: string }> = [
  { value: 'lights_out', label: 'Lights out' },
  { value: 'timer_issue', label: 'Timer issue' },
  { value: 'damage', label: 'Damage' },
  { value: 'loose_material', label: 'Loose material' },
  { value: 'weather_related', label: 'Weather related' },
  { value: 'customer_request', label: 'Customer request' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
];

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function priorityClass(priority: ServiceIssuePriority) {
  if (priority === 'urgent') return 'bg-red-500/10 text-red-700';
  if (priority === 'high') return 'bg-amber-500/10 text-amber-700';
  if (priority === 'low') return 'bg-muted text-muted-foreground';
  return 'bg-blue-500/10 text-blue-700';
}

function statusClass(status: ServiceIssueStatus) {
  if (status === 'resolved' || status === 'closed') return 'bg-emerald-500/10 text-emerald-700';
  if (status === 'cancelled') return 'bg-red-500/10 text-red-700';
  if (status === 'scheduled' || status === 'in_progress') return 'bg-blue-500/10 text-blue-700';
  return 'bg-amber-500/10 text-amber-700';
}

function IssueForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [propertyLabel, setPropertyLabel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceIssueCategory>('lights_out');
  const [priority, setPriority] = useState<ServiceIssuePriority>('normal');
  const [warranty, setWarranty] = useState(false);
  const [assignedUserName, setAssignedUserName] = useState('');
  const create = trpc.serviceIssues360.create.useMutation({
    onSuccess: () => {
      toast('Service issue created', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not create service issue', 'error'),
  });

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          customerId: '',
          customerName,
          propertyId: '',
          propertyLabel,
          jobId: '',
          jobTitle,
          title,
          description,
          category,
          priority,
          status: 'reported',
          warranty,
          assignedUserId: '',
          assignedUserName,
          scheduledAt: null,
          resolvedAt: null,
          closedAt: null,
          resolutionNotes: '',
          photoUrls: [],
          source: 'manual',
        });
      }}
    >
      <input className="input" placeholder="Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      <input className="input" placeholder="Job / project" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      <input className="input" placeholder="Property / address" value={propertyLabel} onChange={(e) => setPropertyLabel(e.target.value)} />
      <input className="input" placeholder="Assigned to" value={assignedUserName} onChange={(e) => setAssignedUserName(e.target.value)} />
      <input className="input md:col-span-2" placeholder="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ServiceIssueCategory)}>
        {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as ServiceIssuePriority)}>
        {PRIORITY_OPTIONS.filter((option) => option.value).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <textarea
        className="input min-h-24 md:col-span-2"
        placeholder="What happened?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} />
        Warranty / callback issue
      </label>
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Create issue'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function IssueActions({ issue, onChanged }: { issue: ServiceIssue; onChanged: () => void }) {
  const { toast } = useToast();
  const updateStatus = trpc.serviceIssues360.updateStatus.useMutation({
    onSuccess: () => {
      toast('Service issue updated', 'success');
      onChanged();
    },
    onError: () => toast('Could not update issue', 'error'),
  });

  function mutate(status: ServiceIssueStatus, resolutionNotes = issue.resolutionNotes ?? '') {
    updateStatus.mutate({ issueId: issue.id, status, resolutionNotes });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {issue.status === 'reported' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('triaged')}>Triage</button>
      )}
      {issue.status === 'triaged' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('scheduled')}>Schedule</button>
      )}
      {(issue.status === 'scheduled' || issue.status === 'triaged') && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('in_progress')}>Start</button>
      )}
      {issue.status === 'in_progress' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('resolved', 'Resolved from service board')}>Resolve</button>
      )}
      {issue.status === 'resolved' && (
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => mutate('closed')}>Close</button>
      )}
    </div>
  );
}

function IssuesTable({ issues, onChanged }: { issues: ServiceIssue[]; onChanged: () => void }) {
  if (issues.length === 0) {
    return (
      <EmptyState
        title="No service issues found"
        description="Track callbacks, warranty work, lights out, timer problems, and customer requests here."
        icon={Wrench}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Customer</th>
            <th>Job</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Category</th>
            <th>Assigned</th>
            <th>Warranty</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td>
                <p className="font-medium">{issue.title}</p>
                <p className="text-xs text-muted-foreground">{issue.description || issue.propertyLabel || 'No description'}</p>
              </td>
              <td>{issue.customerName}</td>
              <td className="text-muted-foreground">{issue.jobTitle || '—'}</td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(issue.status)}`}>
                  {label(issue.status)}
                </span>
              </td>
              <td>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass(issue.priority)}`}>
                  {label(issue.priority)}
                </span>
              </td>
              <td className="text-muted-foreground">{label(issue.category)}</td>
              <td className="text-muted-foreground">{issue.assignedUserName || 'Unassigned'}</td>
              <td>{issue.warranty ? 'Yes' : 'No'}</td>
              <td><IssueActions issue={issue} onChanged={onChanged} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ServiceIssuesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ServiceIssueStatus | ''>('');
  const [priority, setPriority] = useState<ServiceIssuePriority | ''>('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = trpc.serviceIssues360.list.useQuery(
    {
      page: 1,
      pageSize: 100,
      search: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
    },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Service Issues</h1>
          <p className="page-subtitle">Track callbacks, warranty service, and customer requests through resolution.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New issue
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Total issues</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.totalIssues ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Open</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.openIssues ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">High / urgent</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.urgentIssues ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Warranty</p>
          <p className="mt-1 text-2xl font-bold">{data?.summary.warrantyIssues ?? 0}</p>
        </div>
      </div>

      {creating && <IssueForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search customer, job, issue, assigned user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value as ServiceIssueStatus | '')}>
          {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
        <select className="input max-w-xs" value={priority} onChange={(e) => setPriority(e.target.value as ServiceIssuePriority | '')}>
          {PRIORITY_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading service issues..." />}
        {isError && <ErrorState message="Could not load service issues." onRetry={() => refetch()} />}
        {!isLoading && !isError && <IssuesTable issues={data?.items ?? []} onChanged={() => refetch()} />}
      </div>
    </div>
  );
}
