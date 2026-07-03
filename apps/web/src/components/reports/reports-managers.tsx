'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PillSelect } from '@/components/ui/pill-select';
import { AI_SUGGESTIONS, formatCurrency } from '@/lib/report-utils';
import { ReportsLoading, ReportsError } from './reports-widgets';

export function AIAnalyticsAssistant() {
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { toast } = useToast();
  const { data, isFetching, isError } = trpc.reports360.aiQuery.useQuery(
    { question: submitted },
    { enabled: submitted.length >= 3 },
  );

  function ask(q?: string) {
    const text = (q ?? question).trim();
    if (text.length < 3) {
      toast('Enter a question with at least 3 characters', 'error');
      return;
    }
    setQuestion(text);
    setSubmitted(text);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-semibold">AI Business Intelligence</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ask questions about revenue, crews, customers, inventory, and forecasts.</p>
        <div className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. Show my highest profit customers"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button type="button" className="btn-primary" onClick={() => ask()} disabled={isFetching}>
            {isFetching ? 'Analyzing...' : 'Ask'}
          </button>
        </div>
        <PillSelect
          label="Suggested questions"
          value=""
          placeholder="Choose a suggested question..."
          onChange={(question) => ask(question)}
          options={AI_SUGGESTIONS.map((s) => ({ value: s, label: s }))}
          className="mt-3 max-w-xl"
        />
      </div>

      {isError && <p className="text-sm text-red-600">Query failed. Try again.</p>}

      {data && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-medium">Answer</h3>
            <p className="mt-2">{data.answer}</p>
          </div>
          {data.recommendations.length > 0 && (
            <div className="card p-6">
              <h3 className="font-medium">Recommendations</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {data.recommendations.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}
          {data.riskAlerts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-medium text-red-900">Risk alerts</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-800">
                {data.riskAlerts.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CustomDashboardBuilder() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'owner' | 'sales_manager' | 'operations_manager' | 'crew_leader' | 'office_staff'>('owner');
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = trpc.reports360.customDashboards.useQuery({});
  const create = trpc.reports360.createDashboard.useMutation({
    onSuccess: () => {
      toast('Dashboard saved', 'success');
      setName('');
      refetch();
    },
  });

  const widgets = ['executive', 'revenue', 'sales', 'operations', 'customers', 'crews', 'inventory', 'financial', 'forecasting'];

  if (isLoading) return <ReportsLoading message="Loading dashboards..." />;
  if (isError) return <ReportsError message="Could not load dashboards." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="font-semibold">Create custom dashboard</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input className="input" placeholder="Dashboard name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="owner">Owner</option>
            <option value="sales_manager">Sales manager</option>
            <option value="operations_manager">Operations manager</option>
            <option value="crew_leader">Crew leader</option>
            <option value="office_staff">Office staff</option>
          </select>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Select widgets to include:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {widgets.map((w) => (
            <span key={w} className="rounded border px-2 py-1 text-xs capitalize">{w.replace(/_/g, ' ')}</span>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate({ name, role, widgetIds: widgets.slice(0, 4) })}
        >
          Save dashboard
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Saved dashboards</h2>
        <div className="mt-4 space-y-3">
          {(data ?? []).map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{d.role.replace(/_/g, ' ')} · {d.widgetIds.length} widgets{d.isDefault ? ' · default' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScheduledReportsManager() {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = trpc.reports360.scheduledReports.useQuery();
  const run = trpc.reports360.runScheduledReport.useMutation({
    onSuccess: (r) => toast(`Report generated: ${r.reportName}`, 'success'),
  });

  if (isLoading) return <ReportsLoading message="Loading scheduled reports..." />;
  if (isError) return <ReportsError message="Could not load scheduled reports." onRetry={() => refetch()} />;

  return (
    <div className="card p-6">
      <h2 className="font-semibold">Scheduled reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">Automated delivery via email, PDF, CSV, or Excel.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Frequency</th>
              <th>Delivery</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td className="capitalize">{r.reportType}</td>
                <td className="capitalize">{r.frequency}</td>
                <td className="uppercase">{r.deliveryMethod}</td>
                <td>{r.isActive ? 'Active' : 'Paused'}</td>
                <td>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    disabled={run.isPending}
                    onClick={() => run.mutate({ reportId: r.id })}
                  >
                    Run now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsHubPage() {
  const { data: executive } = trpc.reports360.executive.useQuery(undefined, { staleTime: 120_000, refetchInterval: 5 * 60_000 });

  return (
    <div className="space-y-8">
      <AIAnalyticsAssistant />
      <ScheduledReportsManager />
      {executive && (
        <div className="card p-6">
          <h2 className="font-semibold">Quick snapshot</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Season revenue</p><p className="text-xl font-bold">{formatCurrency(executive.revenueThisSeasonCents)}</p></div>
            <div><p className="text-xs text-muted-foreground">Jobs completed</p><p className="text-xl font-bold">{executive.jobsCompleted}</p></div>
            <div><p className="text-xs text-muted-foreground">Conversion rate</p><p className="text-xl font-bold">{executive.proposalConversionRatePercent}%</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
