'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const STEP_HREFS: Record<string, string | null> = {
  company: '/app/settings/company',
  season: '/app/settings/season',
  products: '/app/settings/inventory',
  invite_team: '/app/settings/users',
  payments: '/app/settings/subscription',
  complete: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.onboarding360.state.useQuery();
  const updateStep = trpc.onboarding360.updateStep.useMutation({
    onSuccess: () => void refetch(),
  });
  const complete = trpc.onboarding360.complete.useMutation({
    onSuccess: () => {
      void refetch();
      router.push('/app');
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading onboarding…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Could not load onboarding state.</p>
      </div>
    );
  }

  const doneCount = data.checklist.filter((item) => item.done).length;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get started</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Set up your workspace</h1>
      <p className="mt-2 text-muted-foreground">
        Complete these steps when you are ready. You can skip products and finish later from the app.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        {doneCount} of {data.checklist.length} complete
      </p>

      <ul className="mt-8 space-y-3">
        {data.checklist.map((item) => {
          const href = STEP_HREFS[item.id];
          const isProducts = item.id === 'products';
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                {item.done ? (
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.label}</p>
                  {item.id === 'complete' ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Mark setup complete when you are ready to use the app.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isProducts && !item.done ? (
                  <button
                    type="button"
                    className="btn-ghost text-sm"
                    disabled={updateStep.isPending}
                    onClick={() => updateStep.mutate({ step: 'invite_team' })}
                  >
                    Skip
                  </button>
                ) : null}
                {href && !item.done ? (
                  <Link href={href} className="btn-secondary text-sm">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                {item.id === 'complete' && !data.completed ? (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate()}
                  >
                    {complete.isPending ? 'Saving…' : 'Complete'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex items-center justify-between gap-4">
        <Link href="/app" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Continue to app
        </Link>
        {data.completed ? (
          <Link href="/app" className="btn-primary">
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? 'Saving…' : 'Mark onboarding complete'}
          </button>
        )}
      </div>
    </div>
  );
}
