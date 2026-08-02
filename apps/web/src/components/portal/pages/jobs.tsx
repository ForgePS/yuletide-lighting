'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalResponsiveTable, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export function PortalJobsPage() {
  return (
    <PortalAuthedFrame title="Installation" feature="install_tracking">
      {({ enabledFeatures }) => <JobsBody />}
    </PortalAuthedFrame>
  );
}

function JobsBody() {
  const { data, isLoading, isError } = trpc.portal360.public.jobs.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading jobs..." />;
  if (isError) return <p className="text-base text-red-600">Could not load jobs.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        No jobs on file yet.
      </p>
    );
  }

  return (
    <PortalResponsiveTable
      rows={data}
      columns={[
        {
          key: 'title',
          header: 'Job',
          cell: (job) => <span className="font-semibold">{job.title}</span>,
        },
        {
          key: 'stage',
          header: 'Status',
          cell: (job) => (
            <PortalStatusPill tone="info">{job.stage.replace(/_/g, ' ')}</PortalStatusPill>
          ),
        },
        {
          key: 'when',
          header: 'Scheduled',
          cell: (job) => (job.scheduledStart ? formatDate(job.scheduledStart) : '—'),
        },
        {
          key: 'action',
          header: '',
          className: 'text-right',
          cell: (job) => (
            <Link href={portalAppPath('jobs', job.id)} className="btn-secondary text-sm">
              Details
            </Link>
          ),
        },
      ]}
      mobileCard={(job) => (
        <Link
          href={portalAppPath('jobs', job.id)}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="font-semibold text-stone-900">{job.title}</p>
            <p className="mt-1 text-base capitalize text-stone-500">
              {job.stage.replace(/_/g, ' ')}
            </p>
          </div>
          {job.scheduledStart && (
            <p className="text-base text-stone-700">{formatDate(job.scheduledStart)}</p>
          )}
        </Link>
      )}
    />
  );
}
