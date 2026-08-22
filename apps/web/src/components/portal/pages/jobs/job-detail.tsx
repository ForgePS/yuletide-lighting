'use client';

import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatScheduleLabel } from '@clcrm/types';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export function PortalJobDetailPage({ jobId }: { jobId: string }) {
  return (
    <PortalAuthedFrame
      title="Job details"
      feature="install_tracking"
      resourceType="job"
      resourceId={jobId}
    >
      {({ enabledFeatures }) => <JobDetailBody jobId={jobId} />}
    </PortalAuthedFrame>
  );
}

function JobDetailBody({ jobId }: { jobId: string }) {
  const { data, isLoading, isError } = trpc.portal360.public.jobDetail.useQuery({
    ...portalSessionInput,
    jobId,
  });
  if (isLoading) return <LoadingState message="Loading job..." />;
  if (isError || !data) return <p className="text-sm text-red-600">Could not load this job.</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</p>
        <h3 className="mt-1 text-xl font-bold text-stone-900">{data.title}</h3>
        <p className="mt-1 text-sm capitalize text-stone-600">{formatScheduleLabel(data.stage)}</p>
        {data.approvedPackageName && (
          <p className="mt-2 text-sm text-stone-600">Package: {data.approvedPackageName}</p>
        )}
      </section>

      {(data.scheduledStart || data.schedule) && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900">Schedule</h4>
          {data.schedule ? (
            <p className="mt-2 text-sm text-stone-700">
              {formatDate(data.schedule.startAt)}
              <span className="ml-2 capitalize text-stone-500">
                {formatScheduleLabel(data.schedule.dispatchStatus)}
              </span>
            </p>
          ) : data.scheduledStart ? (
            <p className="mt-2 text-sm text-stone-700">{formatDate(data.scheduledStart)}</p>
          ) : null}
        </section>
      )}

      {data.property && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900">Property</h4>
          <p className="mt-2 text-sm text-stone-700">{data.property.label}</p>
          <p className="text-sm text-stone-600">
            {data.property.addressLine1}
            <br />
            {[data.property.city, data.property.state, data.property.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
        </section>
      )}

      {data.scopeSummary && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900">Scope</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{data.scopeSummary}</p>
        </section>
      )}

      {data.accessNotes && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900">Access notes</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{data.accessNotes}</p>
        </section>
      )}

      {data.mockupPhotoUrls.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900">Photos</h4>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.mockupPhotoUrls.map((url) => (
              <div
                key={url}
                className="relative aspect-video overflow-hidden rounded-lg bg-stone-100"
              >
                <Image src={url} alt="Job photo" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
