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
  const map: Record<string, string> = { sms: '📱', email: '✉️', portal: '🌐', internal: '💬' };
  return map[channel] ?? '💬';
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

export function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    low: 'text-muted-foreground',
    normal: 'text-foreground',
    high: 'text-orange-600',
    critical: 'text-red-600 font-semibold',
  };
  return map[priority] ?? '';
}
