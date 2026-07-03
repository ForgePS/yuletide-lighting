'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatDate } from '@clcrm/ui';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { AUTOMATION360_TRIGGER_LABELS, type Automation360Trigger } from '@clcrm/types';

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send email' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'notify_user', label: 'Notify team' },
  { value: 'create_task', label: 'Create task' },
  { value: 'change_stage', label: 'Change pipeline stage' },
  { value: 'create_follow_up_reminder', label: 'Follow-up reminder' },
] as const;

const TRIGGERS = Object.entries(AUTOMATION360_TRIGGER_LABELS).map(([value, label]) => ({ value, label }));

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-muted text-muted-foreground',
};

export function AutomationHub() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: dashboard, isLoading: dashLoading } = trpc.automation360.dashboard.useQuery();
  const { data: rules, isLoading: rulesLoading } = trpc.automation360.rules.list.useQuery();
  const { data: runs, isLoading: runsLoading } = trpc.automation360.runs.list.useQuery({ limit: 40 });

  const toggle = trpc.automation360.rules.toggle.useMutation({
    onSuccess: () => {
      toast('Rule updated', 'success');
      utils.automation360.rules.list.invalidate();
      utils.automation360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const create = trpc.automation360.rules.create.useMutation({
    onSuccess: () => {
      toast('Automation rule created', 'success');
      setShowForm(false);
      resetForm();
      utils.automation360.rules.list.invalidate();
      utils.automation360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [tab, setTab] = useState<'rules' | 'history'>('rules');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<Automation360Trigger>('new_lead_created');
  const [actionType, setActionType] = useState<(typeof ACTION_TYPES)[number]['value']>('send_email');
  const [body, setBody] = useState('Hi {{customerName}}, ');

  function resetForm() {
    setName('');
    setTrigger('new_lead_created');
    setActionType('send_email');
    setBody('Hi {{customerName}}, ');
  }

  if (dashLoading || rulesLoading) return <LoadingState message="Loading automation center..." />;

  const cards = [
    { label: 'Total rules', value: String(dashboard?.totalRules ?? 0) },
    { label: 'Active', value: String(dashboard?.activeRules ?? 0) },
    { label: 'Runs today', value: String(dashboard?.runsToday ?? 0) },
    { label: 'Failed (24h)', value: String(dashboard?.failedRuns24h ?? 0) },
    { label: 'Success rate', value: `${dashboard?.successRatePercent ?? 100}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 border-b border-border">
          {(['rules', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'rules' && (
          <button type="button" className="btn-primary text-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New rule'}
          </button>
        )}
      </div>

      {showForm && tab === 'rules' && (
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const config =
              actionType === 'send_email'
                ? { subject: 'Automated message', body }
                : actionType === 'change_stage'
                  ? { stage: 'contacted' }
                  : actionType === 'create_task'
                    ? { title: body, dueDays: 1 }
                    : actionType === 'notify_user'
                      ? { channelType: 'sales', body }
                      : { body };
            create.mutate({
              name,
              trigger,
              actions: [{ type: actionType, config }],
              conditions: [],
              active: true,
            });
          }}
        >
          <h2 className="font-semibold">Create automation rule</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Trigger</label>
              <select className="input mt-1 w-full" value={trigger} onChange={(e) => setTrigger(e.target.value as Automation360Trigger)}>
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <select
                className="input mt-1 w-full"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as typeof actionType)}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Message / task text</label>
              <textarea className="input mt-1 min-h-[80px] w-full" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            Save rule
          </button>
        </form>
      )}

      {tab === 'rules' ? (
        !rules?.length ? (
          <EmptyState title="No automation rules" description="Default rules are created on first visit." />
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {AUTOMATION360_TRIGGER_LABELS[rule.trigger]} · {rule.actions.length} action
                    {rule.actions.length === 1 ? '' : 's'} · {rule.runCount} runs
                    {rule.lastRunAt ? ` · last ${formatDate(rule.lastRunAt)}` : ''}
                  </p>
                  {rule.description && <p className="mt-1 text-xs text-muted-foreground">{rule.description}</p>}
                  <p className="mt-2 text-xs capitalize text-muted-foreground">
                    Actions: {rule.actions.map((a) => a.type.replace(/_/g, ' ')).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  className={rule.active ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ ruleId: rule.id, active: !rule.active })}
                >
                  {rule.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : runsLoading ? (
        <LoadingState message="Loading run history..." />
      ) : !runs?.length ? (
        <EmptyState title="No runs yet" description="Automation history appears when lifecycle events fire rules." />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Rule</th>
                <th>Trigger</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className={run.status === 'failed' ? 'bg-red-50/50' : undefined}>
                  <td className="whitespace-nowrap text-sm">{formatDate(run.createdAt)}</td>
                  <td>{run.ruleName}</td>
                  <td className="text-sm">{AUTOMATION360_TRIGGER_LABELS[run.trigger]}</td>
                  <td className="text-sm">{run.customerName ?? run.customerId ?? '—'}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[run.status]}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">
                    {run.errorMessage ?? run.contextSummary ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
