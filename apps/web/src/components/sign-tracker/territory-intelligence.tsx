'use client';

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { LoadingState } from '@/components/ui/states';

const FLAG_STYLES: Record<string, string> = {
  high_value: 'border-green-300 bg-green-50',
  high_loss: 'border-red-300 bg-red-50',
  increase_placement: 'border-blue-300 bg-blue-50',
  avoid_roadside: 'border-amber-300 bg-amber-50',
};

const FLAG_LABELS: Record<string, string> = {
  high_value: 'High Value Area',
  high_loss: 'High Sign Loss Area',
  increase_placement: 'Increase Placement Next Season',
  avoid_roadside: 'Avoid Roadside Placement',
};

export function TerritoryIntelligence({ seasonYear }: { seasonYear: number }) {
  const { idToken, loading: authLoading } = useAuth();
  const ready = !authLoading && !!idToken;
  const { data, isLoading } = trpc.signTracker360.territory.useQuery({ seasonYear }, { enabled: ready });

  if (isLoading) return <LoadingState message="Analyzing territories..." />;
  if (!data?.length) {
    return (
      <div className="card p-6">
        <h3 className="font-semibold">Territory Intelligence</h3>
        <p className="mt-2 text-sm text-muted-foreground">Not enough data yet to generate territory insights.</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold">Territory Intelligence</h3>
      <p className="mt-1 text-sm text-muted-foreground">Areas flagged based on sign performance and nearby customer installs.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.map((flag, i) => (
          <div key={`${flag.area}-${flag.flag}-${i}`} className={`rounded-xl border p-4 ${FLAG_STYLES[flag.flag] ?? 'border-muted'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">{FLAG_LABELS[flag.flag] ?? flag.flag}</p>
            <p className="mt-1 font-medium">{flag.area}</p>
            <p className="mt-1 text-sm text-muted-foreground">{flag.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
