'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatCurrency } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';
import { PortalAuthedFrame, PortalFeatureFallback } from '@/components/portal/portal-shell';

const MONTHS = ['August', 'September', 'October', 'November', 'Flexible'];

export function PortalRebookPage() {
  return (
    <PortalAuthedFrame title="Rebook next season" feature="rebooking">
      {({ enabledFeatures }) => <RebookBody />}
    </PortalAuthedFrame>
  );
}

function RebookBody() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: info, isLoading } = trpc.portal360.public.rebookInfo.useQuery(portalSessionInput);
  const submit = trpc.portal360.public.submitRebook.useMutation({
    onSuccess: (r) => {
      toast(
        r.newProposalId
          ? 'Rebooked — your proposal is being prepared!'
          : 'Rebook request submitted!',
        'success',
      );
      router.push(portalAppPath());
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [preferredMonth, setPreferredMonth] = useState('Flexible');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingState message="Loading..." />;

  if (!info) {
    return (
      <PortalFeatureFallback
        title="Rebooking unavailable"
        message="This feature is not enabled for your portal, or your access link is invalid."
      />
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-stone-600">
        {info.hasPreviousSeason
          ? `Rebook "${info.previousProposalTitle}" with one click — same great display for next year.`
          : "Let us know you'd like lighting again this season."}
      </p>
      {info.projectedValueCents ? (
        <p className="text-sm">Last season: {formatCurrency(info.projectedValueCents)}</p>
      ) : null}

      <div className="space-y-3">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={submit.isPending}
          onClick={() =>
            submit.mutate({
              ...portalSessionInput,
              sameDesign: true,
              preferredMonth,
              notes: notes || undefined,
            })
          }
        >
          {submit.isPending ? 'Processing…' : 'Rebook same design'}
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={submit.isPending}
          onClick={() =>
            submit.mutate({
              ...portalSessionInput,
              upgradeRequested: true,
              preferredMonth,
              notes: notes || undefined,
            })
          }
        >
          Request upgrade
        </button>
      </div>

      <form
        className="space-y-4 border-t border-stone-100 pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({ ...portalSessionInput, preferredMonth, notes: notes || undefined });
        }}
      >
        <label className="block text-sm">
          <span className="font-medium">Preferred install month</span>
          <select
            className="input mt-1 w-full"
            value={preferredMonth}
            onChange={(e) => setPreferredMonth(e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Notes (optional)</span>
          <textarea
            className="input mt-1 min-h-[80px] w-full"
            placeholder="Any changes from last year?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </form>
      <Link
        href={portalAppPath()}
        className="block text-center text-sm text-primary hover:underline"
      >
        ← Back to portal
      </Link>
    </div>
  );
}
