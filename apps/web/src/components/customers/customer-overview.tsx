'use client';

import { useState } from 'react';
import type { CustomerInsights, CustomerOverviewStats } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { formatCurrency, healthBadgeClass, labelHealthRating } from '@/lib/customer360-utils';

export function CustomerOverviewWidgets({ stats }: { stats: CustomerOverviewStats }) {
  const widgets = [
    { label: 'Lifetime revenue', value: formatCurrency(stats.lifetimeRevenueCents) },
    { label: 'Current season', value: formatCurrency(stats.currentSeasonRevenueCents) },
    { label: 'Outstanding balance', value: formatCurrency(stats.outstandingBalanceCents) },
    { label: 'Avg annual spend', value: formatCurrency(stats.averageAnnualSpendCents) },
    { label: 'Total quotes', value: String(stats.totalQuotes) },
    { label: 'Total jobs', value: String(stats.totalJobs) },
    { label: 'Installs', value: String(stats.totalInstalls) },
    { label: 'Takedowns', value: String(stats.totalTakedowns) },
    { label: 'Service calls', value: String(stats.totalServiceCalls) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {widgets.map((w) => (
        <div key={w.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{w.label}</p>
          <p className="mt-1 text-lg font-semibold">{w.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CustomerInsightsCard({ insights }: { insights: CustomerInsights }) {
  return (
    <div className="card p-6">
      <h2 className="font-semibold">Customer insights</h2>
      <div className="mt-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Health score</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthBadgeClass(insights.healthRating)}`}
          >
            {insights.healthScore} · {labelHealthRating(insights.healthRating)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Renewal probability</span>
          <span className="font-medium">{insights.renewalProbability}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Churn risk</span>
          <span className="font-medium capitalize">{insights.churnRisk}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Revenue forecast</span>
          <span className="font-medium">{formatCurrency(insights.revenueForecastCents)}</span>
        </div>
        <div>
          <p className="text-muted-foreground">Recommended next action</p>
          <p className="mt-1 font-medium">{insights.recommendedNextAction}</p>
        </div>
        {insights.suggestedUpsells.length > 0 && (
          <div>
            <p className="text-muted-foreground">Suggested upsells</p>
            <ul className="mt-1 list-inside list-disc">
              {insights.suggestedUpsells.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerPortalCard({
  customerId,
  portal,
}: {
  customerId: string;
  portal: {
    enabled: boolean;
    status?: string;
    inviteSentAt?: Date | null;
    lastLoginAt?: Date | null;
    accessUrl?: string | null;
    accessLinkPlaceholder: string;
  };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: accountView, refetch } = trpc.portal360.getAccount.useQuery({ customerId });
  const enable = trpc.portal360.enable.useMutation({
    onSuccess: (result) => {
      toast('Portal enabled — copy the access link for your customer', 'success');
      utils.customer360.getById.invalidate({ customerId });
      refetch();
      if (result.accessUrl) setIssuedLink(result.accessUrl);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const revoke = trpc.portal360.revoke.useMutation({
    onSuccess: () => {
      toast('Portal access revoked', 'success');
      utils.customer360.getById.invalidate({ customerId });
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const suspend = trpc.portal360.suspend.useMutation({
    onSuccess: () => {
      toast('Portal suspended', 'success');
      utils.customer360.getById.invalidate({ customerId });
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const invite = trpc.portal360.invite.useMutation({
    onSuccess: (result) => {
      if (result.accessUrl) setIssuedLink(result.accessUrl);
      utils.customer360.getById.invalidate({ customerId });
      refetch();
      if (result.sent) {
        toast(`Invite emailed to ${result.email}`, 'success');
      } else {
        toast(
          result.reason
            ? `Portal ready — ${result.reason}`
            : 'Portal ready — copy the link to share',
          'success',
        );
      }
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const rotate = trpc.portal360.rotateToken.useMutation({
    onSuccess: (result) => {
      toast('Access link rotated — share the new link', 'success');
      utils.customer360.getById.invalidate({ customerId });
      refetch();
      setIssuedLink(result.accessUrl);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const view = accountView ?? portal;
  /** One-time raw access URL held only in component state after enable/rotate/invite. */
  const [issuedLink, setIssuedLink] = useState<string | null>(null);

  async function copyLink() {
    if (!issuedLink) {
      toast('Generate or rotate an access link first — stored links are not recoverable.', 'error');
      return;
    }
    await navigator.clipboard.writeText(issuedLink);
    toast('Link copied', 'success');
  }

  const enabled = view.enabled;
  const status =
    ('status' in view ? view.status : portal.status) ?? (enabled ? 'active' : 'not_invited');
  const busy =
    enable.isPending ||
    revoke.isPending ||
    suspend.isPending ||
    rotate.isPending ||
    invite.isPending;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold">Customer portal</h2>
        {!enabled && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={busy}
              onClick={() => enable.mutate({ customerId })}
            >
              {enable.isPending ? 'Enabling…' : 'Enable portal'}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={busy}
              onClick={() => invite.mutate({ customerId })}
            >
              {invite.isPending ? 'Sending…' : 'Enable & email invite'}
            </button>
          </div>
        )}
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Portal enabled</dt>
          <dd className="font-medium">{enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium capitalize">{String(status).replace(/_/g, ' ')}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Invite sent</dt>
          <dd>{view.inviteSentAt ? new Date(view.inviteSentAt).toLocaleDateString() : '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Last login</dt>
          <dd>{view.lastLoginAt ? new Date(view.lastLoginAt).toLocaleDateString() : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Access link</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {issuedLink ??
              (enabled
                ? 'Not shown — generate or rotate to create a one-time access link.'
                : (view.accessLinkPlaceholder ?? '/portal/login'))}
          </dd>
          {enabled && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={!issuedLink}
                onClick={copyLink}
              >
                Copy link
              </button>
              {issuedLink ? (
                <a
                  href={issuedLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs"
                >
                  Open portal
                </a>
              ) : null}
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => invite.mutate({ customerId })}
              >
                {invite.isPending ? 'Sending…' : 'Send new access link'}
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => rotate.mutate({ customerId })}
              >
                Rotate access link
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={busy}
                onClick={() => suspend.mutate({ customerId })}
              >
                Suspend
              </button>
              <button
                type="button"
                className="btn-ghost text-xs text-red-600"
                disabled={busy}
                onClick={() => revoke.mutate({ customerId })}
              >
                Revoke
              </button>
            </div>
          )}
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Customers can view proposals, pay invoices, see install schedules, request service, and
        rebook for next season. Access links are issued once on enable/rotate and cannot be
        retrieved later from stored account data.
      </p>
    </div>
  );
}
