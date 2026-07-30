'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { labelProposalStatus } from '@/lib/proposal-utils';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { PortalStickyBar, PortalStatusPill } from '@/components/portal/portal-mobile';
import { LoadingState } from '@/components/ui/states';

export default function PortalProposalsPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Proposals" feature="proposals" stickyPad>
      {({ token: accessToken }) => <ProposalsBody token={accessToken} />}
    </PortalAuthedFrame>
  );
}

function ProposalsBody({ token }: { token: string }) {
  const { data: dash } = trpc.portal360.public.dashboard.useQuery({ token });
  const { data, isLoading, isError } = trpc.portal360.public.proposals.useQuery({ token });
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading proposals..." />;
  if (isError) return <p className="text-base text-red-600">Could not load proposals.</p>;
  if (!data?.length) {
    return <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">No proposals yet.</p>;
  }

  const canApprove = Boolean(dash?.settings.permissions.approveDesigns);
  const eSign = (dash?.enabledFeatures ?? []).includes('e_sign');
  const primary = data.find(
    (p) => p.publicToken && canApprove && !['approved', 'deposit_paid', 'scheduled', 'declined', 'expired'].includes(p.status),
  ) ?? data.find((p) => p.publicToken && canApprove);

  return (
    <>
      <ul className="space-y-3">
        {data.map((p) => {
          const open = openId === p.id;
          return (
            <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setOpenId(open ? null : p.id)}
                aria-expanded={open}
              >
                <div>
                  <p className="text-lg font-semibold text-stone-900">{p.title}</p>
                  <p className="mt-1 text-base text-stone-600">{formatCurrency(p.subtotalCents)}</p>
                </div>
                <PortalStatusPill>{labelProposalStatus(p.status)}</PortalStatusPill>
              </button>
              {open && (
                <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-base text-stone-600">
                  {p.installDate && <p>Install {formatDate(p.installDate)}</p>}
                  <p>Tap Review to see scope, deposit, designs, and terms on a phone-friendly page.</p>
                  {p.publicToken && canApprove && (
                    <Link href={`/p/${p.publicToken}`} className="btn-primary mt-2 inline-flex min-h-11 w-full items-center justify-center text-base">
                      {['approved', 'deposit_paid', 'scheduled'].includes(p.status)
                        ? 'View proposal'
                        : eSign
                          ? 'Review & approve'
                          : 'View proposal'}
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {primary?.publicToken && (
        <PortalStickyBar>
          <Link href={`/portal/${token}/messages`} className="btn-secondary inline-flex min-h-11 flex-1 items-center justify-center text-base">
            Request changes
          </Link>
          <Link href={`/p/${primary.publicToken}`} className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center text-base">
            {['approved', 'deposit_paid', 'scheduled'].includes(primary.status) ? 'View proposal' : 'Accept proposal'}
          </Link>
        </PortalStickyBar>
      )}
    </>
  );
}
