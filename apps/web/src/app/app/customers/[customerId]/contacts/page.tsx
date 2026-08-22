'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function CustomerContactsPage() {
  const customerId = useParams().customerId as string;
  const { data, isLoading, isError, error, refetch } = trpc.contacts360.list.useQuery({
    customerId,
    pageSize: 100,
  });

  if (isLoading) return <LoadingState message="Loading contacts..." />;
  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Could not load contacts.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const contacts = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Contacts</h2>
          <p className="text-sm text-muted-foreground">People tied to this customer account.</p>
        </div>
        <Link href={`/app/contacts?customerId=${customerId}`} className="btn-secondary text-sm">
          Manage contacts
        </Link>
      </div>
      {!contacts.length ? (
        <EmptyState
          title="No contacts yet"
          description="Add decision-makers, billing contacts, or property managers under this account."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Primary</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/contacts/${contact.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{contact.role.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{contact.phone || '—'}</td>
                  <td className="px-4 py-3">{contact.email || '—'}</td>
                  <td className="px-4 py-3">{contact.isPrimary ? 'Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
