import { z } from 'zod';
import { isValidLogoReference } from '@clcrm/types';

export const logoReferenceSchema = z
  .string()
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine((val) => isValidLogoReference(val), { message: 'Invalid logo URL or storage path' });

export const settingsRoleSchema = z.enum([
  'owner', 'administrator', 'sales_manager', 'sales_rep', 'operations_manager',
  'dispatcher', 'crew_leader', 'installer', 'warehouse_staff', 'office_staff', 'read_only',
]);

export const userStatusSchema = z.enum(['active', 'suspended', 'pending', 'archived']);

export const permissionResourceSchema = z.enum([
  'customers', 'mockups', 'proposals', 'jobs', 'invoices', 'inventory', 'reports', 'settings',
]);

export const permissionActionSchema = z.enum(['view', 'create', 'edit', 'delete', 'export', 'approve']);

export const permissionMatrixSchema = z.record(
  permissionResourceSchema,
  z.record(permissionActionSchema, z.boolean()),
);

export const serviceAreaSchema = z.object({
  states: z.array(z.string()).default([]),
  counties: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  zipCodes: z.array(z.string()).default([]),
  maxTravelDistanceMiles: z.number().min(0).max(500).default(50),
  travelChargePerMileCents: z.number().min(0).default(0),
  travelChargeMinimumCents: z.number().min(0).default(0),
});

export const companySettingsSchema = z.object({
  companyName: z.string().min(1).max(200),
  dbaName: z.string().max(200).optional().nullable(),
  logoUrl: logoReferenceSchema,
  website: z.string().url().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  timeZone: z.string().default('America/New_York'),
  taxId: z.string().max(50).optional().nullable(),
  licenseNumbers: z.array(z.string()).default([]),
  serviceArea: serviceAreaSchema.default({}),
});

export const brandingSettingsSchema = z.object({
  primaryLogoUrl: logoReferenceSchema,
  secondaryLogoUrl: logoReferenceSchema,
  emailLogoUrl: logoReferenceSchema,
  invoiceLogoUrl: logoReferenceSchema,
  proposalLogoUrl: logoReferenceSchema,
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#DC2626'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1E40AF'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#059669'),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().optional(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  role: settingsRoleSchema.optional(),
  status: userStatusSchema.optional(),
  department: z.string().max(100).optional().nullable(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  role: settingsRoleSchema.default('office_staff'),
  department: z.string().max(100).optional().nullable(),
});

export const updateRolePermissionsSchema = z.object({
  roleId: z.string().min(1),
  permissions: permissionMatrixSchema,
});

export const notificationChannelSchema = z.enum(['email', 'sms', 'push', 'in_app']);

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
});

export const notificationRuleUpdateSchema = z.object({
  ruleId: z.string().min(1),
  name: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
  channels: z.array(notificationChannelSchema).min(1).optional(),
});

export const documentLayoutStyleSchema = z.enum(['classic', 'modern', 'compact']);

export const proposalLayoutSchema = z.object({
  style: documentLayoutStyleSchema.default('modern'),
  headerTitle: z.string().max(200).default('Proposal'),
  footerText: z.string().max(2000).default(''),
  showLogo: z.boolean().default(true),
  showCompanyInfo: z.boolean().default(true),
  showPackageComparison: z.boolean().default(true),
  showLineItemPhotos: z.boolean().default(true),
});

export const invoiceLayoutSchema = z.object({
  style: documentLayoutStyleSchema.default('classic'),
  headerTitle: z.string().max(200).default('Invoice'),
  footerText: z.string().max(2000).default(''),
  showLogo: z.boolean().default(true),
  showCompanyInfo: z.boolean().default(true),
  showTaxBreakdown: z.boolean().default(true),
  paymentInstructions: z.string().max(2000).default(''),
});

export const automationRuleUpdateSchema = z.object({
  ruleId: z.string().min(1),
  enabled: z.boolean().optional(),
  delayHours: z.number().min(0).max(8760).optional(),
  deliveryMethod: z.enum(['email', 'sms', 'both']).optional(),
});

export const proposalSettingsSchema = z.object({
  numberFormat: z.string().default('PROP-{YYYY}-{SEQ}'),
  defaultExpirationDays: z.number().min(1).max(365).default(30),
  defaultDepositPercent: z.number().min(0).max(100).default(50),
  defaultTerms: z.string().max(5000).default(''),
  defaultTemplateId: z.string().optional().nullable(),
  packageDefaults: z.object({
    good: z.object({ label: z.string(), markupPercent: z.number() }),
    better: z.object({ label: z.string(), markupPercent: z.number() }),
    best: z.object({ label: z.string(), markupPercent: z.number() }),
  }).optional(),
  layout: proposalLayoutSchema.optional(),
});

export const invoiceSettingsConfigSchema = z.object({
  numberFormat: z.string().default('INV-{YYYY}-{SEQ}'),
  paymentTermsDays: z.number().min(0).max(365).default(30),
  lateFeePercent: z.number().min(0).max(50).default(1.5),
  taxRatePercent: z.number().min(0).max(30).default(0),
  depositRequiredPercent: z.number().min(0).max(100).default(50),
  reminderDays: z.array(z.number()).default([3, 7, 14, 30]),
  layout: invoiceLayoutSchema.optional(),
});

export const jobSettingsConfigSchema = z.object({
  numberFormat: z.string().default('JOB-{YYYY}-{SEQ}'),
  crewCapacityPerDay: z.number().min(1).max(50).default(4),
  defaultScheduleDurationHours: z.number().min(1).max(24).default(4),
  dispatchAutoAssign: z.boolean().default(false),
  workOrderTemplateId: z.string().optional().nullable(),
  statusFlow: z.array(z.string()).default(['Draft', 'Scheduled', 'Assigned', 'Completed']),
  jobTypes: z.array(z.string()).default(['installation', 'takedown', 'service_call', 'repair', 'warranty']),
});

export const seasonSettingsSchema = z.object({
  seasonYear: z.number().int().min(2020).max(2100),
  salesStartMonth: z.number().int().min(0).max(11).default(6),
  installStartMonth: z.number().int().min(0).max(11).default(9),
  installEndMonth: z.number().int().min(0).max(11).default(11),
  removalStartMonth: z.number().int().min(0).max(11).default(0),
  removalEndMonth: z.number().int().min(0).max(11).default(1),
  rebookingStartMonth: z.number().int().min(0).max(11).default(7),
  defaultInstallLeadDays: z.number().int().min(0).max(120).default(14),
  defaultRemovalLeadDays: z.number().int().min(0).max(120).default(7),
  blackoutWeeks: z.array(z.number().int().min(1).max(53)).default([]),
});

export const inventorySettingsConfigSchema = z.object({
  skuFormat: z.string().default('SKU-{CAT}-{SEQ}'),
  defaultReorderThreshold: z.number().min(0).default(10),
  categories: z.array(z.string()).default(['Lighting', 'Clips', 'Wire', 'Decor', 'Tools']),
  defaultWarehouseId: z.string().optional().nullable(),
  auditFrequencyDays: z.number().min(1).max(365).default(90),
});

export const customerPortalSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  portalLogoUrl: z.string().url().optional().nullable().or(z.literal('')),
  portalPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  allowSelfScheduling: z.boolean().default(false),
  allowOnlinePayments: z.boolean().default(true),
  allowServiceRequests: z.boolean().default(true),
  permissions: z.object({
    viewProposals: z.boolean().default(true),
    viewInvoices: z.boolean().default(true),
    approveDesigns: z.boolean().default(true),
    requestService: z.boolean().default(true),
  }).optional(),
});

export const integrationToggleSchema = z.object({
  integrationId: z.string().min(1),
  enabled: z.boolean(),
  apiKey: z.string().optional(),
});

export const aiSettingsConfigSchema = z.object({
  proposalWriterEnabled: z.boolean().default(true),
  followUpAssistantEnabled: z.boolean().default(true),
  forecastingEnabled: z.boolean().default(true),
  dispatchAssistantEnabled: z.boolean().default(true),
  monthlyUsageLimit: z.number().min(0).max(100000).default(1000),
  allowedFeatures: z.array(z.string()).default(['proposals', 'follow_up', 'forecasting', 'dispatch']),
});

export const securitySettingsSchema = z.object({
  emailLoginEnabled: z.boolean().default(true),
  googleLoginEnabled: z.boolean().default(true),
  microsoftLoginEnabled: z.boolean().default(false),
  twoFactorRequired: z.boolean().default(false),
  passwordExpirationDays: z.number().min(0).max(365).default(90),
  sessionTimeoutMinutes: z.number().min(15).max(1440).default(480),
});

export const systemPreferencesSchema = z.object({
  timeZone: z.string().default('America/New_York'),
  dateFormat: z.string().default('MM/DD/YYYY'),
  currency: z.enum(['USD', 'CAD']).default('USD'),
  measurementUnit: z.enum(['feet', 'meters']).default('feet'),
});

export const featureFlagToggleSchema = z.object({
  flagId: z.string().min(1),
  enabled: z.boolean(),
});

export const auditLogFilterSchema = z.object({
  resource: z.string().optional(),
  limit: z.number().min(1).max(200).default(50),
});
