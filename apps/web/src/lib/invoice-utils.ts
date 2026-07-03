import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const INVOICE_NAV = [
  { href: '/app/invoices/dashboard', label: 'Dashboard' },
  { href: '/app/invoices', label: 'Invoices' },
  { href: '/app/invoices/payments', label: 'Payments' },
  { href: '/app/invoices/collections', label: 'Collections' },
  { href: '/app/invoices/aging', label: 'Aging' },
  { href: '/app/invoices/disputes', label: 'Disputes' },
  { href: '/app/invoices/reports', label: 'Reports' },
  { href: '/app/invoices/settings', label: 'Settings' },
];

export function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-indigo-100 text-indigo-800',
    pending_payment: 'bg-amber-100 text-amber-800',
    partially_paid: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-emerald-100 text-emerald-800',
    overdue: 'bg-red-100 text-red-800',
    in_collection: 'bg-orange-100 text-orange-800',
    disputed: 'bg-purple-100 text-purple-800',
    refunded: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-600',
    partial: 'bg-yellow-100 text-yellow-800',
    void: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-muted text-muted-foreground';
}

export function riskColor(level: string) {
  const map: Record<string, string> = {
    low: 'text-emerald-600',
    medium: 'text-amber-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  return map[level] ?? '';
}
