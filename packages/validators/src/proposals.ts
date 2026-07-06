import { z } from 'zod';

export const proposalStatusSchema = z.enum([
  'draft',
  'internal_review',
  'ready_to_send',
  'sent',
  'viewed',
  'customer_questions',
  'approved',
  'deposit_paid',
  'scheduled',
  'rejected',
  'expired',
  'accepted',
  'declined',
]);

export const installTypeSchema = z.enum([
  'roofline',
  'trees',
  'wreaths',
  'garland',
  'commercial_display',
  'permanent_lighting',
  'service_call',
  'custom',
]);

export const packageTierSchema = z.enum(['basic', 'recommended', 'premium']);
export const financingOptionSchema = z.enum(['full_payment', 'deposit_50', 'monthly', 'financing_partner']);
export const depositStatusSchema = z.enum(['pending', 'paid', 'refunded']);
export const approvalActionSchema = z.enum(['approved', 'rejected', 'changes_requested']);

export const proposalTemplateCategorySchema = z.enum([
  'residential_roofline',
  'residential_premium',
  'commercial',
  'hoa',
  'municipal',
  'permanent_lighting',
]);

export const pricingComponentsSchema = z.object({
  linearFootage: z.number().min(0).default(0),
  treeWrapCount: z.number().min(0).default(0),
  garlandLengthFt: z.number().min(0).default(0),
  wreathCount: z.number().min(0).default(0),
  specialtyDecorCount: z.number().min(0).default(0),
  laborHours: z.number().min(0).default(0),
  equipmentChargeCents: z.number().int().min(0).default(0),
  travelChargeCents: z.number().int().min(0).default(0),
  materialCostCents: z.number().int().min(0).default(0),
  laborCostCents: z.number().int().min(0).default(0),
});

export const proposalLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
  category: z.string().max(100).optional(),
  inventoryItemId: z.string().optional(),
  agreementCode: z.string().optional(),
});

export const proposalPackageSchema = z.object({
  tier: packageTierSchema,
  name: z.string().min(1).max(200),
  label: z.string().min(1).max(100),
  description: z.string().max(2000).optional().or(z.literal('')),
  lineItems: z.array(proposalLineItemSchema).default([]),
  products: z.array(z.string()).default([]),
  decorations: z.array(z.string()).default([]),
  laborDescription: z.string().max(2000).optional().or(z.literal('')),
  addOns: z.array(z.string()).default([]),
  warranty: z.string().max(2000).optional().or(z.literal('')),
  pricing: pricingComponentsSchema.default({}),
  isRecommended: z.boolean().default(false),
});

export const createProposal360Schema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().min(1),
  title: z.string().min(1).max(200),
  salespersonName: z.string().max(200).optional().or(z.literal('')),
  installType: installTypeSchema.optional(),
  season: z.string().max(50).optional().or(z.literal('')),
  scopeOfWork: z.string().max(20000).optional().or(z.literal('')),
  agreementMode: z.enum(['single', 'multi']).default('single'),
  agreementOptions: z.array(z.object({ code: z.string(), label: z.string(), active: z.boolean() })).default([]),
  lineItems: z.array(proposalLineItemSchema).default([]),
  notes: z.string().max(5000).optional().or(z.literal('')),
  validUntil: z.coerce.date().optional().nullable(),
  designId: z.string().optional().or(z.literal('')),
  propertyPhotoUrl: z.string().url().optional().or(z.literal('')),
  mockupIds: z.array(z.string()).default([]),
  pricing: pricingComponentsSchema.optional(),
  financingOption: financingOptionSchema.default('deposit_50'),
  depositPercent: z.number().min(0).max(100).default(50),
  installDate: z.coerce.date().optional().nullable(),
  removalDate: z.coerce.date().optional().nullable(),
  termsAndConditions: z.string().max(20000).optional().or(z.literal('')),
  packages: z.array(proposalPackageSchema).optional(),
  templateId: z.string().optional(),
});

export const updateProposal360Schema = createProposal360Schema.partial().extend({
  status: proposalStatusSchema.optional(),
  selectedPackageId: z.string().optional(),
  depositStatus: depositStatusSchema.optional(),
  followUpAutomationEnabled: z.boolean().optional(),
});

export const updateProposalStatusSchema = z.object({
  proposalId: z.string().min(1),
  status: proposalStatusSchema,
});

export const publicApprovalSchema = z.object({
  token: z.string().min(1),
  action: approvalActionSchema,
  customerName: z.string().min(1).max(200),
  signatureData: z.string().max(50000).optional().or(z.literal('')),
  packageId: z.string().optional(),
  agreementCode: z.string().optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

export const createProposalTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: proposalTemplateCategorySchema,
  description: z.string().max(2000).optional().or(z.literal('')),
  scopeOfWork: z.string().max(20000).optional().or(z.literal('')),
  installType: installTypeSchema.optional(),
  defaultPackages: z.array(proposalPackageSchema).default([]),
  isActive: z.boolean().default(true),
});

export const updateProposalTemplateSchema = createProposalTemplateSchema.partial();
export const deleteProposalTemplateSchema = z.object({
  templateId: z.string().min(1),
});

export const recordProposalViewSchema = z.object({
  token: z.string().min(1),
  durationSeconds: z.number().optional(),
  device: z.string().optional(),
  userAgent: z.string().optional(),
});

export const depositPaymentSchema = z.object({
  proposalId: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
  provider: z.enum(['stripe', 'square']).default('stripe'),
});

export type CreateProposal360Input = z.infer<typeof createProposal360Schema>;
export type UpdateProposal360Input = z.infer<typeof updateProposal360Schema>;
