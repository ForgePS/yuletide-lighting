/** Per-org CRM UI configuration — nav, labels, theme overrides. */

import type { CrmPlatformModuleKey } from './creator';
import type { PermissionMatrix, PermissionResource } from './settings';

export type CrmNavItemKey =
  | 'dashboard'
  | 'pipeline'
  | 'customers'
  | 'properties'
  | 'contacts'
  | 'agreements'
  | 'proposals'
  | 'invoices'
  | 'inventory'
  | 'project_prep'
  | 'jobs'
  | 'crew'
  | 'service_issues'
  | 'messages'
  | 'automation'
  | 'reviews'
  | 'sign_tracker'
  | 'schedule'
  | 'time_clock'
  | 'routes'
  | 'mockups'
  | 'rebooking'
  | 'storage'
  | 'commercial'
  | 'reports'
  | 'settings';

export type CrmNavSection =
  | 'home'
  | 'sales'
  | 'operations'
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'administration';

export const CRM_NAV_SECTION_LABELS: Record<CrmNavSection, string> = {
  home: 'Home',
  sales: 'Sales & Customers',
  operations: 'Operations',
  inventory: 'Inventory & Storage',
  finance: 'Finance',
  marketing: 'Marketing',
  administration: 'Administration',
};

export const CRM_NAV_SECTION_ORDER: CrmNavSection[] = [
  'home',
  'sales',
  'operations',
  'inventory',
  'finance',
  'marketing',
  'administration',
];

export type CrmNavItemConfig = {
  key: CrmNavItemKey;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
  section: CrmNavSection;
  /** Module gate — if set, item hidden when module disabled for org */
  moduleKey?: CrmPlatformModuleKey | null;
  /** Optional permission resource required to view this nav item */
  permissionResource?: PermissionResource | null;
};

export type CrmLabelOverrides = Record<string, string>;

export type CrmSidebarLogoAlign = 'left' | 'center' | 'right';

export type CrmUiThemeOverrides = {
  sidebarBackground?: string | null;
  sidebarText?: string | null;
  accentColor?: string | null;
  useOrgBrandingInApp?: boolean;
  /** Sidebar header logo height in pixels (28–96). */
  sidebarLogoSizePx?: number | null;
  /** Horizontal alignment of the sidebar logo. */
  sidebarLogoAlign?: CrmSidebarLogoAlign | null;
};

export type CrmCustomFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';

export type CrmCustomFieldDefinition = {
  id: string;
  entity: 'customer' | 'property' | 'job' | 'proposal' | 'invoice' | 'contact';
  key: string;
  label: string;
  type: CrmCustomFieldType;
  required: boolean;
  options?: string[];
  enabled: boolean;
  order: number;
};

export type CrmUiConfig = {
  navItems: CrmNavItemConfig[];
  labelOverrides: CrmLabelOverrides;
  theme: CrmUiThemeOverrides;
  customFields: CrmCustomFieldDefinition[];
  updatedAt: Date;
};

export const DEFAULT_CRM_NAV_ITEMS: CrmNavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/app', enabled: true, order: 0, section: 'home' },
  { key: 'pipeline', label: 'Leads & Pipeline', href: '/app/pipeline', enabled: true, order: 1, section: 'sales', moduleKey: 'pipeline', permissionResource: 'customers' },
  { key: 'customers', label: 'Customers', href: '/app/customers', enabled: true, order: 2, section: 'sales', moduleKey: 'customers', permissionResource: 'customers' },
  { key: 'contacts', label: 'Contacts', href: '/app/contacts', enabled: true, order: 3, section: 'sales', moduleKey: 'customers', permissionResource: 'customers' },
  { key: 'properties', label: 'Properties', href: '/app/properties', enabled: true, order: 4, section: 'sales', moduleKey: 'customers', permissionResource: 'customers' },
  { key: 'mockups', label: 'Mockups', href: '/app/mockups', enabled: true, order: 5, section: 'sales', moduleKey: 'mockups', permissionResource: 'mockups' },
  { key: 'proposals', label: 'Proposals', href: '/app/proposals', enabled: true, order: 6, section: 'sales', moduleKey: 'proposals', permissionResource: 'proposals' },
  { key: 'agreements', label: 'Agreements', href: '/app/agreements', enabled: true, order: 7, section: 'sales', permissionResource: 'proposals' },
  { key: 'commercial', label: 'Commercial Accounts', href: '/app/commercial', enabled: true, order: 8, section: 'sales', moduleKey: 'commercial', permissionResource: 'customers' },
  { key: 'rebooking', label: 'Rebooking', href: '/app/rebooking', enabled: true, order: 9, section: 'sales', moduleKey: 'rebooking', permissionResource: 'customers' },
  { key: 'jobs', label: 'Jobs', href: '/app/jobs', enabled: true, order: 10, section: 'operations', moduleKey: 'jobs', permissionResource: 'jobs' },
  { key: 'project_prep', label: 'Project Prep', href: '/app/project-prep', enabled: true, order: 11, section: 'operations', moduleKey: 'jobs', permissionResource: 'jobs' },
  { key: 'schedule', label: 'Schedule', href: '/app/schedule', enabled: true, order: 12, section: 'operations', moduleKey: 'schedule', permissionResource: 'jobs' },
  { key: 'routes', label: 'Routes', href: '/app/routes', enabled: true, order: 13, section: 'operations', moduleKey: 'routes', permissionResource: 'jobs' },
  { key: 'crew', label: 'Crew', href: '/app/crew', enabled: true, order: 14, section: 'operations', moduleKey: 'crew', permissionResource: 'jobs' },
  { key: 'service_issues', label: 'Service Issues', href: '/app/service-issues', enabled: true, order: 15, section: 'operations', moduleKey: 'jobs', permissionResource: 'jobs' },
  { key: 'time_clock', label: 'Time Clock', href: '/app/time-clock', enabled: true, order: 16, section: 'operations', moduleKey: 'time_clock', permissionResource: 'jobs' },
  { key: 'storage', label: 'Customer Storage', href: '/app/storage', enabled: true, order: 17, section: 'inventory', moduleKey: 'storage', permissionResource: 'inventory' },
  { key: 'inventory', label: 'Inventory', href: '/app/inventory', enabled: true, order: 18, section: 'inventory', moduleKey: 'inventory', permissionResource: 'inventory' },
  { key: 'invoices', label: 'Invoices', href: '/app/invoices', enabled: true, order: 19, section: 'finance', moduleKey: 'invoices', permissionResource: 'invoices' },
  { key: 'messages', label: 'Messages', href: '/app/messages', enabled: true, order: 20, section: 'marketing', moduleKey: 'messages' },
  { key: 'reviews', label: 'Reviews & Referrals', href: '/app/reviews', enabled: true, order: 21, section: 'marketing', moduleKey: 'reviews' },
  { key: 'sign_tracker', label: 'Sign Tracker', href: '/app/marketing/sign-tracker', enabled: true, order: 22, section: 'marketing', moduleKey: 'sign_tracker', permissionResource: 'sign_tracker' },
  { key: 'automation', label: 'Automation', href: '/app/automation', enabled: true, order: 23, section: 'administration', moduleKey: 'automation' },
  { key: 'reports', label: 'Reports', href: '/app/reports', enabled: true, order: 24, section: 'administration', moduleKey: 'reports', permissionResource: 'reports' },
  { key: 'settings', label: 'Settings', href: '/app/settings', enabled: true, order: 25, section: 'administration' },
];

export const DEFAULT_CRM_UI_CONFIG: CrmUiConfig = {
  navItems: DEFAULT_CRM_NAV_ITEMS,
  labelOverrides: {},
  theme: {
    sidebarBackground: null,
    sidebarText: null,
    accentColor: null,
    useOrgBrandingInApp: false,
    sidebarLogoSizePx: 44,
    sidebarLogoAlign: 'left',
  },
  customFields: [],
  updatedAt: new Date(0),
};

function withSectionDefaults(item: CrmNavItemConfig): CrmNavItemConfig {
  if (item.section) return item;
  const fromDefault = DEFAULT_CRM_NAV_ITEMS.find((d) => d.key === item.key);
  return { ...item, section: fromDefault?.section ?? 'administration' };
}

/** Resolve visible nav for an org given modules + UI config (+ optional permissions). Fail closed on modules. */
export function resolveCrmNavItems(
  config: CrmUiConfig,
  enabledModules: CrmPlatformModuleKey[] | null | undefined,
  permissions?: PermissionMatrix | null,
): CrmNavItemConfig[] {
  const modules = Array.isArray(enabledModules) ? new Set(enabledModules) : new Set<CrmPlatformModuleKey>();
  return [...config.navItems]
    .map(withSectionDefaults)
    .filter((item) => item.enabled)
    .filter((item) => !item.moduleKey || modules.has(item.moduleKey))
    .filter((item) => {
      if (!permissions || !item.permissionResource) return true;
      // Settings: owners/admins often have view; if matrix lacks view but has edit, still show
      const res = item.permissionResource;
      return permissions[res]?.view || permissions[res]?.edit || permissions[res]?.create;
    })
    .sort((a, b) => a.order - b.order);
}

export function groupNavItemsBySection(items: CrmNavItemConfig[]) {
  const groups: Array<{ section: CrmNavSection; label: string; items: CrmNavItemConfig[] }> = [];
  for (const section of CRM_NAV_SECTION_ORDER) {
    const sectionItems = items.filter((i) => i.section === section);
    if (!sectionItems.length) continue;
    groups.push({ section, label: CRM_NAV_SECTION_LABELS[section], items: sectionItems });
  }
  return groups;
}
