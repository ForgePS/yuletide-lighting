'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { ProposalForm } from '@/components/proposals';
import { LoadingState } from '@/components/ui/states';

export default function NewProposalPage() {
  return (
    <div>
      <div className="page-header">
        <Link href="/app/proposals" className="text-sm text-primary hover:underline">← Proposals</Link>
        <h1 className="page-title mt-2">New proposal</h1>
        <p className="page-subtitle">Fill in customer, scope, and pricing — all on one page</p>
      </div>
      <div className="mt-6">
        <Suspense fallback={<LoadingState message="Loading..." />}>
          <ProposalForm />
        </Suspense>
      </div>
    </div>
  );
}
