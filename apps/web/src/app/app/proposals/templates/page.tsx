'use client';

import Link from 'next/link';
import { ProposalTemplatesPage } from '@/components/proposals';

export default function TemplatesPage() {
  return (
    <div>
      <Link href="/app/proposals" className="text-sm text-primary hover:underline">← Proposals</Link>
      <h1 className="page-title mt-4">Proposal templates</h1>
      <div className="mt-6"><ProposalTemplatesPage /></div>
    </div>
  );
}
