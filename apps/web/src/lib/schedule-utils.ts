import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const SCHEDULE_NAV = [
  { href: '/app/schedule/dashboard', label: 'Dashboard' },
  { href: '/app/schedule/calendar', label: 'Calendar' },
  { href: '/app/schedule/dispatch', label: 'Dispatch' },
  { href: '/app/schedule/crews', label: 'Crews' },
  { href: '/app/schedule/routes', label: 'Routes' },
  { href: '/app/schedule/resources', label: 'Resources' },
  { href: '/app/schedule/availability', label: 'Availability' },
  { href: '/app/schedule/season-planning', label: 'Season' },
  { href: '/app/schedule/notifications', label: 'Notifications' },
];

export const DISPATCH_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  en_route: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-purple-100 text-purple-800',
  working: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  delayed: 'bg-red-100 text-red-800',
};

export function categoryLabel(category: string) {
  return category.replace(/_/g, ' ');
}
