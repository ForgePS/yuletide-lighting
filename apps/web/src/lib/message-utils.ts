import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const MESSAGE_NAV = [
  { href: '/app/messages/dashboard', label: 'Dashboard' },
  { href: '/app/messages/sms', label: 'SMS' },
  { href: '/app/messages/inbox', label: 'Inbox' },
  { href: '/app/messages/conversations', label: 'Conversations' },
  { href: '/app/messages/campaigns', label: 'Campaigns' },
  { href: '/app/messages/templates', label: 'Templates' },
  { href: '/app/messages/automations', label: 'Automations' },
  { href: '/app/messages/internal', label: 'Internal' },
  { href: '/app/messages/reviews', label: 'Reviews' },
  { href: '/app/messages/settings', label: 'Settings' },
];

export function channelIcon(channel: string) {
  const map: Record<string, string> = { sms: 'SMS', email: 'Email', portal: 'Portal', internal: 'Internal' };
  return map[channel] ?? channel;
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    waiting_on_customer: 'bg-amber-100 text-amber-800',
    waiting_on_staff: 'bg-orange-100 text-orange-800',
    closed: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-muted text-muted-foreground';
}

/** YL-S26 — outbound delivery honesty (recorded ≠ provider-sent). */
export function deliveryStatusBadge(status: string | null | undefined) {
  const key = String(status ?? '').toLowerCase();
  const map: Record<string, string> = {
    recorded: 'bg-amber-100 text-amber-900',
    queued: 'bg-slate-100 text-slate-700',
    sent: 'bg-emerald-100 text-emerald-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    scheduled: 'bg-blue-100 text-blue-800',
  };
  return map[key] ?? 'bg-muted text-muted-foreground';
}

export function deliveryStatusLabel(status: string | null | undefined) {
  const key = String(status ?? '').toLowerCase();
  if (key === 'recorded') return 'Recorded only (not sent to carrier)';
  if (key === 'sent') return 'Sent';
  if (key === 'delivered') return 'Delivered';
  if (key === 'failed') return 'Failed';
  if (key === 'queued') return 'Queued';
  if (key === 'scheduled') return 'Scheduled';
  if (!key) return 'Unknown';
  return key.replace(/_/g, ' ');
}

export function outboundSendToast(status: string | null | undefined, channel = 'Message') {
  if (String(status ?? '').toLowerCase() === 'recorded') {
    return `${channel} saved in CRM (record-only — provider delivery is off)`;
  }
  if (String(status ?? '').toLowerCase() === 'queued') {
    return `${channel} scheduled`;
  }
  if (String(status ?? '').toLowerCase() === 'sent') {
    return `${channel} sent`;
  }
  return `${channel} saved (${status ?? 'unknown'})`;
}

export function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    low: 'text-muted-foreground',
    normal: 'text-foreground',
    high: 'text-orange-600',
    critical: 'text-red-600 font-semibold',
  };
  return map[priority] ?? '';
}
