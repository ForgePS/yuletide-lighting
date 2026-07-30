'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';

export function ProposalTemplatesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.proposals360.templates.list.useQuery();
  const update = trpc.proposals360.templates.update.useMutation({
    onSuccess: () => {
      toast('Proposal template saved', 'success');
      void utils.proposals360.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', scopeOfWork: '', isActive: true });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Proposal templates</h2>
          <p className="text-xs text-muted-foreground">
            Edit residential, commercial, HOA, municipal, and permanent lighting starters — including scope of work copy.
          </p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Category</th>
              <th>Install type</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td className="capitalize text-muted-foreground">{t.category.replace(/_/g, ' ')}</td>
                <td className="capitalize text-muted-foreground">{t.installType?.replace(/_/g, ' ') ?? '—'}</td>
                <td>{t.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => {
                      setEditingId(t.id);
                      setDraft({
                        name: t.name,
                        description: t.description ?? '',
                        scopeOfWork: t.scopeOfWork ?? '',
                        isActive: t.isActive,
                      });
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId ? (
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({
              templateId: editingId,
              data: {
                name: draft.name,
                description: draft.description,
                scopeOfWork: draft.scopeOfWork,
                isActive: draft.isActive,
              },
            });
          }}
        >
          <h3 className="font-semibold">Edit template</h3>
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <textarea
            className="input"
            rows={2}
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <textarea
            className="input min-h-[160px] font-mono text-sm"
            placeholder="Scope of work"
            value={draft.scopeOfWork}
            onChange={(e) => setDraft({ ...draft, scopeOfWork: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={update.isPending}>
              Save template
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
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
