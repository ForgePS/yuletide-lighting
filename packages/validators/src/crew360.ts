import { z } from 'zod';

export const crewClockInSchema = z.object({
  jobId: z.string().min(1),
  clockIn: z.string().datetime(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const crewPhotoUploadSchema = z.object({
  jobId: z.string().min(1),
  url: z.string().min(1),
  photoType: z.enum(['before', 'during', 'after', 'completion']).default('during'),
  caption: z.string().max(500).optional(),
});

export const crewMaterialUsageSchema = z.object({
  jobId: z.string().min(1),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1),
    quantity: z.number().positive(),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export const crewIssueReportSchema = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: z.enum(['lights_out', 'timer_issue', 'damage', 'loose_material', 'weather_related', 'customer_request', 'warranty', 'other']).default('other'),
});

export const crewCustomerNotHomeSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export const crewSignatureSchema = z.object({
  jobId: z.string().min(1),
  customerName: z.string().min(1).max(200),
  signatureData: z.string().min(1),
});

export const crewScheduleQuerySchema = z.object({
  date: z.string().datetime().optional(),
});
