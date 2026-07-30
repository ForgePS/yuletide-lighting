'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export default function PortalTakedownsPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Takedowns" feature="takedowns">
      {({ token: accessToken }) => <TakedownsBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function TakedownsBody({ token }: { token: string }) {
  const { data, isLoading, isError } = trpc.portal360.public.takedowns.useQuery({ token });
  if (isLoading) return <LoadingState message="Loading takedowns..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load takedowns.</p>;
  if (!data?.length) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">No takedown appointments on file yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((t) => (
        <li key={`${t.source}-${t.id}`} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-stone-900">{t.title}</p>
              <p className="mt-1 text-sm capitalize text-stone-500">{String(t.status).replace(/_/g, ' ')}</p>
              {t.propertyAddress && (
                <p className="mt-1 text-xs text-stone-400">{t.propertyAddress}</p>
              )}
            </div>
            {t.scheduledStart && (
              <p className="text-sm text-stone-700">{formatDate(t.scheduledStart)}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
