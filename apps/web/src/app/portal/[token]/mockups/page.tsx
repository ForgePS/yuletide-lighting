'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

export default function PortalMockupsPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Design mockups" feature="mockups">
      {({ token: accessToken }) => <MockupsBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function MockupsBody({ token }: { token: string }) {
  const { data: dash } = trpc.portal360.public.dashboard.useQuery({ token });
  const { data, isLoading, isError } = trpc.portal360.public.mockups.useQuery({ token });
  if (isLoading) return <LoadingState message="Loading designs..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load designs.</p>;
  if (!data?.length) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">No design mockups yet.</p>;
  }

  const canApprove = Boolean(dash?.settings.permissions.approveDesigns);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((m) => (
        <div key={m.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="relative aspect-video bg-stone-100">
            <Image src={m.renderedImageUrl ?? m.imageUrl} alt={m.name} fill className="object-cover" unoptimized />
          </div>
          <div className="flex items-center justify-between gap-2 p-4">
            <div>
              <p className="text-sm font-medium text-stone-900">{m.name}</p>
              {m.status && (
                <p className="text-xs capitalize text-stone-500">{m.status.replace(/_/g, ' ')}</p>
              )}
            </div>
            {m.approvalToken && m.status === 'in_review' && canApprove && (
              <Link href={`/m/${m.approvalToken}`} className="btn-primary text-sm">Review</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
