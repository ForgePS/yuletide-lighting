'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@clcrm/ui';
import { LoadingState } from '@/components/ui/states';

export function CommercialAccountDetail({ accountId }: { accountId: string }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.commercial360.accounts.getById.useQuery({ accountId });
  const updateAccount = trpc.commercial360.accounts.update.useMutation({
    onSuccess: () => { toast('Account updated', 'success'); refetch(); },
  });
  const addLocation = trpc.commercial360.locations.create.useMutation({
    onSuccess: () => { toast('Location added', 'success'); refetch(); setShowLocationForm(false); },
    onError: () => toast('Could not add location', 'error'),
  });
  const addContract = trpc.commercial360.contracts.create.useMutation({
    onSuccess: () => { toast('Contract added', 'success'); refetch(); setShowContractForm(false); },
    onError: () => toast('Could not add contract', 'error'),
  });
  const createProposal = trpc.commercial360.proposals.createMultiLocation.useMutation({
    onSuccess: (proposal) => {
      toast('Multi-location proposal created', 'success');
      if (proposal?.id) window.location.href = `/app/proposals/${proposal.id}`;
    },
    onError: () => toast('Could not create proposal', 'error'),
  });

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationForm, setLocationForm] = useState({
    name: '', addressLine1: '', city: '', state: '', postalCode: '', siteContactName: '', siteContactPhone: '', siteNotes: '',
  });
  const [contractForm, setContractForm] = useState({
    name: '', startDate: '', endDate: '', amountCents: '',
  });

  if (isLoading || !data) return <LoadingState message="Loading commercial account..." />;

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/commercial" className="text-sm text-muted-foreground hover:text-primary">← Commercial hub</Link>
          <h1 className="mt-1 text-2xl font-bold">{data.name}</h1>
          {data.customerName && (
            <Link href={`/app/customers/${data.customerId}`} className="text-sm text-primary hover:underline">
              {data.customerName}
            </Link>
          )}
          <p className="mt-1 text-sm text-muted-foreground capitalize">{data.status.replace(/_/g, ' ')} · {data.locationCount} location(s)</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Booked revenue</p>
          <p className="text-xl font-semibold">{formatCurrency(data.totalRevenueCents)}</p>
        </div>
      </div>

      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">Shared billing address</label>
          <input
            defaultValue={data.billingAddress ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (data.billingAddress ?? '')) {
                updateAccount.mutate({ accountId, billingAddress: e.target.value });
              }
            }}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Account manager</label>
          <input
            defaultValue={data.accountManagerName ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (data.accountManagerName ?? '')) {
                updateAccount.mutate({ accountId, accountManagerName: e.target.value });
              }
            }}
            className="input mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Notes</label>
          <textarea
            defaultValue={data.notes ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (data.notes ?? '')) {
                updateAccount.mutate({ accountId, notes: e.target.value });
              }
            }}
            className="input mt-1 min-h-[80px]"
          />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Locations</h2>
          <div className="flex gap-2">
            {selectedLocationIds.length > 0 && (
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={createProposal.isPending}
                onClick={() =>
                  createProposal.mutate({
                    accountId,
                    locationIds: selectedLocationIds,
                    title: `${data.name} — ${selectedLocationIds.length} site proposal`,
                  })
                }
              >
                Create multi-location proposal
              </button>
            )}
            <button type="button" className="btn-primary text-sm" onClick={() => setShowLocationForm(!showLocationForm)}>
              {showLocationForm ? 'Cancel' : 'Add location'}
            </button>
          </div>
        </div>
        {showLocationForm && (
          <form
            className="card grid gap-3 p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              addLocation.mutate({ accountId, ...locationForm });
            }}
          >
            <input required placeholder="Site name *" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} className="input" />
            <input required placeholder="Address *" value={locationForm.addressLine1} onChange={(e) => setLocationForm({ ...locationForm, addressLine1: e.target.value })} className="input" />
            <input required placeholder="City *" value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} className="input" />
            <input required placeholder="State *" value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} className="input" />
            <input required placeholder="ZIP *" value={locationForm.postalCode} onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value })} className="input" />
            <input placeholder="Site contact" value={locationForm.siteContactName} onChange={(e) => setLocationForm({ ...locationForm, siteContactName: e.target.value })} className="input" />
            <input placeholder="Site phone" value={locationForm.siteContactPhone} onChange={(e) => setLocationForm({ ...locationForm, siteContactPhone: e.target.value })} className="input" />
            <textarea placeholder="Site notes" value={locationForm.siteNotes} onChange={(e) => setLocationForm({ ...locationForm, siteNotes: e.target.value })} className="input sm:col-span-2" />
            <button type="submit" className="btn-primary sm:col-span-2" disabled={addLocation.isPending}>Save location</button>
          </form>
        )}
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Site</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Maintenance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.locations.map((loc) => (
                <tr key={loc.id}>
                  <td>
                    <input type="checkbox" checked={selectedLocationIds.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
                  </td>
                  <td className="font-medium">{loc.name}</td>
                  <td className="text-muted-foreground">{loc.addressLine1}, {loc.city} {loc.state}</td>
                  <td className="text-sm">
                    {loc.siteContactName ?? '—'}
                    {loc.siteContactPhone && <p className="text-xs text-muted-foreground">{loc.siteContactPhone}</p>}
                  </td>
                  <td className="text-sm text-muted-foreground">{loc.maintenanceScheduleNotes ?? '—'}</td>
                  <td>
                    {loc.propertyId && (
                      <Link href={`/app/properties`} className="text-xs text-primary hover:underline">Property</Link>
                    )}
                  </td>
                </tr>
              ))}
              {!data.locations.length && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Add locations for this commercial account.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between">
          <h2 className="font-semibold">Recurring contracts</h2>
          <button type="button" className="btn-primary text-sm" onClick={() => setShowContractForm(!showContractForm)}>
            {showContractForm ? 'Cancel' : 'Add contract'}
          </button>
        </div>
        {showContractForm && (
          <form
            className="card grid gap-3 p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              addContract.mutate({
                accountId,
                name: contractForm.name,
                startDate: new Date(contractForm.startDate),
                endDate: new Date(contractForm.endDate),
                amountCents: Math.round(Number(contractForm.amountCents) * 100),
                status: 'active',
              });
            }}
          >
            <input required placeholder="Contract name *" value={contractForm.name} onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })} className="input sm:col-span-2" />
            <input required type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className="input" />
            <input required type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className="input" />
            <input required type="number" min={0} step={0.01} placeholder="Annual amount ($)" value={contractForm.amountCents} onChange={(e) => setContractForm({ ...contractForm, amountCents: e.target.value })} className="input sm:col-span-2" />
            <button type="submit" className="btn-primary sm:col-span-2" disabled={addContract.isPending}>Save contract</button>
          </form>
        )}
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr><th>Contract</th><th>Period</th><th>Amount</th><th>Status</th><th>Renewal</th></tr>
            </thead>
            <tbody>
              {data.contracts.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-muted-foreground">{c.startDate.toLocaleDateString()} – {c.endDate.toLocaleDateString()}</td>
                  <td>{formatCurrency(c.amountCents)}</td>
                  <td className="capitalize">{c.status.replace(/_/g, ' ')}</td>
                  <td className="text-muted-foreground">{c.renewalDate?.toLocaleDateString() ?? '—'}</td>
                </tr>
              ))}
              {!data.contracts.length && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No contracts on file.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
