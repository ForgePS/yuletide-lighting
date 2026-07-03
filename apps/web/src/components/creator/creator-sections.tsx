'use client';

import { useRouter } from 'next/navigation';
import { formatCurrency } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';
import { SubscriptionControlPanel } from './subscription-control-panel';
import { statusBadgeClass } from './creator-ui';

export function CreatorOrganizationDetailPage({ orgId }: { orgId: string }) {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.creator360.organizations.get.useQuery({ organizationId: orgId });

  if (isLoading || !data) return <div className="card h-64 animate-pulse bg-muted/50" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => router.push('/creator/organizations')}>
            ← Organizations
          </button>
          <h1 className="mt-2 text-2xl font-bold">{data.companyName}</h1>
          <p className="text-sm text-muted-foreground">{data.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClass(data.subscriptionStatus, data.isLocked)}`}>
          {data.isLocked ? 'locked' : data.subscriptionStatus}
        </span>
      </div>

      <SubscriptionControlPanel org={data} onUpdated={() => refetch()} />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Users', value: data.userCount },
          { label: 'Customers', value: data.customerCount },
          { label: 'Proposals', value: data.proposalCount },
          { label: 'Jobs', value: data.jobCount },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Team members</h2>
          <ul className="mt-4 space-y-2">
            {data.users.map((user) => (
              <li key={user.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                <span>{user.email}</span>
                <span className="text-muted-foreground capitalize">{user.role.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Stripe</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Customer</dt><dd className="truncate font-mono text-xs">{data.stripeCustomerId ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subscription</dt><dd className="truncate font-mono text-xs">{data.stripeSubscriptionId ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">MRR</dt><dd>{formatCurrency(data.mrrCents)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Access</dt><dd className={data.hasAccess ? 'text-emerald-700' : 'text-red-700'}>{data.hasAccess ? 'Yes' : 'No'}</dd></div>
          </dl>
        </div>
      </div>

      {data.recentPayments.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold">Recent payments</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentPayments.map((p) => (
              <li key={p.id} className="flex justify-between border-b py-2 last:border-0">
                <span>{p.paidAt.toLocaleDateString()} · {p.status}</span>
                <span className="font-medium">{formatCurrency(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
