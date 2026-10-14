'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Circle, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { CompanySetupCategory } from '@clcrm/types';

const CATEGORY_LABELS: Record<CompanySetupCategory, string> = {
  foundation: 'Foundation',
  team: 'Team',
  commercial: 'Commercial',
  operations: 'Operations',
  launch: 'Launch',
};

const CATEGORY_ORDER: CompanySetupCategory[] = [
  'foundation',
  'team',
  'commercial',
  'operations',
  'launch',
];

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.onboarding360.state.useQuery();
  const updateStep = trpc.onboarding360.updateStep.useMutation({
    onSuccess: () => void refetch(),
  });
  const skipStep = trpc.onboarding360.skipStep.useMutation({
    onSuccess: () => void refetch(),
  });
  const complete = trpc.onboarding360.complete.useMutation({
    onSuccess: () => {
      void refetch();
      router.push('/app');
    },
  });
  const dismiss = trpc.onboarding360.dismiss.useMutation({
    onSuccess: () => {
      void refetch();
      router.push('/app');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading company setup…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Could not load company setup.</p>
      </div>
    );
  }

  if (data.completed) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Company Setup</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">You&apos;re ready to go</h1>
        <p className="mt-2 text-muted-foreground">
          Your workspace setup is complete. Reopen Help & Tours anytime for guided walkthroughs.
        </p>
        <Link href="/app" className="btn-primary mt-8 inline-flex items-center gap-2">
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Company Setup</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Set up your company</h1>
          <p className="mt-2 text-muted-foreground">
            Progress is based on real configuration in your workspace — not tour clicks.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 text-sm text-muted-foreground"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate()}
        >
          <X className="mr-1 inline h-4 w-4" />
          Dismiss
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            {data.completedCount} of {data.totalCount} complete
          </span>
          <span className="text-muted-foreground">{data.progressPercent}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={data.progressPercent} />
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {CATEGORY_ORDER.map((category) => {
          const items = data.checklist.filter((item) => item.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {item.done ? (
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                        {item.skipped && !item.done ? (
                          <p className="mt-1 text-xs text-amber-700">Skipped — you can complete this later.</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {item.skippable && !item.done ? (
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          disabled={skipStep.isPending}
                          onClick={() => skipStep.mutate({ step: item.id })}
                        >
                          Skip for now
                        </button>
                      ) : null}
                      {item.href && !item.done ? (
                        <Link
                          href={item.href}
                          className="btn-secondary text-sm"
                          onClick={() => updateStep.mutate({ step: item.id })}
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                      {item.id === 'launch_readiness' && !data.completed ? (
                        <button
                          type="button"
                          className="btn-primary text-sm"
                          disabled={complete.isPending}
                          onClick={() => complete.mutate()}
                        >
                          {complete.isPending ? 'Saving…' : 'Mark complete'}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
        <Link href="/app" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Continue to app
        </Link>
        <button
          type="button"
          className="btn-primary"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : 'Finish setup'}
        </button>
      </div>
    </div>
  );
}
