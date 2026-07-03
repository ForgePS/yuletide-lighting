'use client';

import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { downloadExport, formatCurrency, formatPercent } from '@/lib/report-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';

type KpiCard = { label: string; value: string };

export function KpiGrid({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function BarList({ items, labelKey, valueKey, format = 'currency' }: {
  items: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
  format?: 'currency' | 'number' | 'percent';
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const val = Number(item[valueKey]) || 0;
        const label = String(item[labelKey]);
        const display = format === 'currency' ? formatCurrency(val) : format === 'percent' ? formatPercent(val) : String(val);
        return (
          <div key={`${label}-${idx}`}>
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="font-medium">{display}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(val / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FunnelChart({ stages }: { stages: Array<{ stage: string; count: number; valueCents?: number }> }) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-muted-foreground">{s.stage}</span>
          <div className="flex-1">
            <div className="h-8 rounded bg-primary/10" style={{ width: `${Math.max(20, (s.count / max) * 100)}%` }}>
              <div className="flex h-full items-center px-2 text-xs font-medium">{s.count}</div>
            </div>
          </div>
          {s.valueCents != null && s.valueCents > 0 && (
            <span className="w-24 text-right text-sm">{formatCurrency(s.valueCents)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ExportButton({ reportType, format = 'csv' }: {
  reportType: 'executive' | 'sales' | 'financial' | 'customers' | 'operations' | 'inventory' | 'crews';
  format?: 'csv' | 'excel' | 'pdf' | 'json';
}) {
  const { year } = useAnalyticsYear();
  const utils = trpc.useUtils();
  async function handleExport() {
    const result = await utils.reports360.export.fetch({ reportType, format, year });
    const ext = format === 'excel' ? 'csv' : format;
    downloadExport(result.content, `${reportType}-report.${ext}`);
  }
  return (
    <button type="button" onClick={handleExport} className="btn-secondary text-sm">
      Export {format.toUpperCase()}
    </button>
  );
}

export function ReportsLoading({ message = 'Loading report...' }: { message?: string }) {
  return <LoadingState message={message} />;
}

export function ReportsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
