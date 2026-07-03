'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';

export function MockupApprovalPanel({
  mockupId,
  status,
  approvalToken,
}: {
  mockupId: string;
  status: string;
  approvalToken?: string | null;
}) {
  const { toast } = useToast();
  const [approvalUrl, setApprovalUrl] = useState<string | null>(
    approvalToken && typeof window !== 'undefined' ? `${window.location.origin}/m/${approvalToken}` : null,
  );
  const send = trpc.mockups360.sendForApproval.useMutation({
    onSuccess: (r) => {
      toast('Sent for customer approval', 'success');
      setApprovalUrl(r.approvalUrl);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  async function copyUrl() {
    if (!approvalUrl) return;
    await navigator.clipboard.writeText(approvalUrl);
    toast('Approval link copied', 'success');
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold">Customer approval</h3>
      <p className="mt-1 text-sm capitalize text-muted-foreground">Status: {status.replace(/_/g, ' ')}</p>
      {approvalUrl ? (
        <div className="mt-3 space-y-2">
          <p className="break-all font-mono text-xs">{approvalUrl}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={copyUrl}>Copy link</button>
            <a href={approvalUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">Preview</a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary mt-3 text-sm"
          disabled={send.isPending || status === 'approved'}
          onClick={() => send.mutate({ mockupId })}
        >
          {send.isPending ? 'Sending…' : 'Send for approval'}
        </button>
      )}
    </div>
  );
}

export function MockupProposalPanel({
  mockupId,
  customerId,
  propertyId,
  linkedProposalId,
}: {
  mockupId: string;
  customerId?: string | null;
  propertyId: string;
  linkedProposalId?: string | null;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: proposals } = trpc.mockups360.proposals.listForMockup.useQuery({ mockupId });
  const createProposal = trpc.mockups360.proposals.createFromMockup.useMutation({
    onSuccess: (p) => {
      toast('Proposal created from mockup', 'success');
      if (p?.id) router.push(`/app/proposals/${p.id}`);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const link = trpc.mockups360.proposals.link.useMutation({
    onSuccess: () => {
      toast('Linked to proposal', 'success');
      utils.mockups360.getById.invalidate({ mockupId });
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [selectedProposalId, setSelectedProposalId] = useState('');

  if (!customerId) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold">Proposal</h3>
        <p className="mt-2 text-sm text-muted-foreground">Link a customer to this property to create proposals.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold">Proposal</h3>
      {linkedProposalId && (
        <a href={`/app/proposals/${linkedProposalId}`} className="mt-2 block text-sm text-primary hover:underline">
          View linked proposal
        </a>
      )}
      <button
        type="button"
        className="btn-primary mt-3 w-full text-sm"
        disabled={createProposal.isPending}
        onClick={() => createProposal.mutate({ mockupId, customerId, propertyId })}
      >
        {createProposal.isPending ? 'Creating…' : 'Create proposal from mockup'}
      </button>
      {proposals && proposals.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">Or link to existing proposal</p>
          <select className="input w-full text-sm" value={selectedProposalId} onChange={(e) => setSelectedProposalId(e.target.value)}>
            <option value="">Select proposal…</option>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>{p.title ?? p.id} ({p.status})</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary w-full text-sm"
            disabled={!selectedProposalId || link.isPending}
            onClick={() => link.mutate({ mockupId, proposalId: selectedProposalId })}
          >
            Link mockup
          </button>
        </div>
      )}
    </div>
  );
}
