import { z } from 'zod';

export const storageRecordTypeSchema = z.enum(['customer_owned', 'company_owned', 'mixed']);
export const storageRecordStatusSchema = z.enum(['stored', 'pulled', 'discarded', 'returned']);
export const storedItemConditionSchema = z.enum(['good', 'fair', 'damaged', 'discard']);

export const createStorageRecordSchema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
  storageType: storageRecordTypeSchema.default('customer_owned'),
  binNumber: z.string().max(50).optional().or(z.literal('')),
  locationId: z.string().max(100).optional().or(z.literal('')),
  rack: z.string().max(50).optional().or(z.literal('')),
  shelf: z.string().max(50).optional().or(z.literal('')),
  conditionNotes: z.string().max(5000).optional().or(z.literal('')),
  photos: z.array(z.string()).default([]),
  storageFeeCents: z.number().int().min(0).optional().nullable(),
  agreementSignedAt: z.coerce.date().optional().nullable(),
});

export const updateStorageRecordSchema = z.object({
  recordId: z.string().min(1),
  storageType: storageRecordTypeSchema.optional(),
  binNumber: z.string().max(50).optional().or(z.literal('')),
  locationId: z.string().max(100).optional().or(z.literal('')),
  rack: z.string().max(50).optional().or(z.literal('')),
  shelf: z.string().max(50).optional().or(z.literal('')),
  status: storageRecordStatusSchema.optional(),
  conditionNotes: z.string().max(5000).optional().or(z.literal('')),
  photos: z.array(z.string()).optional(),
  storageFeeCents: z.number().int().min(0).optional().nullable(),
  agreementSignedAt: z.coerce.date().optional().nullable(),
  pulledAt: z.coerce.date().optional().nullable(),
});

export const createStoredItemSchema = z.object({
  recordId: z.string().min(1),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).default(1),
  condition: storedItemConditionSchema.default('good'),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

export const updateStoredItemSchema = z.object({
  recordId: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(1).optional(),
  condition: storedItemConditionSchema.optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

export const storagePullSheetSchema = z.object({
  customerId: z.string().optional(),
  jobId: z.string().optional(),
  date: z.string().optional(),
});

export const createStorageFromRemovalSchema = z.object({
  jobId: z.string().min(1),
  binNumber: z.string().max(50).optional().or(z.literal('')),
  locationId: z.string().max(100).optional().or(z.literal('')),
});
