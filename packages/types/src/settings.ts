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
  | 'settings'
  | 'sign_tracker';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'approve'
  | 'archive'
  | 'restore'
  | 'manage';

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

export type AgreementSettings = SettingsAuditFields & {
  organizationId: string;
  /** Customer-facing terms shown on the public signing page. Supports {{companyName}}. */
  termsBody: string;
  termsVersion: string;
};

export const DEFAULT_AGREEMENT_TERMS_BODY =
  "By signing this agreement you authorize {{companyName}} to provide seasonal lighting services for the seasons listed above at the agreed annual value. Work will be scheduled according to weather and crew availability. Cancellations and renewals are subject to the company's standard policies.";

export const DEFAULT_AGREEMENT_TERMS_VERSION = '2026.1';

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
  installCutoffDate?: string | null;
  takedownStartDate?: string | null;
  rebookingStartDate?: string | null;
  publicMarketingYear?: number | null;
  bookingOpen?: boolean | null;
};

export const DEFAULT_SEASON_SETTINGS: Omit<
  SeasonSettings,
  keyof SettingsAuditFields | 'organizationId'
> = {
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
  installCutoffDate: null,
  takedownStartDate: null,
  rebookingStartDate: null,
  publicMarketingYear: null,
  bookingOpen: true,
};

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
  /** Tenant-enabled portal features (must be subset of Creator availablePortalFeatures). */
  enabledFeatures: import('./portal').PortalFeatureKey[];
  permissions: {
    viewProposals: boolean;
    viewInvoices: boolean;
    approveDesigns: boolean;
    requestService: boolean;
  };
};

export type IntegrationAvailability =
  | 'available'
  | 'configured'
  | 'connected'
  | 'degraded'
  | 'unavailable'
  | 'planned';

export type IntegrationConfig = {
  id: string;
  name: string;
  category:
    | 'crm'
    | 'accounting'
    | 'payments'
    | 'communications'
    | 'maps'
    | 'storage'
    | 'platform'
    | 'background';
  /** Operational state — only available/configured/connected may be toggled on. */
  availability: IntegrationAvailability;
  enabled: boolean;
  configured: boolean;
  apiKeySet: boolean;
  /** When false, UI must not show Connect / API key fields. */
  connectable: boolean;
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

function emptyActions(view = false): Record<PermissionAction, boolean> {
  return {
    view,
    create: false,
    edit: false,
    delete: false,
    export: false,
    approve: false,
    archive: false,
    restore: false,
    manage: false,
  };
}

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  customers: { ...emptyActions(true), create: true, edit: true, export: true },
  mockups: { ...emptyActions(true), create: true, edit: true, export: true },
  proposals: { ...emptyActions(true), create: true, edit: true, export: true, approve: true },
  jobs: { ...emptyActions(true), create: true, edit: true, export: true },
  invoices: { ...emptyActions(true), create: true, edit: true, export: true, approve: true },
  inventory: { ...emptyActions(true), create: true, edit: true, export: true },
  reports: { ...emptyActions(true), export: true },
  settings: emptyActions(false),
  sign_tracker: { ...emptyActions(true), create: true, edit: true, export: true, archive: true },
};

export const SYSTEM_ROLES: Array<{
  slug: SettingsRole;
  name: string;
  description: string;
  permissions: PermissionMatrix;
}> = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to all features',
    permissions: fullPermissions(true),
  },
  {
    slug: 'administrator',
    name: 'Administrator',
    description: 'Manage users and settings',
    permissions: fullPermissions(true),
  },
  {
    slug: 'sales_manager',
    name: 'Sales Manager',
    description: 'Sales team oversight',
    permissions: resourcePermissions(
      ['customers', 'mockups', 'proposals', 'reports', 'sign_tracker'],
      true,
    ),
  },
  {
    slug: 'sales_rep',
    name: 'Sales Rep',
    description: 'Create proposals and manage customers',
    permissions: resourcePermissions(['customers', 'mockups', 'proposals', 'sign_tracker'], false),
  },
  {
    slug: 'operations_manager',
    name: 'Operations Manager',
    description: 'Scheduling and production',
    permissions: resourcePermissions(['jobs', 'inventory', 'reports', 'sign_tracker'], true),
  },
  {
    slug: 'dispatcher',
    name: 'Dispatcher',
    description: 'Schedule and dispatch crews',
    permissions: resourcePermissions(['jobs', 'sign_tracker'], false),
  },
  {
    slug: 'crew_leader',
    name: 'Crew Leader',
    description: 'Lead installation crews',
    permissions: resourcePermissions(['jobs', 'sign_tracker'], false),
  },
  {
    slug: 'installer',
    name: 'Installer',
    description: 'Field installer access',
    permissions: (() => {
      const matrix = viewOnly(['jobs']);
      matrix.sign_tracker = {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
        approve: false,
        archive: false,
        restore: false,
        manage: false,
      };
      return matrix;
    })(),
  },
  {
    slug: 'warehouse_staff',
    name: 'Warehouse Staff',
    description: 'Inventory management',
    permissions: resourcePermissions(['inventory'], false),
  },
  {
    slug: 'office_staff',
    name: 'Office Staff',
    description: 'Office administration',
    permissions: resourcePermissions(['customers', 'invoices', 'jobs', 'sign_tracker'], false),
  },
  {
    slug: 'read_only',
    name: 'Read Only',
    description: 'View-only access',
    permissions: viewOnly([
      'customers',
      'proposals',
      'jobs',
      'invoices',
      'reports',
      'sign_tracker',
    ]),
  },
];

export const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'firebase',
    name: 'Firebase',
    category: 'platform',
    availability: 'available',
    enabled: true,
    configured: true,
    apiKeySet: true,
    connectable: false,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    availability: 'available',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: true,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'communications',
    availability: 'available',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: true,
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'communications',
    availability: 'available',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: true,
  },
  {
    id: 'mapbox',
    name: 'Mapbox',
    category: 'maps',
    availability: 'available',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: true,
  },
  {
    id: 'inngest',
    name: 'Inngest',
    category: 'background',
    availability: 'available',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'square',
    name: 'Square',
    category: 'payments',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'communications',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    category: 'maps',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'storage',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    availability: 'planned',
    enabled: false,
    configured: false,
    apiKeySet: false,
    connectable: false,
  },
];

export const DEFAULT_FEATURE_FLAGS: Array<
  Omit<FeatureFlag, keyof SettingsAuditFields | 'id' | 'organizationId'>
> = [
  {
    key: 'ai_features',
    label: 'AI Features',
    enabled: false,
    description: 'Enable AI assistants when an approved provider is configured',
  },
  {
    key: 'customer_portal',
    label: 'Customer Portal',
    enabled: true,
    description: 'Allow customers to access the portal',
  },
  {
    key: 'online_payments',
    label: 'Online Payments',
    enabled: true,
    description: 'Accept online payments via Stripe',
  },
  {
    key: 'inventory_tracking',
    label: 'Inventory Tracking',
    enabled: true,
    description: 'Track inventory across warehouses',
  },
  {
    key: 'advanced_reporting',
    label: 'Advanced Reporting',
    enabled: true,
    description: 'Enable reports360 analytics',
  },
  {
    key: 'route_optimization',
    label: 'Route Optimization',
    enabled: false,
    description: 'Optimize crew routes automatically',
  },
  {
    key: 'weather_forecast',
    label: 'Weather Forecast',
    enabled: false,
    description: 'Show live weather when a provider is configured',
  },
  {
    key: 'follow_up_automation',
    label: 'Follow-Up Automation',
    enabled: false,
    description:
      'Customer follow-up rules UI and mutations (disabled until delivery pipelines are production-ready)',
  },
];

export const DEFAULT_AUTOMATION_RULES: AutomationRuleSettings['rules'] = [
  {
    id: 'proposal_follow_up',
    name: 'Proposal Follow-Up',
    category: 'proposal',
    enabled: true,
    delayHours: 48,
    triggerEvent: 'proposal_sent',
    deliveryMethod: 'email',
  },
  {
    id: 'invoice_reminder_3',
    name: 'Invoice Reminder (3 days)',
    category: 'invoice',
    enabled: true,
    delayHours: 72,
    triggerEvent: 'invoice_created',
    deliveryMethod: 'email',
  },
  {
    id: 'invoice_reminder_7',
    name: 'Invoice Reminder (7 days)',
    category: 'invoice',
    enabled: true,
    delayHours: 168,
    triggerEvent: 'invoice_overdue',
    deliveryMethod: 'both',
  },
  {
    id: 'crew_notification',
    name: 'Crew Job Assignment',
    category: 'crew',
    enabled: true,
    delayHours: 0,
    triggerEvent: 'job_scheduled',
    deliveryMethod: 'sms',
  },
  {
    id: 'customer_completion',
    name: 'Job Completion Notice',
    category: 'customer',
    enabled: true,
    delayHours: 0,
    triggerEvent: 'job_completed',
    deliveryMethod: 'email',
  },
  {
    id: 'review_request',
    name: 'Review Request',
    category: 'review',
    enabled: true,
    delayHours: 24,
    triggerEvent: 'job_completed',
    deliveryMethod: 'email',
  },
  {
    id: 'renewal_campaign',
    name: 'Season Renewal Campaign',
    category: 'renewal',
    enabled: true,
    delayHours: 0,
    triggerEvent: 'season_start',
    deliveryMethod: 'both',
  },
];

function fullPermissions(all: boolean): PermissionMatrix {
  const resources: PermissionResource[] = [
    'customers',
    'mockups',
    'proposals',
    'jobs',
    'invoices',
    'inventory',
    'reports',
    'settings',
    'sign_tracker',
  ];
  const actions: PermissionAction[] = [
    'view',
    'create',
    'edit',
    'delete',
    'export',
    'approve',
    'archive',
    'restore',
    'manage',
  ];
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
    matrix[r].archive = true;
    matrix[r].restore = manager;
    if (manager) {
      matrix[r].approve = true;
      matrix[r].manage = true;
      matrix[r].delete = true;
    }
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
