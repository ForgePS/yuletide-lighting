'use client';

import { useParams } from 'next/navigation';
import { ProposalFormLoader } from '@/components/proposals';

export default function EditProposalPage() {
  const proposalId = useParams().proposalId as string;
  return <ProposalFormLoader proposalId={proposalId} />;
}
