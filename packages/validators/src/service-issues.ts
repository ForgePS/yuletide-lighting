import { z } from 'zod';

export const serviceIssueStatusSchema = z.enum([
  'reported',
  'triaged',
  'scheduled',
  'in_progress',
  'resolved',
  'closed',
  'cancelled',
]);

export const serviceIssuePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const serviceIssueCategorySchema = z.enum([
  'lights_out',
  'timer_issue',
  'damage',
  'loose_material',
  'weather_related',
  'customer_request',
  'warranty',
  'other',
]);

export const serviceIssueListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  status: serviceIssueStatusSchema.optional(),
  priority: serviceIssuePrioritySchema.optional(),
  customerId: z.string().optional(),
  jobId: z.string().optional(),
  warranty: z.boolean().optional(),
});

export const serviceIssueInputSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().min(1, 'Customer is required').max(200),
  propertyId: z.string().optional().or(z.literal('')),
  propertyLabel: z.string().max(240).optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
  jobTitle: z.string().max(200).optional().or(z.literal('')),
  title: z.string().min(1, 'Issue title is required').max(200),
  description: z.string().max(5000).optional().or(z.literal('')),
  category: serviceIssueCategorySchema.default('other'),
  priority: serviceIssuePrioritySchema.default('normal'),
  status: serviceIssueStatusSchema.default('reported'),
  warranty: z.boolean().default(false),
  assignedUserId: z.string().optional().or(z.literal('')),
  assignedUserName: z.string().max(200).optional().or(z.literal('')),
  scheduledAt: z.coerce.date().optional().nullable(),
  resolvedAt: z.coerce.date().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
  resolutionNotes: z.string().max(5000).optional().or(z.literal('')),
  photoUrls: z.array(z.string().url()).default([]),
  source: z.string().max(80).optional().or(z.literal('')),
});

export const updateServiceIssueInputSchema = serviceIssueInputSchema.partial();

export const serviceIssueStatusUpdateSchema = z.object({
  issueId: z.string(),
  status: serviceIssueStatusSchema,
  resolutionNotes: z.string().max(5000).optional().or(z.literal('')),
});

export type ServiceIssueInput = z.infer<typeof serviceIssueInputSchema>;
export type UpdateServiceIssueInput = z.infer<typeof updateServiceIssueInputSchema>;
