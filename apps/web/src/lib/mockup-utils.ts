import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const MOCKUP_NAV = [
  { href: '/app/mockups/dashboard', label: 'Dashboard' },
  { href: '/app/mockups/new', label: 'New design' },
  { href: '/app/mockups/templates', label: 'Templates' },
  { href: '/app/mockups/library', label: 'Library' },
  { href: '/app/mockups/measurements', label: 'Measurements' },
  { href: '/app/mockups/export', label: 'Export' },
  { href: '/app/mockups/ai', label: 'AI Studio' },
];

export const LIGHT_TYPE_LABELS: Record<string, string> = {
  c7: 'C7', c9: 'C9', rgb: 'RGB', permanent: 'Permanent', mini: 'Mini', custom: 'Custom',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-gray-100 text-gray-600',
};
