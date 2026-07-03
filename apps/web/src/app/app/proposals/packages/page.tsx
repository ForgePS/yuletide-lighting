'use client';

import Link from 'next/link';
import { ProposalPackagesPage } from '@/components/proposals';

export default function PackagesPage() {
  return (
    <div>
      <Link href="/app/proposals" className="text-sm text-primary hover:underline">← Proposals</Link>
      <h1 className="page-title mt-4">Proposal packages</h1>
      <div className="mt-6"><ProposalPackagesPage /></div>
    </div>
  );
}
