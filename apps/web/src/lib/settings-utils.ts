export const SETTINGS_NAV = [
  { href: '/app/settings', label: 'Overview' },
  { href: '/app/settings/company', label: 'Company' },
  { href: '/app/settings/users', label: 'Users' },
  { href: '/app/settings/roles', label: 'Roles' },
  { href: '/app/settings/branding', label: 'Branding' },
  { href: '/app/settings/templates', label: 'Templates' },
  { href: '/app/settings/season', label: 'Season' },
  { href: '/app/settings/notifications', label: 'Notifications' },
  { href: '/app/settings/automation', label: 'Automation' },
  { href: '/app/settings/proposals', label: 'Proposals' },
  { href: '/app/settings/invoices', label: 'Invoices' },
  { href: '/app/settings/jobs', label: 'Jobs' },
  { href: '/app/settings/inventory', label: 'Inventory' },
  { href: '/app/settings/customer-portal', label: 'Portal' },
  { href: '/app/settings/integrations', label: 'Integrations' },
  { href: '/app/settings/import', label: 'Data import' },
  { href: '/app/settings/subscription', label: 'Subscription' },
  { href: '/app/settings/ai', label: 'AI' },
  { href: '/app/settings/security', label: 'Security' },
  { href: '/app/settings/reports', label: 'Reports' },
  { href: '/app/settings/system', label: 'System' },
];

export const SETTINGS_ROLES = [
  'owner', 'administrator', 'sales_manager', 'sales_rep', 'operations_manager',
  'dispatcher', 'crew_leader', 'installer', 'warehouse_staff', 'office_staff', 'read_only',
] as const;

export const USER_STATUSES = ['active', 'suspended', 'pending', 'archived'] as const;

export function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function healthColor(health: string) {
  if (health === 'healthy') return 'text-emerald-600';
  if (health === 'degraded') return 'text-amber-600';
  return 'text-red-600';
}
