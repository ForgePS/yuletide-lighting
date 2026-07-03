import { z } from 'zod';

export const timeEntryStatusSchema = z.enum(['active', 'submitted', 'approved', 'rejected']);

export const timeEntryWorkTypeSchema = z.enum([
  'installation',
  'takedown',
  'service',
  'project_prep',
  'drive_time',
  'warehouse',
  'admin',
  'other',
]);

export const timeClockListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  status: timeEntryStatusSchema.optional(),
  userId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const timeClockEntryBaseSchema = z.object({
  userId: z.string().optional().or(z.literal('')),
  userName: z.string().min(1, 'Employee is required').max(200),
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
  jobTitle: z.string().max(200).optional().or(z.literal('')),
  workType: timeEntryWorkTypeSchema.default('installation'),
  status: timeEntryStatusSchema.default('submitted'),
  clockIn: z.coerce.date(),
  clockOut: z.coerce.date().optional().nullable(),
  breakMinutes: z.number().int().min(0).max(720).default(0),
  hourlyRateCents: z.number().int().min(0).default(0),
  notes: z.string().max(5000).optional().or(z.literal('')),
  startLocation: z.string().max(500).optional().or(z.literal('')),
  endLocation: z.string().max(500).optional().or(z.literal('')),
});

function refineClockRange(data: { clockIn?: Date; clockOut?: Date | null }, ctx: z.RefinementCtx) {
  if (data.clockIn && data.clockOut && data.clockOut < data.clockIn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Clock out must be after clock in', path: ['clockOut'] });
  }
}

export const timeClockEntryInputSchema = timeClockEntryBaseSchema.superRefine(refineClockRange);

export const updateTimeClockEntryInputSchema = timeClockEntryBaseSchema.partial().superRefine(refineClockRange);

export const clockInInputSchema = z.object({
  userId: z.string().optional().or(z.literal('')),
  userName: z.string().min(1).max(200),
  workType: timeEntryWorkTypeSchema.default('installation'),
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
  jobTitle: z.string().max(200).optional().or(z.literal('')),
  startLocation: z.string().max(500).optional().or(z.literal('')),
});

export type TimeClockEntryInput = z.infer<typeof timeClockEntryInputSchema>;
export type UpdateTimeClockEntryInput = z.infer<typeof updateTimeClockEntryInputSchema>;
export type ClockInInput = z.infer<typeof clockInInputSchema>;
