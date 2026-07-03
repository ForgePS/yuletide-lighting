'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ProposalDashboard, ProposalListHub, ProposalPipeline } from '@/components/proposals';
import { useState } from 'react';

type View = 'list' | 'dashboard' | 'pipeline';

export default function ProposalsPage() {
  const [view, setView] = useState<View>('list');

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Proposals</h1>
          <p className="page-subtitle">Sales closing from mockup to signed contract</p>
        </div>
        <Link href="/app/proposals/new" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          New proposal
        </Link>
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-border p-1 w-fit">
        <button type="button" className={view === 'list' ? 'btn-primary px-4 py-1.5 text-sm' : 'btn-ghost px-4 py-1.5 text-sm'} onClick={() => setView('list')}>List</button>
        <button type="button" className={view === 'dashboard' ? 'btn-primary px-4 py-1.5 text-sm' : 'btn-ghost px-4 py-1.5 text-sm'} onClick={() => setView('dashboard')}>Dashboard</button>
        <button type="button" className={view === 'pipeline' ? 'btn-primary px-4 py-1.5 text-sm' : 'btn-ghost px-4 py-1.5 text-sm'} onClick={() => setView('pipeline')}>Pipeline</button>
      </div>

      <div className="mt-6">
        {view === 'list' && <ProposalListHub />}
        {view === 'dashboard' && <ProposalDashboard />}
        {view === 'pipeline' && <ProposalPipeline />}
      </div>
    </div>
  );
}
