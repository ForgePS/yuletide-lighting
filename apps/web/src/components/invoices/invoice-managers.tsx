'use client';

import { REMINDER_STAGE_LABELS } from '@clcrm/types';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, riskColor } from '@/lib/invoice-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { recordInYear } from '@/lib/year-filter-utils';

export function CollectionsQueue() {
  const { data, isLoading } = trpc.invoices360.collections.list.useQuery();
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="Collection queue empty" description="Invoices 30+ days overdue are automatically queued." />;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="data-table w-full">
        <thead><tr><th>Invoice</th><th>Customer</th><th>Balance</th><th>Days overdue</th><th>Risk</th><th>Score</th></tr></thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/app/invoices/${item.invoiceId}`} className="font-medium text-primary hover:underline">{item.invoiceNumber}</Link>
              </td>
              <td>{item.customerName ?? '—'}</td>
              <td>{formatCurrency(item.balanceDueCents)}</td>
              <td>{item.daysOverdue}</td>
              <td className={`capitalize font-medium ${riskColor(item.riskLevel)}`}>{item.riskLevel}</td>
              <td>{item.riskScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgingReportTable() {
  const { data, isLoading } = trpc.invoices360.aging.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {data?.map((bucket) => (
        <div key={bucket.bucket} className="card p-4">
          <p className="text-sm font-semibold">{bucket.label}</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(bucket.balanceDueCents)}</p>
          <p className="text-xs text-muted-foreground">{bucket.invoiceCount} invoices · {bucket.customerCount} customers</p>
          <p className={`mt-1 text-xs capitalize ${riskColor(bucket.riskRating)}`}>Risk: {bucket.riskRating}</p>
        </div>
      ))}
    </div>
  );
}

export function PaymentHistory() {
  const { year } = useAnalyticsYear();
  const { data, isLoading } = trpc.invoices360.payments.listAll.useQuery();
  const payments = useMemo(
    () => (data ?? []).filter((p) => recordInYear(p.paidAt, year)),
    [data, year],
  );
  if (isLoading) return <LoadingState />;
  if (!payments.length) return <EmptyState title="No payments recorded" description="Payments from Stripe or manual entry appear here." />;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="data-table w-full">
        <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th><th>Type</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{formatDate(p.paidAt)}</td>
              <td>
                {p.invoiceId ? (
                  <Link href={`/app/invoices/${p.invoiceId}`} className="font-medium text-primary hover:underline">{p.invoiceNumber}</Link>
                ) : (
                  p.invoiceNumber
                )}
              </td>
              <td>{p.customerName ?? '—'}</td>
              <td>{formatCurrency(p.amountCents)}</td>
              <td className="capitalize">{p.paymentMethod.replace(/_/g, ' ')}</td>
              <td className="capitalize">{p.paymentType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DisputeManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.invoices360.disputes.list.useQuery();
  const update = trpc.invoices360.disputes.update.useMutation({
    onSuccess: () => { toast('Dispute updated'); utils.invoices360.disputes.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="No disputes" description="Disputes pause reminder automation until resolved." />;

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">Invoice dispute</p>
              <p className="text-sm text-muted-foreground">{d.reason}</p>
              <p className="mt-1 text-xs capitalize">Status: {d.status}</p>
            </div>
            {d.status === 'open' && (
              <button type="button" className="btn-secondary text-sm" onClick={() => update.mutate({ disputeId: d.id, invoiceId: d.invoiceId, status: 'resolved', resolution: 'Resolved by office' })}>
                Resolve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReminderEngine() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: invoices } = trpc.invoices360.list.useQuery();
  const process = trpc.invoices360.processReminders.useMutation({
    onSuccess: (r) => { toast(`Processed ${r.processed} reminders`); utils.invoices360.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const control = trpc.invoices360.reminders.control.useMutation({
    onSuccess: () => { toast('Reminder updated'); utils.invoices360.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const open = invoices?.filter((i) => i.balanceDueCents > 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => process.mutate()}>Run reminder engine</button>
      </div>
      <div className="space-y-3">
        {open.slice(0, 10).map((inv) => (
          <div key={inv.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{inv.invoiceNumber} — {inv.customerName}</p>
              <p className="text-sm text-muted-foreground">
                Stage: {inv.reminderStage ? REMINDER_STAGE_LABELS[inv.reminderStage] : 'None'} ·
                {inv.remindersPaused ? ' Paused' : ' Active'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => control.mutate({ invoiceId: inv.id, action: inv.remindersPaused ? 'resume' : 'pause' })}>
                {inv.remindersPaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => control.mutate({ invoiceId: inv.id, action: 'send_manual' })}>Send now</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReminderTemplateManager() {
  const { data, isLoading } = trpc.invoices360.reminders.templates.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-4">
      {data?.map((t) => (
        <div key={t.id} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{t.name}</p>
            <span className="text-xs text-muted-foreground">v{t.version} · {t.channel}</span>
          </div>
          <p className="mt-1 text-sm font-medium">{t.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</pre>
        </div>
      ))}
    </div>
  );
}

export function CashFlowForecast() {
  const { data, isLoading } = trpc.invoices360.forecasts.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {data?.map((f) => (
        <div key={f.horizonDays} className="card p-4">
          <p className="font-semibold">{f.horizonDays}-day forecast</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(f.expectedCollectionsCents)}</p>
          <p className="text-sm text-muted-foreground">Late risk: {formatCurrency(f.latePaymentRiskCents)}</p>
          <p className="text-sm text-muted-foreground">Seasonal: {formatCurrency(f.seasonalRevenueCents)}</p>
        </div>
      ))}
    </div>
  );
}

export function InvoiceAnalytics() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const { data, isLoading } = trpc.invoices360.analytics.useQuery(filterInput);
  if (isLoading) return <LoadingState />;
  if (!data) return null;
  const collectedLabel = yearLabel !== 'All time' ? `Collected in ${yearLabel}` : 'Revenue collected';
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Analytics for <span className="font-medium text-foreground">{yearLabel}</span></p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4"><p className="text-xs text-muted-foreground">{collectedLabel}</p><p className="text-lg font-semibold">{formatCurrency(data.revenueCollectedCents)}</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold">{formatCurrency(data.outstandingBalanceCents)}</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Collection rate</p><p className="text-lg font-semibold">{data.collectionRatePercent}%</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Avg days to pay</p><p className="text-lg font-semibold">{data.averageDaysToPay}</p></div>
      {data.topOverdueCustomers.length > 0 && (
        <div className="card col-span-full p-4">
          <h3 className="font-semibold">Top overdue customers</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topOverdueCustomers.map((c) => (
              <li key={c.customerId} className="flex justify-between border-b py-2">
                <span>{c.customerName}</span>
                <span>{formatCurrency(c.balanceCents)} ({c.invoiceCount} invoices)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  );
}

export function AICollectionsAssistant() {
  const [question, setQuestion] = useState('Show invoices overdue more than 30 days');
  const { data, refetch, isFetching } = trpc.invoices360.aiQuery.useQuery({ question }, { enabled: false });
  const { toast } = useToast();

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-semibold">AI Collections Assistant</h2>
      <div className="flex gap-2">
        <input className="input flex-1" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about collections..." />
        <button type="button" className="btn-primary" disabled={isFetching} onClick={() => { refetch().then(() => toast('Query complete')); }}>Ask</button>
      </div>
      {data && (
        <div className="space-y-3 text-sm">
          <p>{data.answer}</p>
          {data.recommendations.map((r) => <p key={r} className="text-muted-foreground">• {r}</p>)}
          {data.invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex justify-between border-t py-2">
              <span>{inv.invoiceNumber} — {inv.customerName}</span>
              <span>{formatCurrency(inv.balanceDueCents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecordPaymentForm() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: invoices } = trpc.invoices360.list.useQuery();
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const record = trpc.invoices360.payments.record.useMutation({
    onSuccess: () => { toast('Payment recorded'); utils.invoices360.invalidate(); setAmount(''); },
    onError: (e) => toast(e.message, 'error'),
  });

  const open = invoices?.filter((i) => i.balanceDueCents > 0) ?? [];

  return (
    <form className="card space-y-4 p-6" onSubmit={(e) => {
      e.preventDefault();
      if (!invoiceId || !amount) return;
      record.mutate({
        invoiceId,
        amountCents: Math.round(parseFloat(amount) * 100),
        paymentType: 'partial',
        paymentMethod: 'check',
      });
    }}>
      <h2 className="font-semibold">Record payment</h2>
      <select className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
        <option value="">Select invoice</option>
        {open.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(i.balanceDueCents)} due</option>)}
      </select>
      <input className="input" type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <button type="submit" className="btn-primary" disabled={record.isPending}>Record payment</button>
    </form>
  );
}

export function InvoiceReportsPage() {
  return (
    <div className="space-y-10">
      <InvoiceAnalytics />
      <CashFlowForecast />
      <AgingReportTable />
      <AICollectionsAssistant />
    </div>
  );
}

export function InvoiceSettingsPage() {
  return (
    <div className="space-y-10">
      <PaymentDateMigrationPanel />
      <ReminderEngine />
      <ReminderTemplateManager />
    </div>
  );
}

function PaymentDateMigrationPanel() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<{ payments: number; invoices: number; activity: number } | null>(null);
  const previewRun = trpc.invoices360.shift2026PaymentsTo2025.useMutation({
    onSuccess: (stats) => {
      setPreview(stats);
      toast('Preview complete', 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const apply = trpc.invoices360.shift2026PaymentsTo2025.useMutation({
    onSuccess: (stats) => {
      setPreview(stats);
      toast(`Updated ${stats.payments} payment(s), ${stats.invoices} invoice date(s)`, 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold">2026 payment date correction</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Moves any payment received in 2026 to the same date in 2025 so revenue and payment history reflect the prior season.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={previewRun.isPending} onClick={() => previewRun.mutate({ dryRun: true })}>
          {previewRun.isPending ? 'Previewing…' : 'Preview changes'}
        </button>
        <button type="button" className="btn-primary" disabled={apply.isPending} onClick={() => apply.mutate({ dryRun: false })}>
          {apply.isPending ? 'Applying…' : 'Apply correction'}
        </button>
      </div>
      {preview && (
        <p className="text-sm text-muted-foreground">
          {preview.payments} payment record(s), {preview.invoices} invoice paid date(s), {preview.activity} activity record(s) affected.
        </p>
      )}
    </div>
  );
}
