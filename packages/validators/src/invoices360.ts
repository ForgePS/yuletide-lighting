import { z } from 'zod';

export const invoiceStatus360Schema = z.enum([
  'draft', 'sent', 'viewed', 'pending_payment', 'partially_paid', 'paid',
  'overdue', 'in_collection', 'disputed', 'refunded', 'cancelled',
]);

export const paymentMethodSchema = z.enum(['credit_card', 'ach', 'check', 'cash', 'wire_transfer']);
export const paymentTypeSchema = z.enum(['deposit', 'partial', 'final', 'refund', 'credit']);
export const reminderStageSchema = z.enum([
  'pre_due_3', 'due_today', 'overdue_3', 'overdue_7', 'overdue_14', 'overdue_21', 'overdue_30',
]);
export const reminderChannelSchema = z.enum(['email', 'sms']);
export const disputeStatusSchema = z.enum(['open', 'investigating', 'resolved', 'closed']);
export const collectionRiskSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createInvoice360Schema = z.object({
  customerId: z.string().min(1),
  proposalId: z.string().optional(),
  subtotalCents: z.number().int().min(0),
  depositPercent: z.number().min(0).max(100).optional(),
  dueDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateInvoice360Schema = z.object({
  subtotalCents: z.number().int().min(0).optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  propertyAddress: z.string().max(500).optional().or(z.literal('')),
  remindersPaused: z.boolean().optional(),
});

export const createFromProposal360Schema = z.object({
  proposalId: z.string().min(1),
  depositPercent: z.number().min(0).max(100).optional(),
  dueDays: z.number().int().min(1).max(365).optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountCents: z.number().int().positive(),
  paymentType: paymentTypeSchema,
  paymentMethod: paymentMethodSchema,
  transactionId: z.string().optional(),
  processor: z.string().optional(),
  feesCents: z.number().int().min(0).default(0),
  paidAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const createDisputeSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(1).max(5000),
  assignedUserId: z.string().optional(),
  assignedUserName: z.string().optional(),
});

export const updateDisputeSchema = z.object({
  disputeId: z.string().min(1),
  invoiceId: z.string().min(1),
  status: disputeStatusSchema,
  resolution: z.string().max(5000).optional(),
});

export const reminderControlSchema = z.object({
  invoiceId: z.string().min(1),
  action: z.enum(['pause', 'resume', 'skip', 'send_manual']),
  channel: reminderChannelSchema.optional(),
  stage: reminderStageSchema.optional(),
});

export const createReminderTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  stage: reminderStageSchema,
  channel: reminderChannelSchema,
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
});

export const updateReminderTemplateSchema = createReminderTemplateSchema.partial();
export const updateReminderTemplateInputSchema = z.object({
  templateId: z.string().min(1),
  data: updateReminderTemplateSchema,
});
export const deleteReminderTemplateSchema = z.object({
  templateId: z.string().min(1),
});

export const invoiceTemplateBlockTypeSchema = z.enum(['text', 'image', 'field', 'divider']);
export const invoiceTemplateBlockSchema = z.object({
  id: z.string().min(1),
  type: invoiceTemplateBlockTypeSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
  content: z.string().max(10000).optional().nullable(),
  fieldKey: z.string().max(100).optional().nullable(),
  textSize: z.number().int().min(8).max(72).optional().nullable(),
  align: z.enum(['left', 'center', 'right']).optional().nullable(),
});

export const createInvoiceTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  backgroundImageUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#DC2626'),
  pageWidth: z.number().int().min(600).max(2400).default(1024),
  pageHeight: z.number().int().min(800).max(3200).default(1325),
  contentHtml: z.string().max(50000).optional().or(z.literal('')),
  blocks: z.array(invoiceTemplateBlockSchema).default([]),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateInvoiceTemplateSchema = createInvoiceTemplateSchema.partial();
export const updateInvoiceTemplateInputSchema = z.object({
  templateId: z.string().min(1),
  data: updateInvoiceTemplateSchema,
});
export const deleteInvoiceTemplateSchema = z.object({
  templateId: z.string().min(1),
});

export const generateStatementSchema = z.object({
  customerId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  sendEmail: z.boolean().default(false),
});

export const aiCollectionsQuerySchema = z.object({
  question: z.string().min(3).max(500),
});

export const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().min(1),
  status: invoiceStatus360Schema,
});
