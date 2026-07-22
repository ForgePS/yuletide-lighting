'use client';

import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { SignaturePad } from '@/components/ui/signature-pad';
import { isAgreementSignedStatus } from '@clcrm/types';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function PublicAgreementSignPage() {
  const token = useParams().token as string;
  const { data, isLoading, isError, refetch } = trpc.agreements360.public.getByToken.useQuery({ token });
  const sign = trpc.agreements360.public.sign.useMutation({ onSuccess: () => refetch() });

  const [signedByName, setSignedByName] = useState('');
  const [signature, setSignature] = useState('');

  if (isLoading) return <LoadingState message="Loading your agreement..." />;
  if (isError || !data?.agreement) return <ErrorState message="Agreement not found or link expired." />;

  const { agreement, organization } = data;
  const alreadySigned = isAgreementSignedStatus(agreement.status) || Boolean(agreement.signedAt);
  const canSign = agreement.status === 'awaiting_signature' || agreement.status === 'draft';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!signedByName.trim()) return;
    await sign.mutateAsync({
      token,
      signedByName: signedByName.trim(),
      signatureData: signature.trim() || signedByName.trim(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }

  return (
    <div className="mesh-bg min-h-screen py-8 md:py-12">
      <div className="card mx-auto max-w-3xl p-6 shadow-soft md:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: organization?.brandColor ?? '#DC2626' }}>
            {organization?.companyName ?? 'Agreement'}
          </h1>
          <p className="mt-2 text-muted-foreground">Service agreement for {agreement.customerName}</p>
          <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
            {agreement.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">{agreement.title}</h2>
          {agreement.propertyLabel && (
            <p className="text-sm text-muted-foreground">{agreement.propertyLabel}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {agreement.optionLabel} ({agreement.optionCode}) · Seasons {agreement.startSeason}
            {agreement.endSeason !== agreement.startSeason ? `–${agreement.endSeason}` : ''}
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between font-medium">
            <span>Annual value</span>
            <span>{formatCurrency(agreement.annualValueCents)}</span>
          </div>
          <div className="mt-2 flex justify-between text-muted-foreground">
            <span>Total contract value</span>
            <span>{formatCurrency(agreement.totalValueCents)}</span>
          </div>
          <p className="mt-2 text-muted-foreground">Deposit: {agreement.depositPercent}%</p>
        </div>

        {agreement.notes && (
          <div className="mt-6">
            <h3 className="font-medium">Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{agreement.notes}</p>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-border p-4 text-sm">
          <h3 className="font-medium">Terms & conditions</h3>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            By signing this agreement you authorize {organization?.companyName ?? 'the company'} to provide
            seasonal lighting services for the seasons listed above at the agreed annual value. Work will be
            scheduled according to weather and crew availability. Cancellations and renewals are subject to
            the company&apos;s standard policies. Terms version: {agreement.termsVersion}.
          </p>
        </div>

        {alreadySigned ? (
          <div className="mt-8 rounded-lg bg-emerald-50 p-4 text-center text-emerald-800">
            Signed{agreement.signedAt ? ` on ${new Date(agreement.signedAt).toLocaleDateString()}` : ''}
            {agreement.signedByName ? ` by ${agreement.signedByName}` : ''}.
          </div>
        ) : canSign ? (
          <form className="mt-8 space-y-4 border-t pt-6" onSubmit={submit}>
            <input
              required
              placeholder="Your full name *"
              value={signedByName}
              onChange={(e) => setSignedByName(e.target.value)}
              className="input"
            />
            <SignaturePad value={signature} onChange={setSignature} />
            <p className="text-xs text-muted-foreground">
              By signing, you agree to the terms above. Your name, drawn signature, IP, and timestamp will be recorded.
            </p>
            <button type="submit" className="btn-primary w-full" disabled={sign.isPending}>
              {sign.isPending ? 'Signing…' : 'Sign agreement'}
            </button>
            {sign.isError && (
              <p className="text-sm text-red-600">{sign.error.message ?? 'Could not sign agreement.'}</p>
            )}
          </form>
        ) : (
          <div className="mt-8 rounded-lg bg-muted/50 p-4 text-center text-muted-foreground">
            This agreement is not available for signature.
          </div>
        )}
      </div>
    </div>
  );
}
