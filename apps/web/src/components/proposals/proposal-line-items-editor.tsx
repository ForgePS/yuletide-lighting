'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProposalLineItem } from '@clcrm/types';
import { formatCurrency } from '@/lib/proposal-utils';

type LineItemRow = {
  id: string;
  description: string;
  quantity: string;
  unitPriceDollars: string;
};

function serializeItems(items: ProposalLineItem[]): string {
  return JSON.stringify(
    items.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
    })),
  );
}

function toRows(items: ProposalLineItem[]): LineItemRow[] {
  if (!items.length) {
    return [{ id: crypto.randomUUID(), description: '', quantity: '1', unitPriceDollars: '' }];
  }
  return items.map((li) => ({
    id: li.id,
    description: li.description,
    quantity: String(li.quantity),
    unitPriceDollars: li.unitPriceCents === 0 ? '' : (li.unitPriceCents / 100).toFixed(2),
  }));
}

function toLineItems(rows: LineItemRow[]): ProposalLineItem[] {
  return rows
    .filter((r) => r.description.trim())
    .map((r) => ({
      id: r.id,
      description: r.description.trim(),
      quantity: Math.max(0.01, Number(r.quantity) || 1),
      unitPriceCents: Math.round(parseFloat(r.unitPriceDollars || '0') * 100) || 0,
    }));
}

export function ProposalLineItemsEditor({
  value,
  onChange,
}: {
  value: ProposalLineItem[];
  onChange: (items: ProposalLineItem[]) => void;
}) {
  const [rows, setRows] = useState<LineItemRow[]>(() => toRows(value));
  const lastEmitted = useRef(serializeItems(value));

  useEffect(() => {
    const next = serializeItems(value);
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    setRows(toRows(value));
  }, [value]);

  function commit(next: LineItemRow[]) {
    setRows(next);
    const items = toLineItems(next);
    lastEmitted.current = serializeItems(items);
    onChange(items);
  }

  function updateRow(id: string, patch: Partial<LineItemRow>) {
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    commit([...rows, { id: crypto.randomUUID(), description: '', quantity: '1', unitPriceDollars: '' }]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    commit(next.length ? next : [{ id: crypto.randomUUID(), description: '', quantity: '1', unitPriceDollars: '' }]);
  }

  const totalCents = toLineItems(rows).reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);

  return (
    <div className="space-y-3">
      <div className="hidden text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_80px_100px_auto] sm:gap-2">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span />
      </div>
      {rows.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_auto]">
          <input
            className="input"
            placeholder="Description"
            value={row.description}
            onChange={(e) => updateRow(row.id, { description: e.target.value })}
          />
          <input
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="Qty"
            value={row.quantity}
            onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
          />
          <input
            type="text"
            inputMode="decimal"
            className="input"
            placeholder="0.00"
            value={row.unitPriceDollars}
            onChange={(e) => updateRow(row.id, { unitPriceDollars: e.target.value })}
          />
          <button type="button" className="btn-ghost p-2 text-red-600" onClick={() => removeRow(row.id)} aria-label="Remove line">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" className="btn-secondary text-sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add line item
        </button>
        <p className="text-sm font-medium">Line items total: {formatCurrency(totalCents)}</p>
      </div>
    </div>
  );
}
