'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { useToast } from '@/lib/toast';
import { useDemoMode } from '../context/demo-mode-context';
import { useTour } from '../context/tour-context';
import { DEMO_ENTRY_TOUR_ID } from '@clcrm/types';

export function DemoEnvironmentBanner() {
  const { isDemoTenant, isLoading } = useDemoMode();
  const { startTour, status: tourStatus } = useTour();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const router = useRouter();
  const utils = trpc.useUtils();

  const resetDemo = trpc.demo360.reset.useMutation({
    onSuccess: async () => {
      toast('Demo data restored', 'success');
      await utils.invalidate();
    },
    onError: (err) => toast(err.message || 'Could not reset demo data', 'error'),
  });

  if (isLoading || !isDemoTenant) return null;

  async function handleExitDemo() {
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  }

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-950 dark:text-amber-100"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold tracking-wide">DEMO ENVIRONMENT</p>
          <p className="text-xs opacity-90">
            Changes made here do not affect live customer accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            disabled={tourStatus !== 'idle' && tourStatus !== 'paused'}
            onClick={() => void startTour(DEMO_ENTRY_TOUR_ID, 'guided')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Restart Guided Demo
          </button>

          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            disabled={resetDemo.isPending}
            onClick={() => resetDemo.mutate()}
          >
            {resetDemo.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset Demo Data
          </button>

          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => void handleExitDemo()}
          >
            Exit Demo
          </button>

          <Link href="/for-installers" className="btn-ghost px-3 py-1.5 text-xs">
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
