import { z } from 'zod';
import { logoReferenceSchema } from './settings360';

export const userRoleSchema = z.enum(['owner', 'admin', 'office', 'crew']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const jobStageSchema = z.enum([
  'draft_proposal',
  'sent_proposal',
  'accepted_proposal',
  'lost',
  'invoiced',
  'deposit_paid',
  'inventory_reserved',
  'scheduled',
  'installed',
  'removal_scheduled',
  'removed',
  'review_requested',
  'complete',
]);
export type JobStage = z.infer<typeof jobStageSchema>;

export const proposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const invoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
  'void',
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const messageChannelSchema = z.enum(['sms', 'email', 'portal']);
export type MessageChannel = z.infer<typeof messageChannelSchema>;

export const agreementModeSchema = z.enum(['single', 'multi']);
export type AgreementMode = z.infer<typeof agreementModeSchema>;

export const addressFieldsSchema = z.object({
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  postalCode: z.string().min(3, 'Postal code is required').max(20),
});

function refineBillingAddress(
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

export const createCustomerBaseSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(5000).optional(),
  smsOptIn: z.boolean().default(true),
  emailOptIn: z.boolean().default(true),
  gateCodesInstructions: z.string().max(5000).optional().or(z.literal('')),
  billingSameAsPhysical: z.boolean().default(true),
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  postalCode: z.string().min(3, 'Postal code is required').max(20),
  billingAddressLine1: z.string().max(200).optional().or(z.literal('')),
  billingAddressLine2: z.string().max(200).optional().or(z.literal('')),
  billingCity: z.string().max(100).optional().or(z.literal('')),
  billingState: z.string().max(50).optional().or(z.literal('')),
  billingPostalCode: z.string().max(20).optional().or(z.literal('')),
});

export const createCustomerSchema = createCustomerBaseSchema.superRefine(refineBillingAddress);
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerBaseSchema.partial().superRefine(refineBillingAddress);
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createPropertySchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().min(1).max(100).default('Primary'),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(3).max(20),
  country: z.string().default('US'),
  installNotes: z.string().max(5000).optional(),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = createPropertySchema.omit({ customerId: true }).partial();
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export const agreementOptionSchema = z.object({
  code: z.string().min(2).max(10),
  label: z.string().min(1).max(50),
  active: z.boolean().default(true),
});
export type AgreementOptionInput = z.infer<typeof agreementOptionSchema>;

export const inventoryPriceSchema = z.object({
  agreementCode: z.string().min(2).max(10),
  unitPriceCents: z.number().int().min(0),
});

export const createInventoryItemSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  unit: z.string().max(20).default('each'),
  quantityOnHand: z.number().min(0).default(0),
  reorderThreshold: z.number().min(0).default(0),
  prices: z.array(inventoryPriceSchema).default([]),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const proposalLineItemSchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
  agreementCode: z.string().optional(),
});
export type ProposalLineItemInput = z.infer<typeof proposalLineItemSchema>;

export const createProposalSchema = z.object({
  customerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  agreementMode: agreementModeSchema.default('single'),
  agreementOptions: z.array(agreementOptionSchema).default([]),
  lineItems: z.array(proposalLineItemSchema).min(1),
  notes: z.string().max(5000).optional(),
  validUntil: z.string().datetime().optional(),
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const acceptProposalSchema = z.object({
  token: z.string().min(1),
  agreementCode: z.string().optional(),
  customerName: z.string().min(1).max(200),
});
export type AcceptProposalInput = z.infer<typeof acceptProposalSchema>;

export const createInvoiceSchema = z.object({
  proposalId: z.string().uuid(),
  depositPercent: z.number().min(0).max(100).default(50),
  dueDays: z.number().int().min(1).max(365).default(30),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const sendMessageSchema = z.object({
  customerId: z.string().uuid(),
  channel: messageChannelSchema,
  body: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const scheduleJobSchema = z.object({
  jobId: z.string().uuid(),
  crewUserId: z.string().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().optional(),
});
export type ScheduleJobInput = z.infer<typeof scheduleJobSchema>;

export const orgSettingsSchema = z.object({
  companyName: z.string().min(1).max(200),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#DC2626'),
  logoUrl: logoReferenceSchema,
  agreementMode: agreementModeSchema.default('multi'),
  agreementOptions: z.array(agreementOptionSchema).default([]),
  twilioPhoneNumber: z.string().optional(),
  reviewGoogleUrl: z.string().url().optional().or(z.literal('')),
  reviewFacebookUrl: z.string().url().optional().or(z.literal('')),
});
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;

export const mockupStrandSchema = z.object({
  id: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  color: z.string(),
  pattern: z.array(z.string()).optional(),
  bulbSize: z.number().default(6),
  spacing: z.number().default(12),
});

export const mockupDataSchema = z.object({
  backgroundBrightness: z.number().min(0).max(1).default(0.5),
  strands: z.array(mockupStrandSchema),
});
export type MockupData = z.infer<typeof mockupDataSchema>;

export const createMockupSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1).max(100),
  imageUrl: z.string().url(),
  data: mockupDataSchema,
});
export type CreateMockupInput = z.infer<typeof createMockupSchema>;

export const timeEntrySchema = z.object({
  jobId: z.string().uuid(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export * from './customer360';
export * from './contacts';
export * from './agreements';
export * from './time-clock';
export * from './project-prep';
export * from './service-issues';
export * from './proposals';
export * from './inventory360';
export * from './invoices360';
export * from './messages360';
export * from './schedule360';
export * from './mockups360';
export * from './reports360';
export * from './settings360';
export * from './billing';
export * from './media';
export * from './import360';
export * from './rebooking360';
export * from './storage360';
export * from './commercial360';
export * from './crew360';
export * from './reviews360';
export * from './automation360';
export * from './creator360';
export * from './signTracker360';
