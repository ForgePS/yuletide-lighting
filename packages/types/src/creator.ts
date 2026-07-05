import type { SubscriptionPlan, SubscriptionStatus } from './billing';

export type PlatformAuditAction =
  | 'org_subscription_update'
  | 'org_trial_extend'
  | 'org_subscription_preset'
  | 'org_lock'
  | 'org_unlock'
  | 'org_provision'
  | 'org_modules_update'
  | 'platform_settings_update'
  | 'org_note';

export type CreatorSubscriptionPreset =
  | 'start_trial'
  | 'activate_monthly'
  | 'activate_yearly'
  | 'complimentary'
  | 'mark_past_due'
  | 'cancel'
  | 'reactivate';

export type PlatformAuditLogEntry = {
  id: string;
  action: PlatformAuditAction;
  actorEmail: string;
  actorUserId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  details?: Record<string, unknown>;
  createdAt: Date;
};

export type CrmPlatformModuleKey =
  | 'pipeline'
  | 'customers'
  | 'proposals'
  | 'invoices'
  | 'inventory'
  | 'jobs'
  | 'crew'
  | 'schedule'
  | 'messages'
  | 'mockups'
  | 'reports'
  | 'automation'
  | 'commercial'
  | 'storage'
  | 'rebooking'
  | 'reviews'
  | 'time_clock'
  | 'routes';

export const CRM_PLATFORM_MODULES: Array<{ key: CrmPlatformModuleKey; label: string; description: string }> = [
  { key: 'pipeline', label: 'Pipeline', description: 'Sales pipeline and lead tracking' },
  { key: 'customers', label: 'Customers', description: 'Customer CRM and properties' },
  { key: 'proposals', label: 'Proposals', description: 'Proposals, packages, and templates' },
  { key: 'invoices', label: 'Invoices', description: 'Billing, payments, and collections' },
  { key: 'inventory', label: 'Inventory', description: 'Warehouse, trucks, and stock' },
  { key: 'jobs', label: 'Jobs', description: 'Install and service job management' },
  { key: 'crew', label: 'Crew', description: 'Crew assignments and field jobs' },
  { key: 'schedule', label: 'Schedule', description: 'Calendar, dispatch, and routes' },
  { key: 'messages', label: 'Messages', description: 'SMS, email, and campaigns' },
  { key: 'mockups', label: 'Mockups', description: 'Design mockups and AI visuals' },
  { key: 'reports', label: 'Reports', description: 'Reports360 analytics' },
  { key: 'automation', label: 'Automation', description: 'Workflow automations' },
  { key: 'commercial', label: 'Commercial', description: 'Commercial account management' },
  { key: 'storage', label: 'Storage', description: 'Seasonal storage tracking' },
  { key: 'rebooking', label: 'Rebooking', description: 'Renewal and rebooking campaigns' },
  { key: 'reviews', label: 'Reviews', description: 'Review requests and reputation' },
  { key: 'time_clock', label: 'Time Clock', description: 'Crew time tracking' },
  { key: 'routes', label: 'Routes', description: 'Route planning and optimization' },
];

export const DEFAULT_AVAILABLE_MODULES: CrmPlatformModuleKey[] = CRM_PLATFORM_MODULES.map((m) => m.key);

export type PlatformSettings = {
  productName: string;
  productLabel: string;
  tagline: string;
  platformLogoUrl: string | null;
  version: string;
  status: 'active' | 'maintenance' | 'beta';
  marketingUrl: string | null;
  hostingUrl: string | null;
  docsUrl: string | null;
  availableModules: CrmPlatformModuleKey[];
  signupEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultTrialDays: number;
  supportEmail: string;
  announcementBanner?: string | null;
  /** Additional platform operators (beyond PLATFORM_CREATOR_EMAILS env). */
  platformCreatorEmails?: string[];
  platformCreatorUids?: string[];
  updatedAt?: Date;
};

export type CreatorHealthCheck = {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
};

export type CreatorOrgModules = {
  organizationId: string;
  companyName: string;
  availableModules: CrmPlatformModuleKey[];
  enabledModules: CrmPlatformModuleKey[];
};

export type CreatorProvisionResult = {
  organizationId: string;
  companyName: string;
  trialEndsAt: Date;
  ownerInviteSent: boolean;
};

export type CreatorDashboardKpis = {
  totalOrganizations: number;
  newOrganizationsThisWeek: number;
  newOrganizationsThisMonth: number;
  totalUsers: number;
  activeSubscriptions: number;
  trialingOrganizations: number;
  lockedOrganizations: number;
  pastDueOrganizations: number;
  estimatedMrrCents: number;
  estimatedArrCents: number;
  paymentsLast30DaysCents: number;
};

export type CreatorOrganizationSummary = {
  id: string;
  companyName: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan | null;
  isLocked: boolean;
  userCount: number;
  customerCount: number;
  createdAt: Date;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
};

export type CreatorOrganizationDetail = CreatorOrganizationSummary & {
  brandColor: string;
  logoUrl: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  lockAt: Date | null;
  hasAccess: boolean;
  subscriptionInterval: 'month' | 'year' | null;
  planLabel: string | null;
  mrrCents: number;
  users: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    createdAt: Date;
  }>;
  recentPayments: Array<{
    id: string;
    amountCents: number;
    status: string;
    plan: SubscriptionPlan | null;
    paidAt: Date;
  }>;
  proposalCount: number;
  jobCount: number;
  invoiceCount: number;
};

export type CreatorSubscriptionSummary = {
  id: string;
  companyName: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionInterval: 'month' | 'year' | null;
  planLabel: string | null;
  isLocked: boolean;
  hasAccess: boolean;
  userCount: number;
  mrrCents: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  lockAt: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
};

export type CreatorUserSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
};

export type CreatorPaymentSummary = {
  id: string;
  organizationId: string;
  organizationName: string;
  amountCents: number;
  status: string;
  plan: SubscriptionPlan | null;
  paidAt: Date;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  productName: 'Yuletide CRM',
  productLabel: 'Platform Admin',
  tagline: 'Christmas light installation CRM for professional installers',
  platformLogoUrl: null,
  version: '1.0.0',
  status: 'active',
  marketingUrl: 'https://yuletide-lighting.web.app',
  hostingUrl: 'https://yuletide-lighting.web.app',
  docsUrl: null,
  availableModules: [...DEFAULT_AVAILABLE_MODULES],
  signupEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are performing scheduled maintenance. Please check back shortly.',
  defaultTrialDays: 14,
  supportEmail: 'support@yuletide.com',
  announcementBanner: null,
  platformCreatorEmails: [],
  platformCreatorUids: [],
};
