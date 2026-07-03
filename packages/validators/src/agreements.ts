import { z } from 'zod';

export const multiYearAgreementStatusSchema = z.enum([
  'draft',
  'active',
  'renewal_due',
  'completed',
  'cancelled',
]);

export const multiYearAgreementListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  status: multiYearAgreementStatusSchema.optional(),
  customerId: z.string().optional(),
});

const multiYearAgreementBaseSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().min(1, 'Customer is required').max(200),
  propertyId: z.string().optional().or(z.literal('')),
  propertyLabel: z.string().max(200).optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').max(200),
  status: multiYearAgreementStatusSchema.default('draft'),
  optionCode: z.string().min(1).max(20).default('A'),
  optionLabel: z.string().min(1).max(100).default('Multi-year agreement'),
  startSeason: z.number().int().min(2000).max(2100),
  endSeason: z.number().int().min(2000).max(2100),
  annualValueCents: z.number().int().min(0).default(0),
  depositPercent: z.number().min(0).max(100).default(50),
  autoGenerateProjects: z.boolean().default(true),
  linkedProjectIds: z.array(z.string()).default([]),
  notes: z.string().max(10000).optional().or(z.literal('')),
  source: z.string().max(80).optional().or(z.literal('')),
  signedAt: z.coerce.date().optional().nullable(),
  cancelledAt: z.coerce.date().optional().nullable(),
  nextRenewalDate: z.coerce.date().optional().nullable(),
});

function refineAgreementSeasons(
  data: { startSeason?: number; endSeason?: number },
  ctx: z.RefinementCtx,
) {
  if (data.startSeason !== undefined && data.endSeason !== undefined && data.endSeason < data.startSeason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End season must be after start season', path: ['endSeason'] });
  }
}

export const multiYearAgreementInputSchema = multiYearAgreementBaseSchema.superRefine(refineAgreementSeasons);

export const updateMultiYearAgreementInputSchema = multiYearAgreementBaseSchema.partial().superRefine(refineAgreementSeasons);

export type MultiYearAgreementInput = z.infer<typeof multiYearAgreementInputSchema>;
export type UpdateMultiYearAgreementInput = z.infer<typeof updateMultiYearAgreementInputSchema>;
