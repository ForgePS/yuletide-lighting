'use client';

import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export function PortalConsultationsPage() {
  return (
    <PortalAuthedFrame title="Consultations" feature="consultations">
      {({ enabledFeatures }) => <ConsultationsBody />}
    </PortalAuthedFrame>
  );
}

function ConsultationsBody() {
  const { data, isLoading, isError } =
    trpc.portal360.public.consultations.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading consultations..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load consultations.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No consultations scheduled yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold capitalize text-stone-900">
                {c.consultationType.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-sm capitalize text-stone-500">
                {c.status.replace(/_/g, ' ')}
              </p>
            </div>
            {c.scheduledAt && <p className="text-sm text-stone-700">{formatDate(c.scheduledAt)}</p>}
          </div>
          {c.customerGoals && (
            <p className="mt-3 text-sm text-stone-600">
              <span className="font-medium text-stone-800">Goals: </span>
              {c.customerGoals}
            </p>
          )}
          {(c.preferredColors || c.preferredLightStyle) && (
            <p className="mt-1 text-sm text-stone-600">
              {[c.preferredColors, c.preferredLightStyle].filter(Boolean).join(' · ')}
            </p>
          )}
          {c.completedAt && (
            <p className="mt-2 text-xs text-stone-400">Completed {formatDate(c.completedAt)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
