'use client';

import type { StoragePullSheet } from '@clcrm/types';

export function StoragePullSheetView({ sheet }: { sheet: StoragePullSheet }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold">Storage pull sheet</h2>
        <p className="text-sm text-muted-foreground">
          Generated {sheet.generatedAt.toLocaleString()}
          {sheet.filters.customerId && ' · Filtered by customer'}
          {sheet.filters.jobId && ' · Filtered by job'}
          {sheet.filters.date && ` · Date: ${sheet.filters.date}`}
        </p>
      </div>
      {sheet.lines.map((line) => (
        <div key={line.storageRecordId} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{line.customerName}</p>
              {line.propertyAddress && <p className="text-sm text-muted-foreground">{line.propertyAddress}</p>}
            </div>
            <div className="text-right text-sm">
              <p><span className="text-muted-foreground">Bin:</span> <span className="font-mono font-medium">{line.binNumber}</span></p>
              <p className="text-muted-foreground">
                {[line.locationId, line.rack, line.shelf].filter(Boolean).join(' / ')}
              </p>
            </div>
          </div>
          {line.items.length ? (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1">Item</th>
                  <th className="pb-1">Qty</th>
                  <th className="pb-1">Condition</th>
                </tr>
              </thead>
              <tbody>
                {line.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-dashed">
                    <td className="py-1">{item.name}</td>
                    <td className="py-1">{item.quantity}</td>
                    <td className="py-1 capitalize">{item.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No line items recorded.</p>
          )}
        </div>
      ))}
    </div>
  );
}
