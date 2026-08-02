'use client';

import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export function PortalStoragePage() {
  return (
    <PortalAuthedFrame title="Customer storage" feature="storage">
      {({ enabledFeatures }) => <StorageBody />}
    </PortalAuthedFrame>
  );
}

function StorageBody() {
  const { data, isLoading, isError } = trpc.portal360.public.storage.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading storage..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load storage records.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No storage records on file.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {data.map((rec) => (
        <li key={rec.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold capitalize text-stone-900">
                {String(rec.status).replace(/_/g, ' ')} ·{' '}
                {String(rec.storageType).replace(/_/g, ' ')}
              </p>
              {rec.propertyAddress && (
                <p className="text-sm text-stone-500">{rec.propertyAddress}</p>
              )}
              <p className="mt-1 text-xs text-stone-400">
                Stored {formatDate(rec.storedAt)}
                {rec.pulledAt ? ` · Pulled ${formatDate(rec.pulledAt)}` : ''}
              </p>
            </div>
            <p className="text-sm text-stone-600">{rec.itemCount} items</p>
          </div>
          {rec.conditionNotes && (
            <p className="mt-3 text-sm text-stone-600">{rec.conditionNotes}</p>
          )}
          {rec.items.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
              {rec.items.map((item, idx) => (
                <li key={`${rec.id}-${idx}`} className="flex justify-between gap-2 text-stone-700">
                  <span>{item.name}</span>
                  <span className="text-stone-500">
                    ×{item.quantity} · {item.condition}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
