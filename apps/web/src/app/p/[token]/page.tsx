'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, labelProposalStatus, formatDate } from '@/lib/proposal-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function PublicProposalPage() {
  const token = useParams().token as string;
  const { data, isLoading, isError, refetch } = trpc.proposals360.public.getByToken.useQuery({
    token,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
  });
  const approve = trpc.proposals360.public.approve.useMutation({ onSuccess: () => refetch() });

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [signature, setSignature] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [mode, setMode] = useState<'view' | 'approve' | 'reject' | 'changes'>('view');

  if (isLoading) return <LoadingState message="Loading your proposal..." />;
  if (isError || !data?.proposal) return <ErrorState message="Proposal not found or link expired." />;

  const { proposal, customer, property, organization, packages, mockups } = data;
  const displayStatus = labelProposalStatus(proposal.status);
  const isClosed = ['approved', 'deposit_paid', 'scheduled', 'rejected', 'expired'].includes(proposal.status);

  async function submit(action: 'approved' | 'rejected' | 'changes_requested') {
    await approve.mutateAsync({
      token,
      action,
      customerName,
      signatureData: signature || undefined,
      packageId: selectedPackageId || undefined,
      agreementCode: selectedAgreement || undefined,
      notes: changeNotes || undefined,
    });
    setMode('view');
  }

  return (
    <div className="mesh-bg min-h-screen py-8 md:py-12">
      <div className="card mx-auto max-w-3xl p-6 shadow-soft md:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: organization?.brandColor ?? '#DC2626' }}>
            {organization?.companyName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Proposal for {customer?.businessName || `${customer?.firstName} ${customer?.lastName}`}
          </p>
          <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium">{displayStatus}</span>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">{proposal.title}</h2>
          <p className="text-sm text-muted-foreground">
            {property?.addressLine1}, {property?.city}, {property?.state}
          </p>
        </div>

        {(proposal.propertyPhotoUrl || mockups?.length > 0) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {proposal.propertyPhotoUrl && (
              <img src={proposal.propertyPhotoUrl} alt="Before" className="rounded-lg border object-cover" />
            )}
            {mockups?.[0] && (
              <img src={mockups[0].renderedImageUrl ?? mockups[0].imageUrl} alt="Design" className="rounded-lg border object-cover" />
            )}
          </div>
        )}

        {proposal.scopeOfWork && (
          <div className="mt-6">
            <h3 className="font-medium">Scope of work</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{proposal.scopeOfWork}</p>
          </div>
        )}

        {packages && packages.length > 0 ? (
          <div className="mt-8 space-y-3">
            <h3 className="font-medium">Choose your package</h3>
            {packages.map((pkg) => (
              <label
                key={pkg.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${selectedPackageId === pkg.id ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="package" value={pkg.id} checked={selectedPackageId === pkg.id} onChange={() => setSelectedPackageId(pkg.id)} />
                  <div>
                    <p className="font-medium">{pkg.label}</p>
                    {pkg.isRecommended && <span className="text-xs text-primary">Recommended</span>}
                  </div>
                </div>
                <span className="font-semibold">{formatCurrency(pkg.subtotalCents)}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex justify-between border-t pt-4 font-bold">
            <span>Total</span>
            <span>{formatCurrency(proposal.subtotalCents)}</span>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">Financing options</p>
          <p className="mt-1 text-muted-foreground">
            Pay in full: {formatCurrency(proposal.subtotalCents)} · Deposit ({proposal.depositPercent}%):{' '}
            {formatCurrency(proposal.depositAmountCents || Math.round(proposal.subtotalCents * proposal.depositPercent / 100))}
          </p>
          {(proposal.installDate || proposal.removalDate) && (
            <p className="mt-2 text-muted-foreground">
              {proposal.installDate && <>Install: {formatDate(proposal.installDate)}</>}
              {proposal.installDate && proposal.removalDate && ' · '}
              {proposal.removalDate && <>Removal: {formatDate(proposal.removalDate)}</>}
            </p>
          )}
        </div>

        {proposal.termsAndConditions && (
          <div className="mt-6 rounded-lg border border-border p-4 text-sm">
            <h3 className="font-medium">Terms & conditions</h3>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{proposal.termsAndConditions}</p>
          </div>
        )}

        {isClosed ? (
          <div className="mt-8 rounded-lg bg-emerald-50 p-4 text-center text-emerald-800">
            {proposal.status === 'approved' || proposal.status === 'deposit_paid' ? (
              <>Approved{proposal.acceptedAt ? ` on ${new Date(proposal.acceptedAt).toLocaleDateString()}` : ''} by {proposal.acceptedByName}</>
            ) : (
              <>This proposal is {displayStatus.toLowerCase()}.</>
            )}
            {proposal.contractUrl && (
              <p className="mt-2 text-sm"><a href={proposal.contractUrl} className="underline">View contract</a></p>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {mode === 'view' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary flex-1" onClick={() => setMode('approve')}>Approve</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setMode('changes')}>Request changes</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setMode('reject')}>Decline</button>
              </div>
            )}

            {(mode === 'approve' || mode === 'reject' || mode === 'changes') && (
              <form
                className="space-y-4 border-t pt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(mode === 'approve' ? 'approved' : mode === 'reject' ? 'rejected' : 'changes_requested');
                }}
              >
                <input required placeholder="Your full name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
                {mode === 'approve' && (
                  <>
                    {proposal.agreementOptions?.length > 0 && (
                      <select value={selectedAgreement} onChange={(e) => setSelectedAgreement(e.target.value)} className="input">
                        <option value="">Select agreement term...</option>
                        {proposal.agreementOptions.filter((o) => o.active).map((o) => (
                          <option key={o.code} value={o.code}>{o.label}</option>
                        ))}
                      </select>
                    )}
                    <input placeholder="Type your name as signature" value={signature} onChange={(e) => setSignature(e.target.value)} className="input" />
                    <p className="text-xs text-muted-foreground">By approving, you agree to scope of work and terms. IP and timestamp recorded.</p>
                  </>
                )}
                {mode === 'changes' && (
                  <textarea required placeholder="Describe requested changes..." value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} className="input min-h-[100px]" />
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setMode('view')}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={approve.isPending}>
                    {mode === 'approve' ? 'Sign & approve' : mode === 'reject' ? 'Decline proposal' : 'Submit request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">Viewed {proposal.viewCount} time(s)</p>
      </div>
    </div>
  );
}
