'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatCurrency } from '@/lib/proposal-utils';
import { formatDate } from '@/lib/customer360-utils';
import { labelProposalStatus } from '@/lib/proposal-utils';

export default function CustomerSalesPage() {
  const customerId = useParams().customerId as string;
  const proposalsQuery = trpc.proposals360.list.useQuery();
  const contactsQuery = trpc.contacts360.list.useQuery({ customerId, pageSize: 100 });
  const agreementsQuery = trpc.agreements360.list.useQuery({ customerId, pageSize: 100 });

  const loading = proposalsQuery.isLoading || contactsQuery.isLoading || agreementsQuery.isLoading;
  const errored = proposalsQuery.isError || contactsQuery.isError || agreementsQuery.isError;

  if (loading) return <LoadingState message="Loading sales..." />;
  if (errored) {
    return (
      <ErrorState
        message={
          proposalsQuery.error?.message ??
          contactsQuery.error?.message ??
          agreementsQuery.error?.message ??
          'Could not load sales data.'
        }
        onRetry={() => {
          void proposalsQuery.refetch();
          void contactsQuery.refetch();
          void agreementsQuery.refetch();
        }}
      />
    );
  }

  const proposals = (proposalsQuery.data ?? []).filter((p) => p.customerId === customerId);
  const contacts = contactsQuery.data?.items ?? [];
  const agreements = agreementsQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Proposals</h2>
            <p className="text-sm text-muted-foreground">Estimates and packages for this account.</p>
          </div>
          <Link href={`/app/proposals/new?customerId=${customerId}`} className="btn-primary text-sm">
            New proposal
          </Link>
        </div>
        {!proposals.length ? (
          <EmptyState
            title="No proposals yet"
            description="Create a proposal after the consultation survey is complete."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/app/proposals/${proposal.id}`} className="font-medium text-primary hover:underline">
                        {proposal.title || 'Untitled proposal'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{labelProposalStatus(proposal.status)}</td>
                    <td className="px-4 py-3">{formatCurrency(proposal.subtotalCents ?? 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {proposal.updatedAt ? formatDate(proposal.updatedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Agreements</h2>
            <p className="text-sm text-muted-foreground">Multi-year and season agreements for this account.</p>
          </div>
          <Link href="/app/agreements" className="btn-secondary text-sm">
            Manage agreements
          </Link>
        </div>
        {!agreements.length ? (
          <EmptyState
            title="No agreements yet"
            description="Agreements are created when a proposal is accepted, or added manually."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Seasons</th>
                  <th className="px-4 py-3 font-medium">Annual</th>
                  <th className="px-4 py-3 font-medium">Sign link</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((agreement) => (
                  <tr key={agreement.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href="/app/agreements" className="font-medium text-primary hover:underline">
                        {agreement.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{agreement.status.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {agreement.startSeason}
                      {agreement.endSeason !== agreement.startSeason ? `–${agreement.endSeason}` : ''}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(agreement.annualValueCents)}</td>
                    <td className="px-4 py-3">
                      {agreement.status === 'awaiting_signature' && agreement.publicToken ? (
                        <Link
                          href={`/a/${agreement.publicToken}`}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          Open sign page
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
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
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/app/contacts/${contact.id}`} className="font-medium text-primary hover:underline">
                        {contact.firstName} {contact.lastName}
                        {contact.isPrimary ? (
                          <span className="ml-2 text-xs text-muted-foreground">Primary</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{contact.role.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{contact.phone || '—'}</td>
                    <td className="px-4 py-3">{contact.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
