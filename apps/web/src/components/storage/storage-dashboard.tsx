'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@clcrm/ui';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { StoragePullSheetView } from './storage-pull-sheet';

const STATUS_COLORS: Record<string, string> = {
  stored: 'bg-green-100 text-green-800',
  pulled: 'bg-blue-100 text-blue-800',
  discarded: 'bg-red-100 text-red-800',
  returned: 'bg-muted text-muted-foreground',
};

export function StorageStatsCards() {
  const { data, isLoading } = trpc.storage360.dashboard.useQuery();
  if (isLoading || !data) return <LoadingState message="Loading storage stats..." />;

  const cards = [
    { label: 'Total records', value: String(data.totalRecords) },
    { label: 'In storage', value: String(data.stored) },
    { label: 'Pulled', value: String(data.pulled) },
    { label: 'Awaiting bin', value: String(data.awaitingBin) },
    { label: 'Storage fees', value: formatCurrency(data.totalStorageFeesCents) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function StorageRecordsTable({ customerId }: { customerId?: string }) {
  const { toast } = useToast();
  const { data, isLoading } = trpc.storage360.records.list.useQuery({ customerId });
  const [showPullSheet, setShowPullSheet] = useState(false);

  if (isLoading) return <LoadingState message="Loading storage records..." />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No storage records"
        description={customerId ? 'Create a storage record after takedown or add one manually.' : 'Storage records appear when takedown jobs are completed.'}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{data.length} record{data.length === 1 ? '' : 's'}</p>
        <button type="button" className="btn-secondary text-sm" onClick={() => setShowPullSheet(true)}>
          Generate pull sheet
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Bin</th>
              <th>Location</th>
              <th>Items</th>
              <th>Status</th>
              <th>Stored</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/app/customers/${row.customerId}`} className="font-medium hover:text-primary hover:underline">
                    {row.customerName}
                  </Link>
                  {row.propertyAddress && <p className="text-xs text-muted-foreground">{row.propertyAddress}</p>}
                </td>
                <td className="font-mono text-sm">{row.binNumber || '—'}</td>
                <td className="text-muted-foreground">
                  {[row.locationId, row.rack, row.shelf].filter(Boolean).join(' / ') || '—'}
                </td>
                <td>{row.itemCount}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[row.status] ?? ''}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-muted-foreground">{row.storedAt.toLocaleDateString()}</td>
                <td>
                  <Link href={`/app/storage/${row.id}`} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPullSheet && (
        <StoragePullSheetModal
          customerId={customerId}
          onClose={() => setShowPullSheet(false)}
          onError={(msg) => toast(msg, 'error')}
        />
      )}
    </>
  );
}

function StoragePullSheetModal({
  customerId,
  onClose,
  onError,
}: {
  customerId?: string;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const { data, isLoading } = trpc.storage360.pullSheet.useQuery({ customerId });

  function handlePrint() {
    window.print();
  }

  if (isLoading) return null;
  if (!data?.lines.length) {
    onError('No stored items match this pull sheet filter.');
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:relative print:inset-auto print:bg-transparent print:p-0">
      <div className="card w-full max-w-3xl p-6 print:max-w-none print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-semibold">Storage pull sheet</h3>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={handlePrint}>Print</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
        <StoragePullSheetView sheet={data} />
      </div>
    </div>
  );
}

export function StorageDashboard() {
  return (
    <div className="space-y-6">
      <StorageStatsCards />
      <StorageRecordsTable />
    </div>
  );
}
