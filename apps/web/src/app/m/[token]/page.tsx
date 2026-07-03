'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function PublicMockupApprovalPage() {
  const token = useParams().token as string;
  const { data, isLoading, isError, refetch } = trpc.mockups360.public.getByToken.useQuery({ token });
  const approve = trpc.mockups360.public.approve.useMutation({ onSuccess: () => refetch() });

  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'view' | 'approve' | 'revision'>('view');

  if (isLoading) return <LoadingState message="Loading design..." />;
  if (isError || !data?.mockup) return <ErrorState message="Design not found or link expired." />;

  const { mockup, organization, property, customer } = data;
  const brandColor = organization?.brandColor ?? '#DC2626';
  const customerLabel = customer?.businessName || `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim();
  const isClosed = ['approved', 'archived'].includes(mockup.status);

  async function submit(action: 'approved' | 'revision_requested') {
    await approve.mutateAsync({ token, action, customerName: customerName || undefined, notes: notes || undefined });
    setMode('view');
  }

  return (
    <div className="mesh-bg min-h-screen py-8 md:py-12">
      <div className="card mx-auto max-w-3xl p-6 shadow-soft md:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: brandColor }}>{organization?.companyName}</h1>
          <p className="mt-2 text-muted-foreground">Design review for {customerLabel}</p>
          <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{mockup.status.replace(/_/g, ' ')}</span>
        </div>

        <h2 className="mt-8 text-xl font-semibold">{mockup.name}</h2>
        {property && (
          <p className="text-sm text-muted-foreground">{property.addressLine1}, {property.city}, {property.state}</p>
        )}

        <div className="relative mt-6 aspect-video overflow-hidden rounded-lg border bg-muted">
          <Image src={mockup.renderedImageUrl ?? mockup.imageUrl} alt={mockup.name} fill className="object-cover" unoptimized />
        </div>

        {mockup.revisionNotes && mockup.status === 'revision_requested' && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your revision notes: {mockup.revisionNotes}</p>
        )}

        {!isClosed && mode === 'view' && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary" onClick={() => setMode('approve')}>Approve design</button>
            <button type="button" className="btn-secondary" onClick={() => setMode('revision')}>Request changes</button>
          </div>
        )}

        {(mode === 'approve' || mode === 'revision') && !isClosed && (
          <div className="mt-8 space-y-4">
            <input className="input w-full" placeholder="Your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            {mode === 'revision' && (
              <textarea className="input min-h-[100px] w-full" placeholder="What would you like changed?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setMode('view')}>Cancel</button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={approve.isPending}
                onClick={() => submit(mode === 'approve' ? 'approved' : 'revision_requested')}
              >
                {approve.isPending ? 'Submitting…' : mode === 'approve' ? 'Confirm approval' : 'Submit request'}
              </button>
            </div>
          </div>
        )}

        {mockup.status === 'approved' && (
          <div className="mt-8 rounded-lg bg-green-50 p-4 text-center text-green-800">Design approved — thank you!</div>
        )}
      </div>
    </div>
  );
}
