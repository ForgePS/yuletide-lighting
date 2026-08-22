'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatScheduleLabel } from '@clcrm/types';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalSection, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export function PortalSchedulePage() {
  return (
    <PortalAuthedFrame title="Schedule" feature="scheduling">
      {({ enabledFeatures }) => (
        <ScheduleBody canRequest={enabledFeatures.includes('scheduling')} />
      )}
    </PortalAuthedFrame>
  );
}

function ScheduleBody({ canRequest }: { canRequest: boolean }) {
  const { data, isLoading } = trpc.portal360.public.dashboard.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading schedule..." />;

  const upcoming = data?.schedule ?? [];
  const allowSelf = Boolean(data?.settings.allowSelfScheduling);

  return (
    <div className="space-y-4">
      {allowSelf && canRequest && (
        <Link
          href={portalAppPath('schedule-request')}
          className="btn-primary inline-flex min-h-11 w-full items-center justify-center text-base"
        >
          Request an appointment
        </Link>
      )}

      <PortalSection
        eyebrow="Upcoming"
        title={`${upcoming.length} appointment${upcoming.length === 1 ? '' : 's'}`}
      >
        {!upcoming.length ? (
          <p className="text-base text-stone-600">No upcoming appointments on the calendar yet.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((item) => (
              <li key={item.id} className="rounded-xl border border-stone-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PortalStatusPill tone="info">
                    {formatScheduleLabel(item.appointmentType)}
                  </PortalStatusPill>
                </div>
                <p className="mt-2 text-lg font-semibold text-stone-900">{item.title}</p>
                <p className="mt-1 text-base text-stone-600">{formatDate(item.startAt)}</p>
                {item.propertyAddress && (
                  <p className="mt-1 text-sm text-stone-500">{item.propertyAddress}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </PortalSection>
    </div>
  );
}
