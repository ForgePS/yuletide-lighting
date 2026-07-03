'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatDate } from '@clcrm/ui';
import { LoadingState, EmptyState } from '@/components/ui/states';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  sent: 'Sent',
  clicked: 'Opened',
  submitted: 'Google review',
  internal_feedback: 'Internal feedback',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  clicked: 'bg-amber-100 text-amber-800',
  submitted: 'bg-green-100 text-green-800',
  internal_feedback: 'bg-red-100 text-red-800',
};

export function ReviewsStatsCards() {
  const { data, isLoading } = trpc.reviews360.dashboard.useQuery();
  if (isLoading || !data) return <LoadingState message="Loading review stats..." />;

  const cards = [
    { label: 'Requests sent', value: String(data.requestsSent) },
    { label: 'Google reviews', value: String(data.reviewsCompleted) },
    { label: 'Internal feedback', value: String(data.internalFeedback) },
    { label: 'Pending follow-up', value: String(data.pendingFollowUp) },
    { label: 'Avg rating', value: data.avgRating != null ? `${data.avgRating}/5` : '—' },
    { label: 'Referrals used', value: `${data.referralsUsed}/${data.referralsIssued}` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ReviewRequestsTable() {
  const { data, isLoading } = trpc.reviews360.requests.list.useQuery();
  if (isLoading) return <LoadingState message="Loading review requests..." />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No review requests yet"
        description="Review requests are sent automatically when a crew member completes an install job."
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Rating</th>
            <th>Sent</th>
            <th>Referral</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>{r.customerName ?? r.customerId}</td>
              <td className="capitalize">{r.channel}</td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-muted'}`}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </td>
              <td>{r.rating != null ? `${r.rating}/5` : '—'}</td>
              <td>{r.sentAt ? formatDate(r.sentAt) : '—'}</td>
              <td className="font-mono text-xs">{r.referralCode ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReferralsTable() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.reviews360.referrals.list.useQuery();
  const markRewarded = trpc.reviews360.referrals.markRewarded.useMutation({
    onSuccess: () => {
      toast('Referral marked as rewarded', 'success');
      utils.reviews360.referrals.list.invalidate();
      utils.reviews360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const [customerId, setCustomerId] = useState('');
  const [rewardCents, setRewardCents] = useState('');
  const { data: customers } = trpc.customers.list.useQuery({ page: 1, pageSize: 100 });
  const createReferral = trpc.reviews360.referrals.create.useMutation({
    onSuccess: () => {
      toast('Referral code created', 'success');
      setCustomerId('');
      setRewardCents('');
      utils.reviews360.referrals.list.invalidate();
      utils.reviews360.dashboard.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState message="Loading referrals..." />;

  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!customerId) return;
          createReferral.mutate({
            customerId,
            rewardAmountCents: rewardCents ? Math.round(Number(rewardCents) * 100) : null,
          });
        }}
      >
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-muted-foreground">Customer</label>
          <select className="input mt-1 w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer...</option>
            {customers?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName || `${c.firstName} ${c.lastName}`}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="text-xs text-muted-foreground">Reward ($)</label>
          <input
            className="input mt-1 w-full"
            type="number"
            min="0"
            step="0.01"
            placeholder="25"
            value={rewardCents}
            onChange={(e) => setRewardCents(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!customerId || createReferral.isPending}>
          Issue code
        </button>
      </form>

      {!data?.length ? (
        <EmptyState title="No referral codes" description="Codes are auto-issued after install, or create one manually." />
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Referrer</th>
                <th>Status</th>
                <th>Reward</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono font-medium">{r.code}</td>
                  <td>{r.referringCustomerName ?? r.referringCustomerId}</td>
                  <td className="capitalize">{r.status}</td>
                  <td>{r.rewardAmountCents != null ? `$${(r.rewardAmountCents / 100).toFixed(2)}` : '—'}</td>
                  <td>{formatDate(r.issuedAt)}</td>
                  <td>
                    {r.status === 'used' && (
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={markRewarded.isPending}
                        onClick={() => markRewarded.mutate({ referralId: r.id })}
                      >
                        Mark rewarded
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ReviewsHub() {
  const [tab, setTab] = useState<'requests' | 'referrals'>('requests');

  return (
    <div className="space-y-6">
      <ReviewsStatsCards />
      <div className="flex gap-2 border-b border-border">
        {(['requests', 'referrals'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'requests' ? <ReviewRequestsTable /> : <ReferralsTable />}
    </div>
  );
}
