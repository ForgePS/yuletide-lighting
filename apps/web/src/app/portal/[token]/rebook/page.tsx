'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';

const MONTHS = ['August', 'September', 'October', 'November', 'Flexible'];

export default function PortalRebookPage() {
  const token = useParams().token as string;
  const router = useRouter();
  const { toast } = useToast();
  const { data: info, isLoading } = trpc.portal360.public.rebookInfo.useQuery({ token });
  const submit = trpc.portal360.public.submitRebook.useMutation({
    onSuccess: (r) => {
      toast(r.newProposalId ? 'Rebooked — your proposal is being prepared!' : 'Rebook request submitted!', 'success');
      router.push(`/portal/${token}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [preferredMonth, setPreferredMonth] = useState('Flexible');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingState message="Loading..." />;

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Rebooking unavailable</h1>
          <p className="mt-2 text-sm text-stone-600">This feature is not enabled for your portal, or your access link is invalid.</p>
          <Link href={`/portal/${token}`} className="mt-4 inline-block text-sm text-primary hover:underline">← Back to portal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-red-50/40 py-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <Link href={`/portal/${token}`} className="text-sm text-primary hover:underline">← Back to portal</Link>
        <h1 className="mt-4 text-xl font-bold text-stone-900">Rebook next season</h1>
        <p className="mt-1 text-sm text-stone-600">
          {info.hasPreviousSeason
            ? `Rebook "${info.previousProposalTitle}" with one click — same great display for next year.`
            : 'Let us know you\'d like lighting again this season.'}
        </p>
        {info.projectedValueCents ? (
          <p className="mt-2 text-sm">Last season: {formatCurrency(info.projectedValueCents)}</p>
        ) : null}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={submit.isPending}
            onClick={() => submit.mutate({ token, sameDesign: true, preferredMonth, notes: notes || undefined })}
          >
            {submit.isPending ? 'Processing…' : 'Rebook same design'}
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            disabled={submit.isPending}
            onClick={() => submit.mutate({ token, upgradeRequested: true, preferredMonth, notes: notes || undefined })}
          >
            Request upgrade
          </button>
        </div>

        <form
          className="mt-6 space-y-4 border-t border-stone-100 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({ token, preferredMonth, notes: notes || undefined });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Preferred install month</span>
            <select className="input mt-1 w-full" value={preferredMonth} onChange={(e) => setPreferredMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Notes (optional)</span>
            <textarea className="input mt-1 min-h-[80px] w-full" placeholder="Any changes from last year?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </form>
      </div>
    </div>
  );
}
