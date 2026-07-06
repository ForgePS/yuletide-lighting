'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';

const TEMPLATE_CATEGORIES = [
  'residential_roofline',
  'residential_premium',
  'commercial',
  'hoa',
  'municipal',
  'permanent_lighting',
] as const;

const INSTALL_TYPES = [
  'roofline',
  'trees',
  'wreaths',
  'garland',
  'commercial_display',
  'permanent_lighting',
  'service_call',
  'custom',
] as const;

export function ProposalTemplatesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.proposals360.templates.list.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'residential_roofline' as (typeof TEMPLATE_CATEGORIES)[number],
    installType: 'roofline' as (typeof INSTALL_TYPES)[number],
    description: '',
    scopeOfWork: '',
    isActive: true,
  });

  const create = trpc.proposals360.templates.create.useMutation({
    onSuccess: () => {
      toast('Template created', 'success');
      utils.proposals360.templates.list.invalidate();
      setForm({
        name: '',
        category: 'residential_roofline',
        installType: 'roofline',
        description: '',
        scopeOfWork: '',
        isActive: true,
      });
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.proposals360.templates.update.useMutation({
    onSuccess: () => {
      toast('Template updated', 'success');
      utils.proposals360.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.proposals360.templates.delete.useMutation({
    onSuccess: () => {
      toast('Template deleted', 'success');
      utils.proposals360.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const editingTemplate = useMemo(
    () => data?.find((row) => row.id === editingId) ?? null,
    [data, editingId],
  );

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-semibold">Create template</h2>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            create.mutate({
              name: form.name.trim(),
              category: form.category,
              installType: form.installType,
              description: form.description || undefined,
              scopeOfWork: form.scopeOfWork || undefined,
              isActive: form.isActive,
              defaultPackages: [],
            });
          }}
        >
          <label className="text-sm">
            <span className="text-muted-foreground">Name</span>
            <input className="input mt-1 w-full" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Category</span>
            <select className="input mt-1 w-full capitalize" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as (typeof TEMPLATE_CATEGORIES)[number] })}>
              {TEMPLATE_CATEGORIES.map((row) => <option key={row} value={row}>{row.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Install type</span>
            <select className="input mt-1 w-full capitalize" value={form.installType} onChange={(e) => setForm({ ...form, installType: e.target.value as (typeof INSTALL_TYPES)[number] })}>
              {INSTALL_TYPES.map((row) => <option key={row} value={row}>{row.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="mt-6 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <input className="input mt-1 w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-muted-foreground">Scope of work</span>
            <textarea className="input mt-1 min-h-[90px] w-full" value={form.scopeOfWork} onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })} />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={create.isPending}>Create template</button>
          </div>
        </form>
      </div>

      {!data?.length ? (
        <EmptyState title="No templates" description="Create your first proposal template above." />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Template</th><th>Category</th><th>Install type</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="capitalize text-muted-foreground">{t.category.replace(/_/g, ' ')}</td>
                  <td className="capitalize text-muted-foreground">{t.installType?.replace(/_/g, ' ') ?? '—'}</td>
                  <td>{t.isActive ? 'Yes' : 'No'}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => setEditingId(t.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs text-destructive"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Delete template "${t.name}"?`)) {
                            remove.mutate({ templateId: t.id });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingTemplate && (
        <div className="card p-6">
          <h3 className="font-semibold">Edit template</h3>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              update.mutate({
                templateId: editingTemplate.id,
                data: {
                  name: String(formData.get('name') || '').trim(),
                  category: String(formData.get('category') || editingTemplate.category) as (typeof TEMPLATE_CATEGORIES)[number],
                  installType: String(formData.get('installType') || editingTemplate.installType || 'custom') as (typeof INSTALL_TYPES)[number],
                  description: String(formData.get('description') || ''),
                  scopeOfWork: String(formData.get('scopeOfWork') || ''),
                  isActive: formData.get('isActive') === 'on',
                },
              });
            }}
          >
            <label className="text-sm">
              <span className="text-muted-foreground">Name</span>
              <input name="name" className="input mt-1 w-full" required defaultValue={editingTemplate.name} />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Category</span>
              <select name="category" className="input mt-1 w-full capitalize" defaultValue={editingTemplate.category}>
                {TEMPLATE_CATEGORIES.map((row) => <option key={row} value={row}>{row.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Install type</span>
              <select name="installType" className="input mt-1 w-full capitalize" defaultValue={editingTemplate.installType ?? 'custom'}>
                {INSTALL_TYPES.map((row) => <option key={row} value={row}>{row.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="mt-6 inline-flex items-center gap-2 text-sm">
              <input name="isActive" type="checkbox" defaultChecked={editingTemplate.isActive} />
              Active
            </label>
            <label className="text-sm md:col-span-2">
              <span className="text-muted-foreground">Description</span>
              <input name="description" className="input mt-1 w-full" defaultValue={editingTemplate.description ?? ''} />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="text-muted-foreground">Scope of work</span>
              <textarea name="scopeOfWork" className="input mt-1 min-h-[90px] w-full" defaultValue={editingTemplate.scopeOfWork ?? ''} />
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="btn-primary" disabled={update.isPending}>Save changes</button>
              <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
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
