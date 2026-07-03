'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, Phone, Plus, Search, Upload, Users } from 'lucide-react';
import type { ContactRecord } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

function displayName(contact: Pick<ContactRecord, 'firstName' | 'lastName'>) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function roleLabel(role: ContactRecord['role']) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function ContactForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ContactRecord['role']>('primary');
  const create = trpc.contacts360.create.useMutation({
    onSuccess: () => {
      toast('Contact added', 'success');
      onSaved();
    },
    onError: (error) => toast(error.message || 'Could not add contact', 'error'),
  });

  return (
    <form
      className="card mt-4 grid gap-4 p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          firstName,
          lastName,
          customerName,
          phone,
          email,
          role,
          title: '',
          phoneExtension: '',
          notes: '',
          isPrimary: role === 'primary',
          smsOptIn: true,
          emailOptIn: true,
          tags: [],
          source: 'manual',
        });
      }}
    >
      <input className="input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      <input className="input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      <input className="input" placeholder="Customer / company" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as ContactRecord['role'])}>
        <option value="primary">Primary</option>
        <option value="spouse">Spouse</option>
        <option value="property_manager">Property manager</option>
        <option value="billing">Billing</option>
        <option value="operations">Operations</option>
        <option value="other">Other</option>
      </select>
      <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Save contact'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContactTable({ contacts }: { contacts: ContactRecord[] }) {
  if (contacts.length === 0) {
    return (
      <EmptyState
        title="No contacts found"
        description="Import contacts from a CSV export or add a contact manually to start tracking people separately from customer accounts."
        icon={Users}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Customer</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td className="font-medium">{displayName(contact)}</td>
              <td>
                {contact.customerId ? (
                  <Link href={`/app/customers/${contact.customerId}`} className="text-primary hover:underline">
                    {contact.customerName ?? 'View customer'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{contact.customerName ?? 'Unlinked'}</span>
                )}
              </td>
              <td className="text-muted-foreground">{roleLabel(contact.role)}</td>
              <td className="text-muted-foreground">
                {contact.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="text-muted-foreground">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="text-muted-foreground">{contact.source ?? 'manual'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContactListPage() {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, refetch } = trpc.contacts360.list.useQuery(
    { page: 1, pageSize: 100, search: search || undefined },
    { staleTime: 30_000, retry: 1 },
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">{data?.total ?? 0} people linked to customers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/settings/import" className="btn-secondary">
            <Upload className="h-4 w-4" />
            Import data
          </Link>
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New contact
          </button>
        </div>
      </div>

      {creating && <ContactForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search name, customer, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      <div className="mt-6">
        {isLoading && <LoadingState message="Loading contacts..." />}
        {isError && <ErrorState message="Could not load contacts." onRetry={() => refetch()} />}
        {!isLoading && !isError && <ContactTable contacts={data?.items ?? []} />}
      </div>
    </div>
  );
}
