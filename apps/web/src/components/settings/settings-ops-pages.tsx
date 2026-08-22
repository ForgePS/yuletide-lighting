'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { useToast } from '@/lib/toast';
import { EmptyState } from '@/components/ui/states';
import {
  FormField,
  SaveButton,
  SettingsError,
  SettingsLoading,
  SettingsSection,
  useSettingsSave,
} from './settings-widgets';

function settingsErrorMessage(error: { data?: { code?: string } | null; message?: string } | null | undefined) {
  const code = error?.data?.code;
  const message = error?.message;
  if (message === 'SUBSCRIPTION_LOCKED') {
    return 'Your subscription is inactive. Open Subscription in settings to renew and restore access.';
  }
  if (code === 'FORBIDDEN') return 'You need office or admin access to view settings.';
  if (code === 'UNAUTHORIZED') return 'Could not verify your sign-in. Try signing out and back in.';
  if (message && message !== 'UNAUTHORIZED') return message;
  return 'Could not load settings.';
}

function joinList(values: string[] | undefined) {
  return (values ?? []).join(', ');
}

function splitList(value: string) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function LocationsPage() {
  const { idToken, loading: authLoading } = useAuth();
  const ready = !authLoading && !!idToken;
  const { data, isLoading, isError, error, refetch } = trpc.settings360.company.useQuery(undefined, {
    enabled: ready,
    staleTime: 120_000,
  });
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateCompany.useMutation(saveHandlers);
  const [form, setForm] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    maxTravelDistanceMiles: 50,
    travelChargePerMileCents: 0,
    travelChargeMinimumCents: 0,
    states: '',
    counties: '',
    cities: '',
    zipCodes: '',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      addressLine1: data.addressLine1 ?? '',
      addressLine2: data.addressLine2 ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      postalCode: data.postalCode ?? '',
      maxTravelDistanceMiles: data.serviceArea?.maxTravelDistanceMiles ?? 50,
      travelChargePerMileCents: data.serviceArea?.travelChargePerMileCents ?? 0,
      travelChargeMinimumCents: data.serviceArea?.travelChargeMinimumCents ?? 0,
      states: joinList(data.serviceArea?.states),
      counties: joinList(data.serviceArea?.counties),
      cities: joinList(data.serviceArea?.cities),
      zipCodes: joinList(data.serviceArea?.zipCodes),
    });
  }, [data]);

  if (authLoading || !ready || isLoading) return <SettingsLoading />;
  if (isError || !data) {
    return <SettingsError message={settingsErrorMessage(error) || 'Could not load locations.'} onRetry={() => refetch()} />;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          companyName: data.companyName,
          dbaName: data.dbaName,
          logoUrl: data.logoUrl,
          website: data.website ?? '',
          phone: data.phone,
          email: data.email ?? '',
          addressLine1: form.addressLine1 || null,
          addressLine2: form.addressLine2 || null,
          city: form.city || null,
          state: form.state || null,
          postalCode: form.postalCode || null,
          timeZone: data.timeZone,
          taxId: data.taxId,
          licenseNumbers: data.licenseNumbers,
          serviceArea: {
            states: splitList(form.states),
            counties: splitList(form.counties),
            cities: splitList(form.cities),
            zipCodes: splitList(form.zipCodes),
            maxTravelDistanceMiles: form.maxTravelDistanceMiles,
            travelChargePerMileCents: form.travelChargePerMileCents,
            travelChargeMinimumCents: form.travelChargeMinimumCents,
          },
        });
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-header mb-0 text-lg font-semibold">Locations & service area</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage travel bounds and company address used for routing and proposals.
          </p>
        </div>
        <Link href="/app/settings/company" className="text-sm text-primary hover:underline">
          Full company profile →
        </Link>
      </div>

      <SettingsSection title="Company address" description="Primary business location. Edit the full profile for phone, email, and tax details.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Address line 1">
            <input className="input w-full" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          </FormField>
          <FormField label="Address line 2">
            <input className="input w-full" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          </FormField>
          <FormField label="City">
            <input className="input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </FormField>
          <FormField label="State">
            <input className="input w-full" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </FormField>
          <FormField label="ZIP">
            <input className="input w-full" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </FormField>
        </div>
      </SettingsSection>

      <SettingsSection title="Service area" description="Comma-separated lists are fine for states, counties, cities, and ZIP codes.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Max travel distance (miles)">
            <input
              className="input w-full"
              type="number"
              min={0}
              max={500}
              value={form.maxTravelDistanceMiles}
              onChange={(e) => setForm({ ...form, maxTravelDistanceMiles: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Travel charge per mile (cents)">
            <input
              className="input w-full"
              type="number"
              min={0}
              value={form.travelChargePerMileCents}
              onChange={(e) => setForm({ ...form, travelChargePerMileCents: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Travel charge minimum (cents)">
            <input
              className="input w-full"
              type="number"
              min={0}
              value={form.travelChargeMinimumCents}
              onChange={(e) => setForm({ ...form, travelChargeMinimumCents: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="States">
            <input className="input w-full" placeholder="TX, OK" value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} />
          </FormField>
          <FormField label="Counties">
            <input className="input w-full" value={form.counties} onChange={(e) => setForm({ ...form, counties: e.target.value })} />
          </FormField>
          <FormField label="Cities">
            <input className="input w-full" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />
          </FormField>
          <FormField label="ZIP codes">
            <input className="input w-full" value={form.zipCodes} onChange={(e) => setForm({ ...form, zipCodes: e.target.value })} />
          </FormField>
        </div>
      </SettingsSection>

      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function WarehousesPage() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.inventory360.warehouses.list.useQuery();
  const create = trpc.inventory360.warehouses.create.useMutation({
    onSuccess: () => {
      toast('Warehouse created', 'success');
      setName('');
      setAddress('');
      refetch();
    },
    onError: (err) => toast(err.message ?? 'Failed to create warehouse', 'error'),
  });
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  if (isLoading) return <SettingsLoading message="Loading warehouses..." />;
  if (isError) {
    return <SettingsError message={settingsErrorMessage(error) || 'Could not load warehouses.'} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header mb-0 text-lg font-semibold">Warehouses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Storage locations used for inventory, pick lists, and transfers.</p>
      </div>

      <SettingsSection title="Add warehouse">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ name: name.trim(), address: address.trim() || undefined });
          }}
        >
          <FormField label="Name">
            <input className="input w-full" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Main warehouse" />
          </FormField>
          <FormField label="Address">
            <input className="input w-full" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional street address" />
          </FormField>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={create.isPending || !name.trim()}>
              {create.isPending ? 'Creating...' : 'Create warehouse'}
            </button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title="Warehouses">
        {!data?.length ? (
          <EmptyState title="No warehouses" description="Create a warehouse to start stocking inventory." />
        ) : (
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((w) => (
                <tr key={w.id}>
                  <td className="font-medium">{w.name}</td>
                  <td className="capitalize">{w.type.replace(/_/g, ' ')}</td>
                  <td className="text-muted-foreground">{w.address || '—'}</td>
                  <td>{w.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>
    </div>
  );
}

export function VendorsPage() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = trpc.inventory360.vendors.list.useQuery();
  const create = trpc.inventory360.vendors.create.useMutation({
    onSuccess: () => {
      toast('Vendor created', 'success');
      setForm({ name: '', email: '', phone: '', notes: '' });
      refetch();
    },
    onError: (err) => toast(err.message ?? 'Failed to create vendor', 'error'),
  });
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });

  if (isLoading) return <SettingsLoading message="Loading vendors..." />;
  if (isError) {
    return <SettingsError message={settingsErrorMessage(error) || 'Could not load vendors.'} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header mb-0 text-lg font-semibold">Vendors</h2>
        <p className="mt-1 text-sm text-muted-foreground">Suppliers used for purchase orders and restocking.</p>
      </div>

      <SettingsSection title="Add vendor">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              name: form.name.trim(),
              email: form.email.trim() || undefined,
              phone: form.phone.trim() || undefined,
              notes: form.notes.trim() || undefined,
            });
          }}
        >
          <FormField label="Name">
            <input className="input w-full" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className="input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Notes">
            <input className="input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={create.isPending || !form.name.trim()}>
              {create.isPending ? 'Creating...' : 'Create vendor'}
            </button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title="Vendors">
        {!data?.length ? (
          <EmptyState title="No vendors" description="Add vendors to create purchase orders." />
        ) : (
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium">{v.name}</td>
                  <td className="text-muted-foreground">{v.email || '—'}</td>
                  <td className="text-muted-foreground">{v.phone || '—'}</td>
                  <td className="text-muted-foreground">{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>
    </div>
  );
}

export function NumberingPage() {
  const { data: jobs, isLoading: jobsLoading, isError: jobsError, error: jobsErr, refetch: refetchJobs } =
    trpc.settings360.jobs.useQuery();
  const { data: invoices } = trpc.settings360.invoices.useQuery();
  const { data: proposals } = trpc.settings360.proposals.useQuery();
  const saveHandlers = useSettingsSave(() => refetchJobs());
  const update = trpc.settings360.updateJobs.useMutation(saveHandlers);
  const [numberFormat, setNumberFormat] = useState('');

  useEffect(() => {
    if (jobs) setNumberFormat(jobs.numberFormat);
  }, [jobs]);

  if (jobsLoading) return <SettingsLoading />;
  if (jobsError || !jobs) {
    return <SettingsError message={settingsErrorMessage(jobsErr) || 'Could not load numbering settings.'} onRetry={() => refetchJobs()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header mb-0 text-lg font-semibold">Document numbering</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how job, invoice, and proposal numbers are generated. Tokens like {'{YYYY}'} and {'{SEQ}'} are supported.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            numberFormat,
            crewCapacityPerDay: jobs.crewCapacityPerDay,
            defaultScheduleDurationHours: jobs.defaultScheduleDurationHours,
            dispatchAutoAssign: jobs.dispatchAutoAssign,
            workOrderTemplateId: jobs.workOrderTemplateId,
            statusFlow: jobs.statusFlow,
            jobTypes: jobs.jobTypes,
          });
        }}
      >
        <SettingsSection title="Job numbers">
          <FormField label="Job number format">
            <input className="input w-full max-w-md" value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)} />
          </FormField>
          <div className="mt-4">
            <SaveButton saving={update.isPending} label="Save job format" />
          </div>
        </SettingsSection>
      </form>

      <SettingsSection title="Invoice numbering" description="Edit invoice number format under Invoice settings.">
        <p className="font-mono text-sm">{invoices?.numberFormat ?? 'INV-{YYYY}-{SEQ}'}</p>
        <Link href="/app/settings/invoices" className="mt-3 inline-block text-sm text-primary hover:underline">
          Open invoice settings →
        </Link>
      </SettingsSection>

      <SettingsSection title="Proposal numbering" description="Edit proposal number format under Proposal settings.">
        <p className="font-mono text-sm">{proposals?.numberFormat ?? 'PROP-{YYYY}-{SEQ}'}</p>
        <Link href="/app/settings/proposals" className="mt-3 inline-block text-sm text-primary hover:underline">
          Open proposal settings →
        </Link>
      </SettingsSection>
    </div>
  );
}

export function AuditPage() {
  const { data, isLoading, isError, error, refetch } = trpc.settings360.auditLogs.useQuery({ limit: 100 });

  if (isLoading) return <SettingsLoading message="Loading audit log..." />;
  if (isError) {
    return <SettingsError message={settingsErrorMessage(error) || 'Could not load audit log.'} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-header mb-0 text-lg font-semibold">Audit log</h2>
        <p className="mt-1 text-sm text-muted-foreground">Recent administrative actions across settings and configuration.</p>
      </div>

      <SettingsSection title="Recent activity" description="Showing up to 100 entries.">
        {!data?.length ? (
          <EmptyState title="No audit entries" description="Settings changes and admin actions will appear here." />
        ) : (
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Action</th>
                <th>Resource</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>{log.resource}</td>
                  <td className="text-muted-foreground">{log.userEmail ?? '—'}</td>
                  <td className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>
    </div>
  );
}
