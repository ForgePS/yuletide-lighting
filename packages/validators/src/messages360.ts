import { z } from 'zod';

export const messageChannel360Schema = z.enum(['sms', 'email', 'portal', 'internal']);
export const conversationStatusSchema = z.enum(['open', 'waiting_on_customer', 'waiting_on_staff', 'closed']);
export const inboxPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export const campaignTypeSchema = z.enum(['email', 'sms', 'mixed']);
export const campaignAudienceSchema = z.enum(['residential', 'commercial', 'hoa', 'previous_customers', 'high_value', 'at_risk']);
export const automationTriggerSchema = z.enum([
  'proposal_sent', 'proposal_viewed', 'proposal_not_approved', 'job_scheduled',
  'crew_en_route', 'crew_arrived', 'job_completed', 'invoice_created', 'invoice_viewed',
  'payment_reminder', 'payment_received', 'invoice_overdue', 'installation_completed', 'review_request',
]);
export const templateCategorySchema = z.enum([
  'proposal_follow_up', 'estimate_reminder', 'appointment_confirmation', 'crew_arrival',
  'completion_notice', 'invoice_reminder', 'review_request', 'renewal_offer',
]);

export const sendMessage360Schema = z.object({
  conversationId: z.string().optional(),
  customerId: z.string().min(1),
  channel: messageChannel360Schema,
  body: z.string().min(1).max(10000),
  subject: z.string().max(500).optional(),
  attachmentUrls: z.array(z.string().url()).default([]),
  scheduledAt: z.coerce.date().optional(),
});

export const sendBulkSms360Schema = z.object({
  name: z.string().min(1).max(200).default('Bulk SMS'),
  customerIds: z.array(z.string().min(1)).min(1).max(500),
  body: z.string().min(1).max(1600),
});

export const receiveSms360Schema = z.object({
  organizationId: z.string().optional(),
  customerId: z.string().optional(),
  fromPhone: z.string().max(40).optional(),
  body: z.string().min(1).max(5000),
  providerMessageId: z.string().max(200).optional(),
});

export const updateConversationSchema = z.object({
  conversationId: z.string().min(1),
  status: conversationStatusSchema.optional(),
  assignedUserId: z.string().optional(),
  assignedUserName: z.string().optional(),
  priority: inboxPrioritySchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const createTemplate360Schema = z.object({
  name: z.string().min(1).max(200),
  category: templateCategorySchema,
  channel: messageChannel360Schema,
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10000),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  campaignType: campaignTypeSchema,
  audience: z.array(campaignAudienceSchema).min(1),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10000),
  scheduledAt: z.coerce.date().optional(),
  seasonalType: z.enum([
    'august_early_booking', 'september_design_approval', 'october_final_booking',
    'january_storage_renewal', 'february_permanent_upgrade',
  ]).optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: automationTriggerSchema,
  channel: messageChannel360Schema,
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10000),
  delayDays: z.number().int().min(0).default(0),
});

export const sendInternalMessageSchema = z.object({
  channelId: z.string().min(1),
  body: z.string().min(1).max(10000),
  mentions: z.array(z.string()).default([]),
  attachmentUrls: z.array(z.string().url()).default([]),
});

export const createReviewRequestSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().optional(),
  channel: messageChannel360Schema.default('sms'),
  reviewUrl: z.string().url().optional(),
});

export const aiCommunicationSchema = z.object({
  prompt: z.string().min(3).max(500),
});

export const portalMessageSchema = z.object({
  customerId: z.string().min(1),
  body: z.string().min(1).max(5000),
  attachmentUrls: z.array(z.string().url()).default([]),
});

export const portalTokenMessageSchema = z.object({
  token: z.string().min(8),
  body: z.string().min(1).max(5000),
});

export const updateTemplate360Schema = createTemplate360Schema.partial().extend({
  templateId: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const deleteTemplate360Schema = z.object({ templateId: z.string().min(1) });

export const updateAutomation360Schema = createAutomationSchema.partial().extend({
  automationId: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const deleteAutomation360Schema = z.object({ automationId: z.string().min(1) });

export const updateCampaign360Schema = createCampaignSchema.partial().extend({
  campaignId: z.string().min(1),
});

export const deleteCampaign360Schema = z.object({ campaignId: z.string().min(1) });

export const deleteConversation360Schema = z.object({ conversationId: z.string().min(1) });

export const triggerAutomationSchema = z.object({
  trigger: automationTriggerSchema,
  customerId: z.string().min(1),
  vars: z.record(z.string()).default({}),
});
