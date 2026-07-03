import { z } from 'zod';

export const rebookingCampaignStatusSchema = z.enum(['draft', 'active', 'paused', 'completed']);
export const rebookingRecordStatusSchema = z.enum([
  'not_sent', 'sent', 'opened', 'rebooked', 'upgrade_requested', 'declined', 'no_response',
]);

export const createRebookingCampaignSchema = z.object({
  seasonYear: z.number().int().min(2020).max(2100),
  name: z.string().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

export const updateRebookingCampaignSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  status: rebookingCampaignStatusSchema.optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

export const updateRebookingRecordSchema = z.object({
  recordId: z.string().min(1),
  status: rebookingRecordStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
  preferredInstallDate: z.coerce.date().optional().nullable(),
  preferredMonth: z.string().max(40).optional(),
});

export const processRebookSchema = z.object({
  recordId: z.string().min(1),
  sameDesign: z.boolean().default(true),
  upgradeRequested: z.boolean().default(false),
});

export const portalOneClickRebookSchema = z.object({
  token: z.string().min(8),
  sameDesign: z.boolean().default(true),
  upgradeRequested: z.boolean().default(false),
  preferredMonth: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});
