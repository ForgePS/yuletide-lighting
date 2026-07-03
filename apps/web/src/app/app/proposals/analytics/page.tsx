'use client';

import Link from 'next/link';
import { ProposalAnalyticsPage } from '@/components/proposals';

export default function AnalyticsPage() {
  return (
    <div>
      <Link href="/app/proposals" className="text-sm text-primary hover:underline">← Proposals</Link>
      <h1 className="page-title mt-4">Proposal analytics</h1>
      <div className="mt-6"><ProposalAnalyticsPage /></div>
    </div>
  );
}
