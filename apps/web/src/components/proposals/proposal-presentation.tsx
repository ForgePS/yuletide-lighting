'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrency, labelProposalStatus } from '@/lib/proposal-utils';
import { LoadingState } from '@/components/ui/states';

export function ProposalPresentationMode() {
  const proposalId = useParams().proposalId as string;
  const { data, isLoading } = trpc.proposals360.getById.useQuery({ proposalId });
  if (isLoading || !data) return <LoadingState message="Loading presentation..." />;

  const recommended = data.packages?.find((p) => p.isRecommended) ?? data.packages?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-center text-sm uppercase tracking-wide text-muted-foreground">Proposal presentation</p>
        <h1 className="mt-2 text-center text-4xl font-bold">{data.title}</h1>
        {data.propertyPhotoUrl && (
          <img src={data.propertyPhotoUrl} alt="Property" className="mx-auto mt-8 max-h-80 rounded-2xl object-cover shadow-lg" />
        )}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {data.packages?.map((pkg) => (
            <div key={pkg.id} className={`rounded-2xl border p-6 ${pkg.isRecommended ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border'}`}>
              <h3 className="text-lg font-semibold">{pkg.label}</h3>
              <p className="mt-4 text-3xl font-bold">{formatCurrency(pkg.subtotalCents)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{pkg.description ?? pkg.warranty ?? 'Full season installation'}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-2xl font-semibold">{formatCurrency(recommended?.subtotalCents ?? data.subtotalCents)}</p>
          <p className="text-muted-foreground">or {formatCurrency(Math.round((recommended?.subtotalCents ?? data.subtotalCents) / 12))}/mo financing (mock)</p>
        </div>
        <p className="mt-8 text-center text-sm capitalize text-muted-foreground">Status: {labelProposalStatus(data.status)}</p>
      </div>
    </div>
  );
}
