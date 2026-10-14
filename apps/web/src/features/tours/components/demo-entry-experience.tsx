'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Loader2, MonitorPlay, MousePointerClick, Sparkles } from 'lucide-react';
import type { DemoEntryMode } from '@clcrm/types';
import { AuthLayout } from '@/components/auth-layout';
import { launchDemoEntry } from '../services/demo-entry-client';

type DemoStatus = {
  enabled: boolean;
  configured: boolean;
};

const OPTIONS: Array<{
  mode: DemoEntryMode;
  title: string;
  description: string;
  icon: typeof MonitorPlay;
}> = [
  {
    mode: 'watch',
    title: 'Watch Automated Demo',
    description: 'Hands-off walkthrough of the CRM with auto-advancing steps.',
    icon: MonitorPlay,
  },
  {
    mode: 'guided',
    title: 'Start Guided Tour',
    description: 'Click through each step at your own pace with helpful tips.',
    icon: MousePointerClick,
  },
  {
    mode: 'explore',
    title: 'Explore Demo',
    description: 'Jump into the full sandbox and browse every module freely.',
    icon: Compass,
  },
];

export function DemoEntryExperience() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [busyMode, setBusyMode] = useState<DemoEntryMode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);

    void fetch('/api/demo/enter', { signal: controller.signal })
      .then((res) => res.json())
      .then((data: DemoStatus) => setStatus(data))
      .catch(() => {
        setStatus({ enabled: false, configured: false });
        setError('Could not reach the demo service. Restart the dev server and try again.');
      })
      .finally(() => {
        clearTimeout(timer);
        setStatusLoading(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  async function handleLaunch(mode: DemoEntryMode) {
    setError('');
    setBusyMode(mode);
    try {
      await launchDemoEntry(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not launch the demo.');
      setBusyMode(null);
    }
  }

  const unavailable = !statusLoading && (!status?.enabled || !status?.configured);

  return (
    <AuthLayout
      title="See Yuletide in Action"
      subtitle="Follow a customer from the first lead through installation, service, takedown, and next-season renewal."
    >
      <div className="mt-6 space-y-4">
        {statusLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Checking demo availability…
          </div>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {unavailable ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The interactive demo is not configured in this environment yet. Run{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5">
              npm run provision:yuletide-demo -- --apply --project=yuletide-lighting --allow-production-demo
            </code>{' '}
            and{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5">
              npm run seed:yuletide-demo -- --apply --project=yuletide-lighting --allow-production-demo
            </code>
            . Use your <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>{' '}
            as the project (staging: <code className="rounded bg-amber-100 px-1 py-0.5">yuletide-lighting-staging</code>
            ).
          </p>
        ) : null}

        <div className="space-y-3">
          {OPTIONS.map(({ mode, title, description, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              disabled={Boolean(busyMode) || unavailable}
              onClick={() => void handleLaunch(mode)}
              className="card w-full p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                    {title}
                    {busyMode === mode ? (
                      <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary hover:underline">
            Return to Yuletide Lighting Co.
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
