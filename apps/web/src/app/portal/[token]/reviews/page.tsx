'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';
import { useToast } from '@/lib/toast';

export default function PortalReviewsPage() {
  const token = useParams().token as string;
  return (
    <PortalAuthedFrame token={token} title="Reviews & referrals" feature="reviews">
      {({ token: accessToken, enabledFeatures }) => (
        <ReviewsBody token={accessToken} showReferrals={enabledFeatures.includes('referrals')} />
      )}
    </PortalAuthedFrame>
  );
}

function ReviewsBody({ token, showReferrals }: { token: string; showReferrals: boolean }) {
  const { toast } = useToast();
  const { data: reviews, isLoading } = trpc.portal360.public.reviews.useQuery({ token });
  const { data: referrals } = trpc.portal360.public.referrals.useQuery({ token }, { enabled: showReferrals });

  if (isLoading) return <LoadingState message="Loading..." />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900">Your reviews</h3>
        {!reviews?.length ? (
          <p className="mt-3 text-sm text-stone-600">No review requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 last:border-0">
                <div>
                  <p className="text-sm capitalize text-stone-700">{r.status.replace(/_/g, ' ')}</p>
                  {r.rating != null && <p className="text-sm font-medium">{r.rating} / 5</p>}
                  {r.submittedAt && <p className="text-xs text-stone-400">{formatDate(r.submittedAt)}</p>}
                </div>
                {r.publicToken && ['sent', 'clicked', 'pending'].includes(r.status) && (
                  <Link href={`/review/${r.publicToken}`} className="btn-primary text-sm">Leave review</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showReferrals && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">Referral code</h3>
          {!referrals?.length ? (
            <p className="mt-3 text-sm text-stone-600">No referral code yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {referrals.map((ref) => (
                <li key={ref.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-lg font-bold tracking-wide text-stone-900">{ref.code}</p>
                    <p className="text-sm text-stone-500 capitalize">{ref.status}
                      {ref.rewardAmountCents ? ` · ${formatCurrency(ref.rewardAmountCents)} reward` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(ref.code);
                      toast('Code copied', 'success');
                    }}
                  >
                    Copy code
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
