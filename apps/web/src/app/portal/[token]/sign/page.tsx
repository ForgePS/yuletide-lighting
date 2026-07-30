'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalStickyBar, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export default function PortalSignPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Needs your signature" feature="e_sign" stickyPad>
      {({ token: accessToken }) => <SigningBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function SigningBody({ token }: { token: string }) {
  const { data, isLoading, isError } = trpc.portal360.public.signingHub.useQuery({ token });
  if (isLoading) return <LoadingState message="Loading items to sign..." />;
  if (isError) return <p className="text-base text-red-600">Could not load signing items.</p>;
  if (!data?.items.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">
        Nothing needs your signature right now.
      </p>
    );
  }

  const primary = data.items.find((i) => i.href) ?? data.items[0];

  return (
    <>
      <ul className="space-y-3">
        {data.items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{item.kind.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{item.title}</p>
            <div className="mt-2">
              <PortalStatusPill>{item.status.replace(/_/g, ' ')}</PortalStatusPill>
            </div>
            {item.detail && <p className="mt-2 text-base text-stone-500">{item.detail}</p>}
            {item.href ? (
              <Link href={item.href} className="btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center text-base">
                {item.kind === 'mockup' ? 'Review design' : item.kind === 'proposal' ? 'Review & approve' : 'Review & sign'}
              </Link>
            ) : (
              <p className="mt-3 text-sm text-stone-500">View-only — contact your lighting company to approve.</p>
            )}
          </li>
        ))}
      </ul>
      {primary?.href && (
        <PortalStickyBar>
          <Link href={primary.href} className="btn-primary inline-flex min-h-11 w-full items-center justify-center text-base">
            Continue signing
          </Link>
        </PortalStickyBar>
      )}
    </>
  );
}
