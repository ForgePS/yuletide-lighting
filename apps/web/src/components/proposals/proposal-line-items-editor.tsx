'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ProposalLineItem } from '@clcrm/types';
import { formatCurrency } from '@clcrm/ui';

type LineItemRow = {
  id: string;
  description: string;
  quantity: number;
  unitPriceDollars: string;
};

function toRows(items: ProposalLineItem[]): LineItemRow[] {
  if (!items.length) {
    return [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPriceDollars: '' }];
  }
  return items.map((li) => ({
    id: li.id,
    description: li.description,
    quantity: li.quantity,
    unitPriceDollars: (li.unitPriceCents / 100).toFixed(2),
  }));
}

function toLineItems(rows: LineItemRow[]): ProposalLineItem[] {
  return rows
    .filter((r) => r.description.trim())
    .map((r) => ({
      id: r.id,
      description: r.description.trim(),
      quantity: r.quantity,
      unitPriceCents: Math.round(parseFloat(r.unitPriceDollars || '0') * 100),
    }));
}

export function ProposalLineItemsEditor({
  value,
  onChange,
}: {
  value: ProposalLineItem[];
  onChange: (items: ProposalLineItem[]) => void;
}) {
  const rows = toRows(value);
  const totalCents = toLineItems(rows).reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);

  function updateRow(id: string, patch: Partial<LineItemRow>) {
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    onChange(toLineItems(next));
  }

  function addRow() {
    onChange(toLineItems([...rows, { id: crypto.randomUUID(), description: '', quantity: 1, unitPriceDollars: '' }]));
  }

  function removeRow(id: string) {
    onChange(toLineItems(rows.filter((r) => r.id !== id)));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_auto]">
          <input
            className="input"
            placeholder="Description"
            value={row.description}
            onChange={(e) => updateRow(row.id, { description: e.target.value })}
          />
          <input
            type="number"
            min={1}
            className="input"
            value={row.quantity}
            onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) || 1 })}
          />
          <input
            type="number"
            min={0}
            step={0.01}
            className="input"
            placeholder="$0.00"
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
