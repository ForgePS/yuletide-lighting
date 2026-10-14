'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useDemoMode } from '../context/demo-mode-context';

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-amber-200/60">
      <div
        className="h-full rounded-full bg-amber-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

/** Banner shown while company setup is incomplete (real tenants only). */
export function CompanySetupBanner() {
  const { isDemoTenant, isLoading: demoLoading } = useDemoMode();
  const { data, isLoading } = trpc.onboarding360.state.useQuery(undefined, {
    staleTime: 30_000,
    retry: false,
  });

  if (demoLoading || isDemoTenant || isLoading || !data) return null;
  if (data.completed || data.dismissed) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p>
            <span className="font-semibold">Company Setup</span>
            {' — '}
            {data.completedCount} of {data.totalCount} complete
          </p>
          <ProgressBar percent={data.progressPercent} />
        </div>
        <Link
          href="/onboarding"
          className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          Continue setup
        </Link>
      </div>
    </div>
  );
}
