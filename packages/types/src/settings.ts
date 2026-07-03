/** Enterprise Settings & Administration — Sprint SET-001 */

export type SettingsAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type SettingsRole =
  | 'owner'
  | 'administrator'
  | 'sales_manager'
  | 'sales_rep'
  | 'operations_manager'
  | 'dispatcher'
  | 'crew_leader'
  | 'installer'
  | 'warehouse_staff'
  | 'office_staff'
  | 'read_only';

export type UserStatus = 'active' | 'suspended' | 'pending' | 'archived';

export type PermissionResource =
  | 'customers'
  | 'mockups'
  | 'proposals'
  | 'jobs'
  | 'invoices'
  | 'inventory'
  | 'reports'
  | 'settings';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export type PermissionMatrix = Record<PermissionResource, Record<PermissionAction, boolean>>;

export type SettingsDashboardKpis = {
  companyName: string;
  subscriptionPlan: string;
  activeUsers: number;
  activeIntegrations: number;
  smsUsageCount: number;
  emailUsageCount: number;
  storageUsageMb: number;
  apiUsageCount: number;
  lastBackupDate: Date | null;
  systemHealth: 'healthy' | 'degraded' | 'critical';
};

export type CompanySettings = SettingsAuditFields & {
  organizationId: string;
  companyName: string;
  dbaName?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  timeZone: string;
  taxId?: string | null;
  licenseNumbers: string[];
  serviceArea: {
    states: string[];
    counties: string[];
    cities: string[];
    zipCodes: string[];
    maxTravelDistanceMiles: number;
    travelChargePerMileCents: number;
    travelChargeMinimumCents: number;
  };
};

export type BrandingSettings = SettingsAuditFields & {
  organizationId: string;
  primaryLogoUrl?: string | null;
  secondaryLogoUrl?: string | null;
  emailLogoUrl?: string | null;
  invoiceLogoUrl?: string | null;
  proposalLogoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type OrgUserProfile = {
  id: string;
  firebaseUid: string;
  organizationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: SettingsRole;
  legacyRole: string;
  status: UserStatus;
  department?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleDefinition = SettingsAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  slug: SettingsRole;
  description?: string | null;
  permissions: PermissionMatrix;
  isSystem: boolean;
};

export type NotificationSettings = SettingsAuditFields & {
  organizationId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  rules: Array<{
    id: string;
    name: string;
    event: string;
    channels: Array<'email' | 'sms' | 'push' | 'in_app'>;
    enabled: boolean;
  }>;
};

export type AutomationRuleSettings = SettingsAuditFields & {
  organizationId: string;
  rules: Array<{
    id: string;
    name: string;
    category: 'proposal' | 'invoice' | 'crew' | 'customer' | 'review' | 'renewal';
    enabled: boolean;
    delayHours: number;
    triggerEvent: string;
    deliveryMethod: 'email' | 'sms' | 'both';
  }>;
};

export type DocumentLayoutStyle = 'classic' | 'modern' | 'compact';

export type ProposalLayoutSettings = {
  style: DocumentLayoutStyle;
  headerTitle: string;
  footerText: string;
  showLogo: boolean;
  showCompanyInfo: boolean;
  showPackageComparison: boolean;
  showLineItemPhotos: boolean;
};

export type InvoiceLayoutSettings = {
  style: DocumentLayoutStyle;
  headerTitle: string;
  footerText: string;
  showLogo: boolean;
  showCompanyInfo: boolean;
  showTaxBreakdown: boolean;
  paymentInstructions: string;
};

export const DEFAULT_PROPOSAL_LAYOUT: ProposalLayoutSettings = {
  style: 'modern',
  headerTitle: 'Proposal',
  footerText: 'Thank you for choosing us for your holiday lighting needs.',
  showLogo: true,
  showCompanyInfo: true,
  showPackageComparison: true,
  showLineItemPhotos: true,
};

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutSettings = {
  style: 'classic',
  headerTitle: 'Invoice',
  footerText: 'Please remit payment by the due date shown above.',
  showLogo: true,
  showCompanyInfo: true,
  showTaxBreakdown: true,
  paymentInstructions: 'Pay online via the customer portal or mail a check to the address above.',
};

export type ProposalSettings = SettingsAuditFields & {
  organizationId: string;
  numberFormat: string;
  defaultExpirationDays: number;
  defaultDepositPercent: number;
  defaultTerms: string;
  defaultTemplateId?: string | null;
  packageDefaults: {
    good: { label: string; markupPercent: number };
    better: { label: string; markupPercent: number };
    best: { label: string; markupPercent: number };
  };
  layout: ProposalLayoutSettings;
};

export type InvoiceSettingsConfig = SettingsAuditFields & {
  organizationId: string;
  numberFormat: string;
  paymentTermsDays: number;
  lateFeePercent: number;
  taxRatePercent: number;
  depositRequiredPercent: number;
  reminderDays: number[];
  layout: InvoiceLayoutSettings;
};

export type JobSettingsConfig = SettingsAuditFields & {
  organizationId: string;
  numberFormat: string;
  crewCapacityPerDay: number;
  defaultScheduleDurationHours: number;
  dispatchAutoAssign: boolean;
  workOrderTemplateId?: string | null;
  statusFlow: string[];
  jobTypes: string[];
};

export type SeasonSettings = SettingsAuditFields & {
  organizationId: string;
  seasonYear: number;
  salesStartMonth: number;
  installStartMonth: number;
  installEndMonth: number;
  removalStartMonth: number;
  removalEndMonth: number;
  rebookingStartMonth: number;
  defaultInstallLeadDays: number;
  defaultRemovalLeadDays: number;
  blackoutWeeks: number[];
};

export const DEFAULT_SEASON_SETTINGS: Omit<SeasonSettings, keyof SettingsAuditFields | 'organizationId'> = {
  seasonYear: new Date().getFullYear(),
  salesStartMonth: 6,
  installStartMonth: 9,
  installEndMonth: 11,
  removalStartMonth: 0,
  removalEndMonth: 1,
  rebookingStartMonth: 7,
  defaultInstallLeadDays: 14,
  defaultRemovalLeadDays: 7,
  blackoutWeeks: [],
};

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type InventorySettingsConfig = SettingsAuditFields & {
  organizationId: string;
  skuFormat: string;
  defaultReorderThreshold: number;
  categories: string[];
  defaultWarehouseId?: string | null;
  auditFrequencyDays: number;
};

export type CustomerPortalSettings = SettingsAuditFields & {
  organizationId: string;
  enabled: boolean;
  portalLogoUrl?: string | null;
  portalPrimaryColor?: string | null;
  allowSelfScheduling: boolean;
  allowOnlinePayments: boolean;
  allowServiceRequests: boolean;
  permissions: {
    viewProposals: boolean;
    viewInvoices: boolean;
    approveDesigns: boolean;
    requestService: boolean;
  };
};

export type IntegrationConfig = {
  id: string;
  name: string;
  category: 'crm' | 'accounting' | 'payments' | 'communications' | 'maps' | 'storage';
  enabled: boolean;
  configured: boolean;
  apiKeySet: boolean;
};

export type IntegrationsSettings = SettingsAuditFields & {
  organizationId: string;
  integrations: IntegrationConfig[];
};

export type AiSettingsConfig = SettingsAuditFields & {
  organizationId: string;
  proposalWriterEnabled: boolean;
  followUpAssistantEnabled: boolean;
  forecastingEnabled: boolean;
  dispatchAssistantEnabled: boolean;
  monthlyUsageLimit: number;
  currentUsageCount: number;
  allowedFeatures: string[];
};

export type SecuritySettings = SettingsAuditFields & {
  organizationId: string;
  emailLoginEnabled: boolean;
  googleLoginEnabled: boolean;
  microsoftLoginEnabled: boolean;
  twoFactorRequired: boolean;
  passwordExpirationDays: number;
  sessionTimeoutMinutes: number;
};

export type SystemPreferences = SettingsAuditFields & {
  organizationId: string;
  timeZone: string;
  dateFormat: string;
  currency: 'USD' | 'CAD';
  measurementUnit: 'feet' | 'meters';
};

export type FeatureFlag = SettingsAuditFields & {
  id: string;
  organizationId: string;
  key: string;
  label: string;
  enabled: boolean;
  description?: string | null;
};

export type AuditLogEntry = SettingsAuditFields & {
  id: string;
  organizationId: string;
  action: string;
  resource: string;
  userId?: string | null;
  userEmail?: string | null;
  details?: Record<string, unknown>;
};

export type BackupRecord = SettingsAuditFields & {
  id: string;
  organizationId: string;
  type: 'manual' | 'scheduled';
  status: 'completed' | 'in_progress' | 'failed';
  sizeMb: number;
};

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  customers: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
  mockups: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
  proposals: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
  jobs: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
  invoices: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
  inventory: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
  reports: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
  settings: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
};

export const SYSTEM_ROLES: Array<{ slug: SettingsRole; name: string; description: string; permissions: PermissionMatrix }> = [
  { slug: 'owner', name: 'Owner', description: 'Full access to all features', permissions: fullPermissions(true) },
  { slug: 'administrator', name: 'Administrator', description: 'Manage users and settings', permissions: fullPermissions(true) },
  { slug: 'sales_manager', name: 'Sales Manager', description: 'Sales team oversight', permissions: resourcePermissions(['customers', 'mockups', 'proposals', 'reports'], true) },
  { slug: 'sales_rep', name: 'Sales Rep', description: 'Create proposals and manage customers', permissions: resourcePermissions(['customers', 'mockups', 'proposals'], false) },
  { slug: 'operations_manager', name: 'Operations Manager', description: 'Scheduling and production', permissions: resourcePermissions(['jobs', 'inventory', 'reports'], true) },
  { slug: 'dispatcher', name: 'Dispatcher', description: 'Schedule and dispatch crews', permissions: resourcePermissions(['jobs'], false) },
  { slug: 'crew_leader', name: 'Crew Leader', description: 'Lead installation crews', permissions: resourcePermissions(['jobs'], false) },
  { slug: 'installer', name: 'Installer', description: 'Field installer access', permissions: viewOnly(['jobs']) },
  { slug: 'warehouse_staff', name: 'Warehouse Staff', description: 'Inventory management', permissions: resourcePermissions(['inventory'], false) },
  { slug: 'office_staff', name: 'Office Staff', description: 'Office administration', permissions: resourcePermissions(['customers', 'invoices', 'jobs'], false) },
  { slug: 'read_only', name: 'Read Only', description: 'View-only access', permissions: viewOnly(['customers', 'proposals', 'jobs', 'invoices', 'reports']) },
];

export const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  { id: 'hubspot', name: 'HubSpot', category: 'crm', enabled: false, configured: false, apiKeySet: false },
  { id: 'salesforce', name: 'Salesforce', category: 'crm', enabled: false, configured: false, apiKeySet: false },
  { id: 'quickbooks', name: 'QuickBooks Online', category: 'accounting', enabled: false, configured: false, apiKeySet: false },
  { id: 'xero', name: 'Xero', category: 'accounting', enabled: false, configured: false, apiKeySet: false },
  { id: 'stripe', name: 'Stripe', category: 'payments', enabled: false, configured: false, apiKeySet: false },
  { id: 'square', name: 'Square', category: 'payments', enabled: false, configured: false, apiKeySet: false },
  { id: 'twilio', name: 'Twilio', category: 'communications', enabled: false, configured: false, apiKeySet: false },
  { id: 'sendgrid', name: 'SendGrid', category: 'communications', enabled: false, configured: false, apiKeySet: false },
  { id: 'google_maps', name: 'Google Maps', category: 'maps', enabled: false, configured: false, apiKeySet: false },
  { id: 'google_drive', name: 'Google Drive', category: 'storage', enabled: false, configured: false, apiKeySet: false },
  { id: 'dropbox', name: 'Dropbox', category: 'storage', enabled: false, configured: false, apiKeySet: false },
];

export const DEFAULT_FEATURE_FLAGS: Array<Omit<FeatureFlag, keyof SettingsAuditFields | 'id' | 'organizationId'>> = [
  { key: 'ai_features', label: 'AI Features', enabled: true, description: 'Enable AI assistants across the platform' },
  { key: 'customer_portal', label: 'Customer Portal', enabled: true, description: 'Allow customers to access the portal' },
  { key: 'online_payments', label: 'Online Payments', enabled: true, description: 'Accept online payments via Stripe' },
  { key: 'inventory_tracking', label: 'Inventory Tracking', enabled: true, description: 'Track inventory across warehouses' },
  { key: 'advanced_reporting', label: 'Advanced Reporting', enabled: true, description: 'Enable reports360 analytics' },
  { key: 'route_optimization', label: 'Route Optimization', enabled: false, description: 'Optimize crew routes automatically' },
];

export const DEFAULT_AUTOMATION_RULES: AutomationRuleSettings['rules'] = [
  { id: 'proposal_follow_up', name: 'Proposal Follow-Up', category: 'proposal', enabled: true, delayHours: 48, triggerEvent: 'proposal_sent', deliveryMethod: 'email' },
  { id: 'invoice_reminder_3', name: 'Invoice Reminder (3 days)', category: 'invoice', enabled: true, delayHours: 72, triggerEvent: 'invoice_created', deliveryMethod: 'email' },
  { id: 'invoice_reminder_7', name: 'Invoice Reminder (7 days)', category: 'invoice', enabled: true, delayHours: 168, triggerEvent: 'invoice_overdue', deliveryMethod: 'both' },
  { id: 'crew_notification', name: 'Crew Job Assignment', category: 'crew', enabled: true, delayHours: 0, triggerEvent: 'job_scheduled', deliveryMethod: 'sms' },
  { id: 'customer_completion', name: 'Job Completion Notice', category: 'customer', enabled: true, delayHours: 0, triggerEvent: 'job_completed', deliveryMethod: 'email' },
  { id: 'review_request', name: 'Review Request', category: 'review', enabled: true, delayHours: 24, triggerEvent: 'job_completed', deliveryMethod: 'email' },
  { id: 'renewal_campaign', name: 'Season Renewal Campaign', category: 'renewal', enabled: true, delayHours: 0, triggerEvent: 'season_start', deliveryMethod: 'both' },
];

function fullPermissions(all: boolean): PermissionMatrix {
  const resources: PermissionResource[] = ['customers', 'mockups', 'proposals', 'jobs', 'invoices', 'inventory', 'reports', 'settings'];
  const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
  const matrix = {} as PermissionMatrix;
  for (const r of resources) {
    matrix[r] = {} as Record<PermissionAction, boolean>;
    for (const a of actions) matrix[r][a] = all;
  }
  return matrix;
}

function resourcePermissions(resources: PermissionResource[], manager: boolean): PermissionMatrix {
  const matrix = fullPermissions(false);
  for (const r of resources) {
    matrix[r].view = true;
    matrix[r].create = true;
    matrix[r].edit = true;
    matrix[r].export = true;
    if (manager) matrix[r].approve = true;
  }
  return matrix;
}

function viewOnly(resources: PermissionResource[]): PermissionMatrix {
  const matrix = fullPermissions(false);
  for (const r of resources) matrix[r].view = true;
  return matrix;
}

export function hasPermission(
  permissions: PermissionMatrix,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  return permissions[resource]?.[action] ?? false;
}

export function mapLegacyRole(role: string): SettingsRole {
  const map: Record<string, SettingsRole> = {
    owner: 'owner',
    admin: 'administrator',
    office: 'office_staff',
    crew: 'installer',
  };
  return map[role] ?? 'read_only';
}
