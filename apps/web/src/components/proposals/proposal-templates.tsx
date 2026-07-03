'use client';

import { trpc } from '@/lib/trpc';
import { LoadingState } from '@/components/ui/states';

export function ProposalTemplatesPage() {
  const { data, isLoading } = trpc.proposals360.templates.list.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Proposal templates</h2>
        <p className="text-xs text-muted-foreground">Residential, commercial, HOA, municipal, and permanent lighting starters</p>
      </div>
      <table className="data-table">
        <thead><tr><th>Template</th><th>Category</th><th>Install type</th><th>Active</th></tr></thead>
        <tbody>
          {(data ?? []).map((t) => (
            <tr key={t.id}>
              <td className="font-medium">{t.name}</td>
              <td className="capitalize text-muted-foreground">{t.category.replace(/_/g, ' ')}</td>
              <td className="capitalize text-muted-foreground">{t.installType?.replace(/_/g, ' ') ?? '—'}</td>
              <td>{t.isActive ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProposalPackagesPage() {
  return (
    <div className="card p-6">
      <h2 className="font-semibold">Good / Better / Best packages</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Packages are created automatically per proposal during the creation wizard. Open any proposal to view and compare Package A (Basic), Package B (Recommended), and Package C (Premium).
      </p>
      <p className="mt-4 text-sm">Each package includes products, decorations, labor, add-ons, warranty, and margin calculations from the dynamic pricing engine.</p>
    </div>
  );
}
