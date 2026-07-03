'use client';

import { trpc } from '@/lib/trpc';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { MessagingDashboardKpis } from '@clcrm/types';

export function MessagingDashboard({ kpis }: { kpis?: MessagingDashboardKpis }) {
  if (!kpis) return null;
  const cards = [
    { label: 'Sent today', value: String(kpis.messagesSentToday) },
    { label: 'Delivered', value: String(kpis.messagesDelivered) },
    { label: 'Opened', value: String(kpis.messagesOpened) },
    { label: 'SMS responses', value: String(kpis.smsResponses) },
    { label: 'Email responses', value: String(kpis.emailResponses) },
    { label: 'Active conversations', value: String(kpis.activeConversations) },
    { label: 'Automation sent', value: String(kpis.automationMessagesSent) },
    { label: 'Review requests', value: String(kpis.reviewRequestsSent) },
    { label: 'Reviews received', value: String(kpis.reviewsReceived) },
    { label: 'Renewal revenue', value: `$${(kpis.renewalCampaignRevenueCents / 100).toFixed(0)}` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-lg font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function MessagingDashboardPage() {
  const { data, isLoading, isError, refetch } = trpc.messages360.dashboard.useQuery();
  const { data: notifications } = trpc.messages360.notifications.list.useQuery();

  if (isLoading) return <LoadingState message="Loading messaging dashboard..." />;
  if (isError || !data) return <ErrorState message="Could not load dashboard." onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <MessagingDashboard kpis={data} />
      {notifications && notifications.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold">Recent notifications</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="flex justify-between border-b border-border py-2">
                <span>{n.title}</span>
                <span className="text-muted-foreground capitalize">{n.channel} · {n.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
