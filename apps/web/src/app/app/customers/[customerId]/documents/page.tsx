'use client';

import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDate } from '@/lib/customer360-utils';

const CATEGORY_OPTIONS = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'photo', label: 'Photo' },
  { value: 'permit', label: 'Permit' },
  { value: 'other', label: 'Other' },
] as const;

type Category = (typeof CATEGORY_OPTIONS)[number]['value'];

export default function CustomerDocumentsPage() {
  const customerId = useParams().customerId as string;
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.customer360.documents.list.useQuery({
    customerId,
  });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const create = trpc.customer360.documents.create.useMutation({
    onSuccess: () => {
      toast('Document added', 'success');
      void refetch();
      setShowForm(false);
      setTitle('');
      setCategory('other');
      setUrl('');
      setNotes('');
    },
    onError: () => toast('Could not add document', 'error'),
  });

  const remove = trpc.customer360.documents.delete.useMutation({
    onSuccess: () => {
      toast('Document deleted', 'success');
      void refetch();
    },
    onError: () => toast('Could not delete document', 'error'),
  });

  if (isLoading) return <LoadingState message="Loading documents..." />;
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load documents.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const documents = data ?? [];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      customerId,
      title: title.trim(),
      category,
      url: url.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Proposals, agreements, photos, and other files linked to this customer.
          </p>
        </div>
        <button type="button" className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add document'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Title</span>
              <input
                className="input w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Category</span>
              <select
                className="input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">URL</span>
              <input
                className="input w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <textarea
                className="input min-h-[72px] w-full"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </label>
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={create.isPending || !title.trim()}>
            {create.isPending ? 'Saving…' : 'Save document'}
          </button>
        </form>
      )}

      {!documents.length && !showForm ? (
        <EmptyState
          title="No documents yet"
          description="Add proposals, agreements, photos, permits, or other files for this customer."
        />
      ) : documents.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3 capitalize">{doc.category}</td>
                  <td className="px-4 py-3">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {doc.notes || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm('Delete this document?')) {
                          remove.mutate({ documentId: doc.id });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
