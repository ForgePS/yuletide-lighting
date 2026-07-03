'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/inventory-utils';
import { LoadingState } from '@/components/ui/states';

export function InventoryAnalyticsPage() {
  const { data, isLoading } = trpc.inventory360.analytics.useQuery();
  const [question, setQuestion] = useState('Show items below reorder level');
  const { data: aiResult, refetch: askAi } = trpc.inventory360.aiQuery.useQuery({ question }, { enabled: false });

  if (isLoading || !data) return <LoadingState />;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="font-semibold">AI Inventory Assistant</h2>
        <div className="mt-4 flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="input flex-1" placeholder="Ask about inventory..." />
          <button type="button" className="btn-primary" onClick={() => askAi()}>Ask</button>
        </div>
        {aiResult && (
          <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium">{aiResult.answer}</p>
            <ul className="mt-2 space-y-1">{aiResult.items.map((i) => <li key={i.id}>{i.name} — {i.detail}</li>)}</ul>
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Inventory value over time</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {data.valueOverTime.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(12, (m.valueCents / (data.valueOverTime.at(-1)?.valueCents ?? 1)) * 120)}px` }} />
                <span className="text-[10px]">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Top used items</h2>
          <ul className="mt-4 space-y-2 text-sm">{data.topUsedItems.map((i) => <li key={i.sku} className="flex justify-between"><span>{i.name}</span><span>{i.usage} used</span></li>)}</ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Slow moving</h2>
          <ul className="mt-4 space-y-2 text-sm">{data.slowMovingItems.map((i) => <li key={i.sku}>{i.name} — {i.daysIdle}d idle</li>)}</ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Turnover rate</h2>
          <p className="mt-4 text-3xl font-bold">{data.turnoverRate}x</p>
        </div>
      </div>
    </div>
  );
}

export function InventoryReportsPage() {
  const { data: items } = trpc.inventory360.items.list.useQuery();
  const { data: dashboard } = trpc.inventory360.dashboard.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary">Export CSV</button>
        <button type="button" className="btn-secondary">Export Excel</button>
        <button type="button" className="btn-secondary">Export PDF</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Inventory valuation', value: formatCurrency(dashboard?.totalInventoryValueCents ?? 0) },
          { title: 'Damaged inventory', value: formatCurrency(dashboard?.damagedInventoryValueCents ?? 0) },
          { title: 'Customer inventory', value: formatCurrency(dashboard?.customerOwnedValueCents ?? 0) },
        ].map((r) => (
          <div key={r.title} className="card p-4"><p className="text-sm text-muted-foreground">{r.title}</p><p className="mt-1 text-xl font-semibold">{r.value}</p></div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>SKU</th><th>Name</th><th>On hand</th><th>Value</th></tr></thead>
          <tbody>{items?.slice(0, 20).map((i) => <tr key={i.id}><td className="font-mono text-xs">{i.sku}</td><td>{i.name}</td><td>{i.quantityOnHand}</td><td>{formatCurrency(i.quantityOnHand * i.unitCostCents)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
