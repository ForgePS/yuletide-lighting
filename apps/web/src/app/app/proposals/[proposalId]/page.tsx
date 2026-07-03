'use client';

import { useParams } from 'next/navigation';
import { ProposalDetail } from '@/components/proposals';

export default function ProposalDetailPage() {
  const proposalId = useParams().proposalId as string;
  return <ProposalDetail proposalId={proposalId} />;
}
