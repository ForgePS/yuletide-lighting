import { z } from 'zod';

export const importSourceSchema = z.enum(['csv']);
export const importEntitySchema = z.enum(['customers', 'contacts', 'projects', 'invoices', 'inventory']);

export const csvRowSchema = z.record(z.string(), z.string());

export const importPreviewInputSchema = z.object({
  source: importSourceSchema.default('csv'),
  entity: importEntitySchema,
  rows: z.array(csvRowSchema).min(1).max(5000),
});

export const importRunInputSchema = importPreviewInputSchema.extend({
  skipDuplicates: z.boolean().default(true),
});

export type ImportPreviewInput = z.infer<typeof importPreviewInputSchema>;
export type ImportRunInput = z.infer<typeof importRunInputSchema>;
