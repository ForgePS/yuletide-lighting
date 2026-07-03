'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@clcrm/ui';
import { LoadingState } from '@/components/ui/states';

const STATUS_COLORS: Record<string, string> = {
  not_sent: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  opened: 'bg-indigo-100 text-indigo-800',
  rebooked: 'bg-green-100 text-green-800',
  upgrade_requested: 'bg-purple-100 text-purple-800',
  declined: 'bg-red-100 text-red-800',
  no_response: 'bg-amber-100 text-amber-800',
};

export function RebookingForecastCards() {
  const { data, isLoading } = trpc.rebooking360.dashboard.useQuery();
  if (isLoading || !data) return <LoadingState message="Loading rebooking stats..." />;

  const cards = [
    { label: 'Target customers', value: String(data.totalTargets) },
    { label: 'Not contacted', value: String(data.notSent) },
    { label: 'Outreach sent', value: String(data.sent) },
    { label: 'Rebooked', value: String(data.rebooked) },
    { label: 'Projected revenue', value: formatCurrency(data.projectedRevenueCents) },
    { label: 'Booked revenue', value: formatCurrency(data.bookedRevenueCents) },
    { label: 'Conversion', value: `${data.conversionRatePercent}%` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function RebookingCustomerTable({ campaignId }: { campaignId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.rebooking360.campaigns.records.useQuery({ campaignId });
  const send = trpc.rebooking360.records.send.useMutation({ onSuccess: () => refetch() });
  const rebook = trpc.rebooking360.records.processRebook.useMutation({
    onSuccess: () => { refetch(); utils.rebooking360.dashboard.invalidate(); },
  });
  const update = trpc.rebooking360.records.update.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <LoadingState message="Loading customers..." />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No customers in this campaign yet. Import from prior season.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full text-sm">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Prior proposal</th>
            <th>Projected</th>
            <th>Booked</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/app/customers/${row.customerId}`} className="font-medium hover:text-primary hover:underline">
                  {row.customerName}
                </Link>
                {row.customerEmail && <p className="text-xs text-muted-foreground">{row.customerEmail}</p>}
              </td>
              <td className="text-muted-foreground">{row.previousProposalTitle ?? '—'}</td>
              <td>{formatCurrency(row.projectedValueCents)}</td>
              <td>{row.bookedValueCents ? formatCurrency(row.bookedValueCents) : '—'}</td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[row.status] ?? ''}`}>
                  {row.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td>
                <div className="flex flex-wrap gap-2">
                  {row.status === 'not_sent' && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => send.mutate({ recordId: row.id })}>Send</button>
                  )}
                  {row.status !== 'rebooked' && row.status !== 'declined' && (
                    <button type="button" className="text-xs text-green-600 hover:underline" onClick={() => rebook.mutate({ recordId: row.id, sameDesign: true })}>Rebook</button>
                  )}
                  {row.newProposalId && (
                    <Link href={`/app/proposals/${row.newProposalId}`} className="text-xs text-primary hover:underline">Proposal</Link>
                  )}
                  {row.status !== 'declined' && (
                    <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => update.mutate({ recordId: row.id, status: 'declined' })}>Decline</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RebookingDashboard() {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.rebooking360.campaigns.list.useQuery();
  const create = trpc.rebooking360.campaigns.create.useMutation({
    onSuccess: () => utils.rebooking360.campaigns.list.invalidate(),
  });
  const populate = trpc.rebooking360.campaigns.populate.useMutation({
    onSuccess: () => utils.rebooking360.invalidate(),
  });
  const updateCampaign = trpc.rebooking360.campaigns.update.useMutation({
    onSuccess: () => utils.rebooking360.campaigns.list.invalidate(),
  });

  const nextYear = new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0);

  return (
    <div className="space-y-8">
      <RebookingForecastCards />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={create.isPending}
          onClick={() => create.mutate({ seasonYear: nextYear })}
        >
          Create {nextYear} campaign
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !campaigns?.length ? (
        <p className="text-sm text-muted-foreground">Create a campaign to start rebooking last season&apos;s customers.</p>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/app/rebooking/campaigns/${c.id}`} className="text-lg font-semibold hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-sm text-muted-foreground capitalize">{c.status} · {c.targetCustomerIds.length} targets</p>
                </div>
                <div className="text-right text-sm">
                  <p>{formatCurrency(c.totalBookedRevenueCents)} booked</p>
                  <p className="text-muted-foreground">{formatCurrency(c.totalProjectedRevenueCents)} projected</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" disabled={populate.isPending} onClick={() => populate.mutate({ campaignId: c.id })}>
                  Import prior season
                </button>
                {c.status === 'draft' && (
                  <button type="button" className="btn-primary text-xs" onClick={() => updateCampaign.mutate({ campaignId: c.id, status: 'active' })}>
                    Activate
                  </button>
                )}
                <Link href={`/app/rebooking/campaigns/${c.id}`} className="btn-secondary text-xs">Manage</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
