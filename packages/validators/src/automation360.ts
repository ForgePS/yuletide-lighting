import { z } from 'zod';

export const automation360TriggerSchema = z.enum([
  'new_lead_created',
  'proposal_sent',
  'proposal_viewed',
  'proposal_not_viewed_24h',
  'proposal_accepted',
  'deposit_paid',
  'job_scheduled',
  'job_completed',
  'invoice_overdue',
  'removal_completed',
  'storage_completed',
  'rebooking_season_begins',
]);

export const automationConditionOperatorSchema = z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'exists']);

export const automationActionTypeSchema = z.enum([
  'send_email',
  'send_sms',
  'create_task',
  'change_stage',
  'notify_user',
  'create_invoice',
  'create_follow_up_reminder',
]);

export const automationConditionSchema = z.object({
  field: z.string().min(1).max(100),
  operator: automationConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const automationActionSchema = z.object({
  type: automationActionTypeSchema,
  config: z.record(z.unknown()).default({}),
});

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: automation360TriggerSchema,
  description: z.string().max(500).optional().or(z.literal('')),
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1),
  active: z.boolean().default(true),
});

export const updateAutomationRuleSchema = createAutomationRuleSchema.partial().extend({
  ruleId: z.string().min(1),
});
