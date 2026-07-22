'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate, labelProposalStatus } from '@/lib/proposal-utils';
import { LoadingState, ErrorState } from '@/components/ui/states';

function SignedReceiptInner() {
  const token = useParams().token as string;
  const search = useSearchParams();
  const signed = search.get('signed') === '1';
  const { data, isLoading, isError } = trpc.proposals360.public.getByToken.useQuery({ token });

  if (isLoading) return <LoadingState message="Loading signed record..." />;
  if (isError || !data?.proposal) return <ErrorState message="Signed proposal not found." />;

  const { proposal, customer, property, organization, packages } = data;
  const pkg = packages?.find((p) => p.id === proposal.selectedPackageId) ?? packages?.[0];
  const snapshot = (() => {
    try {
      return proposal.signedSnapshotJson ? JSON.parse(proposal.signedSnapshotJson) : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Acceptance record</h1>
          <p className="text-sm text-muted-foreground">Print or save as PDF from your browser.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <header className="border-b border-border pb-4">
        <p className="text-2xl font-bold" style={{ color: organization?.brandColor ?? '#DC2626' }}>
          {organization?.companyName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Proposal acceptance certificate</p>
      </header>

      <section className="mt-6 space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Proposal:</span> {proposal.title}
        </p>
        <p>
          <span className="text-muted-foreground">Status:</span> {labelProposalStatus(proposal.status)}
        </p>
        <p>
          <span className="text-muted-foreground">Customer:</span>{' '}
          {customer?.businessName || `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim()}
        </p>
        {property && (
          <p>
            <span className="text-muted-foreground">Property:</span> {property.addressLine1}, {property.city},{' '}
            {property.state}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Amount:</span> {formatCurrency(proposal.subtotalCents)}
        </p>
        {pkg && (
          <p>
            <span className="text-muted-foreground">Package:</span> {pkg.label || pkg.name}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border p-4 text-sm">
        <h2 className="font-semibold">Audit trail</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Accepted by</dt>
            <dd>{proposal.acceptedByName ?? snapshot?.acceptedByName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Accepted at</dt>
            <dd>{proposal.acceptedAt ? formatDate(proposal.acceptedAt) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Signer IP</dt>
            <dd>{proposal.signerIp ?? snapshot?.signerIp ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Terms version</dt>
            <dd>{proposal.termsVersion ?? snapshot?.termsVersion ?? '—'}</dd>
          </div>
        </dl>
      </section>

      {signed && (
        <p className="mt-6 text-xs text-muted-foreground">
          This page is the official signed snapshot link for the acceptance event. Use Print to archive a PDF copy.
        </p>
      )}
    </div>
  );
}

export default function SignedProposalReceiptPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading..." />}>
      <SignedReceiptInner />
    </Suspense>
  );
}
