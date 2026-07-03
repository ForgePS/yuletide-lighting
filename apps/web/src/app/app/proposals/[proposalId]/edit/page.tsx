'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Edit is inline on the proposal detail page — redirect there. */
export default function EditProposalPage() {
  const proposalId = useParams().proposalId as string;
  const router = useRouter();
  useEffect(() => {
    router.replace(`/app/proposals/${proposalId}`);
  }, [proposalId, router]);
  return null;
}
