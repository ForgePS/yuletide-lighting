'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, ErrorState } from '@/components/ui/states';

type PackageTierKey = 'good' | 'better' | 'best';

type PackageDefaultForm = {
  label: string;
  markupPercent: number;
  description: string;
  inclusions: string[];
};

const EMPTY: Record<PackageTierKey, PackageDefaultForm> = {
  good: { label: 'Good', markupPercent: 15, description: '', inclusions: [] },
  better: { label: 'Better', markupPercent: 25, description: '', inclusions: [] },
  best: { label: 'Best', markupPercent: 35, description: '', inclusions: [] },
};

export function ProposalPackagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } = trpc.settings360.proposals.useQuery();
  const update = trpc.settings360.updateProposals.useMutation({
    onSuccess: async () => {
      toast('Package defaults saved', 'success');
      await utils.settings360.proposals.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!data?.packageDefaults) return;
    setForm({
      good: {
        label: data.packageDefaults.good.label,
        markupPercent: data.packageDefaults.good.markupPercent,
        description: data.packageDefaults.good.description ?? '',
        inclusions: data.packageDefaults.good.inclusions ?? [],
      },
      better: {
        label: data.packageDefaults.better.label,
        markupPercent: data.packageDefaults.better.markupPercent,
        description: data.packageDefaults.better.description ?? '',
        inclusions: data.packageDefaults.better.inclusions ?? [],
      },
      best: {
        label: data.packageDefaults.best.label,
        markupPercent: data.packageDefaults.best.markupPercent,
        description: data.packageDefaults.best.description ?? '',
        inclusions: data.packageDefaults.best.inclusions ?? [],
      },
    });
  }, [data]);

  if (isLoading) return <LoadingState message="Loading package defaults..." />;
  if (isError || !data) {
    return <ErrorState message="Could not load package defaults." onRetry={() => void refetch()} />;
  }

  function patchTier(tier: PackageTierKey, patch: Partial<PackageDefaultForm>) {
    setForm((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ packageDefaults: form });
      }}
    >
      <div className="card space-y-2 p-5">
        <h2 className="font-semibold">Good / Better / Best package library</h2>
        <p className="text-sm text-muted-foreground">
          These defaults prefill Good / Better / Best on each new proposal (still editable per proposal).
          When packages are filled on a proposal, they set the total and take precedence over line items.
          Customers pick one package on the public proposal page.
        </p>
        <p className="text-sm text-muted-foreground">
          Same editor also lives under{' '}
          <Link href="/app/settings/proposals" className="text-primary hover:underline">
            Settings → Proposals
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(['good', 'better', 'best'] as const).map((tier) => (
          <div key={tier} className="card space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tier}</p>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Label</span>
              <input
                className="input w-full"
                value={form[tier].label}
                onChange={(e) => patchTier(tier, { label: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Markup %</span>
              <input
                className="input w-full"
                type="number"
                value={form[tier].markupPercent}
                onChange={(e) => patchTier(tier, { markupPercent: Number(e.target.value) })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <textarea
                className="input min-h-[88px] w-full"
                value={form[tier].description}
                onChange={(e) => patchTier(tier, { description: e.target.value })}
                placeholder="Short customer-facing summary"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">What&apos;s included (one per line)</span>
              <textarea
                className="input min-h-[140px] w-full"
                value={form[tier].inclusions.join('\n')}
                onChange={(e) =>
                  patchTier(tier, {
                    inclusions: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={'Roofline LED installation\nTimer setup\nSeasonal takedown'}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save package defaults'}
        </button>
      </div>
    </form>
  );
}
