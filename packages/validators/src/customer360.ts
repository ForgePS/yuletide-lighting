import { z } from 'zod';

export const customerTypeSchema = z.enum([
  'residential',
  'commercial',
  'hoa',
  'municipal',
  'church',
  'school',
]);

export const customerStatusSchema = z.enum([
  'lead',
  'active',
  'scheduled',
  'installed',
  'takedown_pending',
  'storage',
  'at_risk',
  'archived',
]);

export const customerStageSchema = z.enum([
  'new_lead',
  'contacted',
  'needs_estimate',
  'mockup_needed',
  'proposal_sent',
  'proposal_viewed',
  'approved',
  'deposit_paid',
  'scheduled',
  'installed',
  'balance_due',
  'paid',
  'removal_scheduled',
  'removed',
  'stored',
  'rebook_next_season',
  'lost',
]);

export const preferredContactMethodSchema = z.enum(['phone', 'email', 'sms']);

export const siteHazardSchema = z.enum([
  'steep_roof',
  'power_lines',
  'dog_present',
  'locked_gate',
  'irrigation_hazards',
  'pool_area',
  'limited_parking',
  'other',
]);

export const activityTypeSchema = z.enum([
  'lead_created',
  'consultation_scheduled',
  'estimate_sent',
  'estimate_approved',
  'design_created',
  'design_modified',
  'design_approved',
  'installation_scheduled',
  'installation_completed',
  'takedown_scheduled',
  'takedown_completed',
  'invoice_created',
  'payment_received',
  'refund_issued',
  'email_sent',
  'sms_sent',
  'phone_call_logged',
  'note_added',
]);

export const designStatusSchema = z.enum(['draft', 'sent', 'approved', 'rejected', 'archived']);

export const customerJobTypeSchema = z.enum([
  'installation',
  'takedown',
  'service_call',
  'repair',
  'warranty',
  'permanent_lighting_install',
]);

export const customerJobStatusSchema = z.enum([
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const storageCategorySchema = z.enum([
  'c9_lights',
  'mini_lights',
  'wreaths',
  'garland',
  'timers',
  'extension_cords',
  'controllers',
  'power_supplies',
  'clips',
  'stakes',
  'other',
]);

export const storageConditionSchema = z.enum(['excellent', 'good', 'damaged', 'replace']);

export const communicationTypeSchema = z.enum([
  'phone',
  'email',
  'sms',
  'internal_note',
  'portal_message',
]);

export const communicationDirectionSchema = z.enum(['inbound', 'outbound', 'internal']);

export const followUpTriggerSchema = z.enum([
  'estimate_sent',
  'estimate_not_accepted_3d',
  'estimate_not_accepted_7d',
  'estimate_not_accepted_14d',
  'installation_completed',
  'review_request',
  'august_early_booking',
  'september_design_review',
  'october_final_scheduling',
  'january_storage_renewal',
]);

export const followUpDeliveryMethodSchema = z.enum(['email', 'sms']);
export const followUpRuleStatusSchema = z.enum(['active', 'inactive']);

const addressBlockSchema = {
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(3).max(20),
};

const optionalAddressBlockSchema = {
  addressLine1: z.string().max(200).optional().or(z.literal('')),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
};

function refineMailingBilling(
  data: {
    mailingSameAsBilling?: boolean;
    mailingAddressLine1?: string;
    mailingCity?: string;
    mailingState?: string;
    mailingPostalCode?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.mailingSameAsBilling !== false) return;
  const required = [
    ['mailingAddressLine1', 'Mailing address is required'],
    ['mailingCity', 'Mailing city is required'],
    ['mailingState', 'Mailing state is required'],
    ['mailingPostalCode', 'Mailing postal code is required'],
  ] as const;
  for (const [field, message] of required) {
    if (!data[field]?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
    }
  }
}

export const customer360BaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  businessName: z.string().max(200).optional().or(z.literal('')),
  customerType: customerTypeSchema.default('residential'),
  status: customerStatusSchema.default('lead'),
  referralSource: z.string().max(200).optional().or(z.literal('')),
  assignedSalespersonId: z.string().optional().or(z.literal('')),
  assignedSalespersonName: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  secondaryEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  mobilePhone: z.string().max(30).optional().or(z.literal('')),
  preferredContactMethod: preferredContactMethodSchema.default('email'),
  notes: z.string().max(10000).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  smsOptIn: z.boolean().default(true),
  emailOptIn: z.boolean().default(true),
  gateCodesInstructions: z.string().max(5000).optional().or(z.literal('')),
  billingSameAsPhysical: z.boolean().default(true),
  billingAddressLine1: z.string().max(200).optional().or(z.literal('')),
  billingAddressLine2: z.string().max(200).optional().or(z.literal('')),
  billingCity: z.string().max(100).optional().or(z.literal('')),
  billingState: z.string().max(50).optional().or(z.literal('')),
  billingPostalCode: z.string().max(20).optional().or(z.literal('')),
  mailingSameAsBilling: z.boolean().default(true),
  mailingAddressLine1: z.string().max(200).optional().or(z.literal('')),
  mailingAddressLine2: z.string().max(200).optional().or(z.literal('')),
  mailingCity: z.string().max(100).optional().or(z.literal('')),
  mailingState: z.string().max(50).optional().or(z.literal('')),
  mailingPostalCode: z.string().max(20).optional().or(z.literal('')),
  ...addressBlockSchema,
});

function refineBillingWhenSeparate(
  data: {
    billingSameAsPhysical?: boolean;
    billingAddressLine1?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.billingSameAsPhysical !== false) return;
  const required = [
    ['billingAddressLine1', 'Billing address is required'],
    ['billingCity', 'Billing city is required'],
    ['billingState', 'Billing state is required'],
    ['billingPostalCode', 'Billing postal code is required'],
  ] as const;
  for (const [field, message] of required) {
    if (!data[field]?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
    }
  }
}

export const createCustomer360Schema = customer360BaseSchema
  .superRefine(refineBillingWhenSeparate)
  .superRefine(refineMailingBilling);

export const updateCustomer360Schema = customer360BaseSchema
  .partial()
  .superRefine(refineBillingWhenSeparate)
  .superRefine(refineMailingBilling);

export const customerListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  search: z.string().optional(),
  customerTypes: z.array(customerTypeSchema).optional(),
  statuses: z.array(customerStatusSchema).optional(),
  view: z.enum(['table', 'card']).default('table'),
  year: z.number().int().min(2020).max(2100).optional().nullable(),
  /** Skip property + revenue enrichment for fast dropdowns */
  enrich: z.enum(['full', 'none']).default('full'),
});

export const propertyProfileTypeSchema = z.enum([
  'residential',
  'commercial',
  'hoa',
  'municipal',
  'church',
  'other',
]);

export const installComplexitySchema = z.enum(['low', 'medium', 'high', 'extreme']);

export const propertyGalleryPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  label: z.string().max(200).optional().or(z.literal('')),
  uploadedBy: z.string().max(200).optional().or(z.literal('')),
  uploadedAt: z.coerce.date().optional().nullable(),
});

export const customerProperty360Schema = z.object({
  propertyName: z.string().min(1, 'Property name is required').max(100),
  propertyType: propertyProfileTypeSchema.optional().or(z.literal('')),
  label: z.string().max(100).default('Primary'),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(3).max(20),
  country: z.string().default('US'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  gateCode: z.string().max(500).optional().or(z.literal('')),
  hoaInfo: z.string().max(2000).optional().or(z.literal('')),
  accessInstructions: z.string().max(5000).optional().or(z.literal('')),
  installNotes: z.string().max(5000).optional().or(z.literal('')),
  powerSourceLocations: z.string().max(2000).optional().or(z.literal('')),
  gfciNotes: z.string().max(2000).optional().or(z.literal('')),
  ladderAccessPoints: z.string().max(2000).optional().or(z.literal('')),
  ladderRequired: z.boolean().default(false),
  liftRequired: z.boolean().default(false),
  roofMeasurementNotes: z.string().max(5000).optional().or(z.literal('')),
  estimatedRooflineFeet: z.number().min(0).optional().nullable(),
  peaks: z.number().int().min(0).optional().nullable(),
  treeCount: z.number().int().min(0).optional().nullable(),
  shrubCount: z.number().int().min(0).optional().nullable(),
  wreathLocations: z.string().max(2000).optional().or(z.literal('')),
  garlandLocations: z.string().max(2000).optional().or(z.literal('')),
  siteHazards: z.array(siteHazardSchema).default([]),
  siteHazardNotes: z.string().max(2000).optional().or(z.literal('')),
  installComplexity: installComplexitySchema.default('medium'),
  previousYearDesignNotes: z.string().max(5000).optional().or(z.literal('')),
  photos: z.record(z.string()).default({}),
  galleryPhotos: z.array(propertyGalleryPhotoSchema).default([]),
});

export const updateCustomerProperty360Schema = customerProperty360Schema.partial();

export const createActivitySchema = z.object({
  activityType: activityTypeSchema,
  description: z.string().min(1).max(5000),
  userName: z.string().max(200).optional().or(z.literal('')),
  relatedRecordType: z.string().max(100).optional().or(z.literal('')),
  relatedRecordId: z.string().optional().or(z.literal('')),
  relatedRecordLabel: z.string().max(200).optional().or(z.literal('')),
  occurredAt: z.coerce.date().optional(),
});

export const createDesignSchema = z.object({
  designName: z.string().min(1).max(200),
  propertyId: z.string().optional().or(z.literal('')),
  propertyName: z.string().max(200).optional().or(z.literal('')),
  versionNumber: z.number().int().min(1).default(1),
  designerName: z.string().max(200).optional().or(z.literal('')),
  status: designStatusSchema.default('draft'),
  revisionNotes: z.string().max(5000).optional().or(z.literal('')),
  originalPhotoUrl: z.string().url().optional().or(z.literal('')),
  mockupImageUrl: z.string().url().optional().or(z.literal('')),
  installedResultPhotoUrl: z.string().url().optional().or(z.literal('')),
});

export const updateDesignSchema = createDesignSchema.partial();

export const createCustomerJobSchema = z.object({
  jobType: customerJobTypeSchema,
  title: z.string().min(1).max(200),
  propertyId: z.string().optional().or(z.literal('')),
  propertyName: z.string().max(200).optional().or(z.literal('')),
  scheduledDate: z.coerce.date().optional().nullable(),
  completionDate: z.coerce.date().optional().nullable(),
  assignedCrewNames: z.array(z.string()).default([]),
  laborHours: z.number().min(0).optional().nullable(),
  materialsUsed: z.string().max(5000).optional().or(z.literal('')),
  revenueCents: z.number().int().min(0).default(0),
  status: customerJobStatusSchema.default('draft'),
  crewNotes: z.string().max(5000).optional().or(z.literal('')),
  beforePhotoUrls: z.array(z.string()).default([]),
  duringPhotoUrls: z.array(z.string()).default([]),
  completedPhotoUrls: z.array(z.string()).default([]),
});

export const updateCustomerJobSchema = createCustomerJobSchema.partial();

export const createStorageItemSchema = z.object({
  itemName: z.string().min(1).max(200),
  category: storageCategorySchema,
  quantity: z.number().int().min(0).default(1),
  condition: storageConditionSchema.default('good'),
  purchaseDate: z.coerce.date().optional().nullable(),
  replacementCostCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  warehouseBuilding: z.string().max(100).optional().or(z.literal('')),
  row: z.string().max(50).optional().or(z.literal('')),
  shelf: z.string().max(50).optional().or(z.literal('')),
  bin: z.string().max(50).optional().or(z.literal('')),
  barcodeValue: z.string().max(200).optional().or(z.literal('')),
});

export const updateStorageItemSchema = createStorageItemSchema.partial();

export const createCommunicationSchema = z.object({
  type: communicationTypeSchema,
  direction: communicationDirectionSchema,
  subject: z.string().max(500).optional().or(z.literal('')),
  body: z.string().min(1).max(10000),
  employeeName: z.string().max(200).optional().or(z.literal('')),
  occurredAt: z.coerce.date().optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.coerce.date().optional().nullable(),
  relatedPropertyId: z.string().optional().or(z.literal('')),
  relatedJobId: z.string().optional().or(z.literal('')),
  relatedQuoteId: z.string().optional().or(z.literal('')),
});

export const updateCommunicationSchema = createCommunicationSchema.partial();

export const updateFollowUpRuleSchema = z.object({
  enabled: z.boolean().optional(),
  messageTemplate: z.string().max(5000).optional(),
  deliveryMethod: followUpDeliveryMethodSchema.optional(),
  status: followUpRuleStatusSchema.optional(),
});

export const addCustomerNoteSchema = z.object({
  customerId: z.string().min(1),
  note: z.string().min(1).max(5000),
});

export const updateCustomerPipelineStageSchema = z.object({
  customerId: z.string().min(1),
  stage: customerStageSchema,
});

export const updateCustomerNextActionSchema = z.object({
  customerId: z.string().min(1),
  nextAction: z.string().max(500).optional().or(z.literal('')),
  nextActionDue: z.coerce.date().optional().nullable(),
});

export const customerPipelineFiltersSchema = z.object({
  search: z.string().optional(),
  stages: z.array(customerStageSchema).optional(),
  assignedTo: z.string().optional(),
  overdueOnly: z.boolean().optional(),
});

export const propertyListFiltersSchema = z.object({
  search: z.string().optional(),
  propertyProfileType: propertyProfileTypeSchema.optional(),
  installComplexity: installComplexitySchema.optional(),
});

export type CreateCustomer360Input = z.infer<typeof createCustomer360Schema>;
export type UpdateCustomer360Input = z.infer<typeof updateCustomer360Schema>;
export type CustomerListFilters = z.infer<typeof customerListFiltersSchema>;
