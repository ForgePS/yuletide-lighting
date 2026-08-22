'use client';

import Link from 'next/link';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatPortalStatusLabel } from '@clcrm/types';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export function PortalMockupsPage() {
  return (
    <PortalAuthedFrame title="Design mockups" feature="mockups">
      {({ enabledFeatures }) => <MockupsBody />}
    </PortalAuthedFrame>
  );
}

function MockupsBody() {
  const { data: dash } = trpc.portal360.public.dashboard.useQuery(portalSessionInput);
  const { data, isLoading, isError } = trpc.portal360.public.mockups.useQuery(portalSessionInput);
  if (isLoading) return <LoadingState message="Loading designs..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load designs.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No design mockups yet.
      </p>
    );
  }

  const canApprove = Boolean(dash?.settings.permissions.approveDesigns);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((m) => {
        const imageSrc = m.renderedImageUrl ?? m.imageUrl;
        return (
          <div
            key={m.id}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="relative aspect-video bg-stone-100">
              {imageSrc ? (
                <Image src={imageSrc} alt={m.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  Preview unavailable
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium text-stone-900">{m.name}</p>
                {m.status && (
                  <p className="text-xs capitalize text-stone-500">{formatPortalStatusLabel(m.status)}</p>
                )}
              </div>
              {m.approvalToken && m.status === 'in_review' && canApprove && (
                <Link href={`/m/${m.approvalToken}`} className="btn-primary text-sm">
                  Review
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
