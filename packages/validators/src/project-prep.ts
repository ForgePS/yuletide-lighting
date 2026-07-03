import { z } from 'zod';

export const projectPrepStatusSchema = z.enum([
  'pending',
  'pulling',
  'partially_pulled',
  'to_be_ordered',
  'ordered',
  'checked_in',
  'packed',
  'ready',
  'cancelled',
]);

export const projectPrepListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  status: projectPrepStatusSchema.optional(),
  customerId: z.string().optional(),
  jobId: z.string().optional(),
});

export const projectPrepItemInputSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  proposalId: z.string().optional().or(z.literal('')),
  inventoryItemId: z.string().optional().or(z.literal('')),
  sku: z.string().max(80).optional().or(z.literal('')),
  itemName: z.string().min(1, 'Item name is required').max(200),
  category: z.string().max(120).optional().or(z.literal('')),
  status: projectPrepStatusSchema.default('pending'),
  quantityNeeded: z.number().min(0).default(1),
  quantityPulled: z.number().min(0).default(0),
  quantityOrdered: z.number().min(0).default(0),
  quantityCheckedIn: z.number().min(0).default(0),
  storageLocation: z.string().max(200).optional().or(z.literal('')),
  truckId: z.string().optional().or(z.literal('')),
  truckName: z.string().max(200).optional().or(z.literal('')),
  vendorName: z.string().max(200).optional().or(z.literal('')),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  source: z.string().max(80).optional().or(z.literal('')),
});

export const updateProjectPrepItemInputSchema = projectPrepItemInputSchema.partial();

export const projectPrepStatusUpdateSchema = z.object({
  prepItemId: z.string(),
  status: projectPrepStatusSchema,
  quantityPulled: z.number().min(0).optional(),
  quantityOrdered: z.number().min(0).optional(),
  quantityCheckedIn: z.number().min(0).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

export type ProjectPrepItemInput = z.infer<typeof projectPrepItemInputSchema>;
export type UpdateProjectPrepItemInput = z.infer<typeof updateProjectPrepItemInputSchema>;
