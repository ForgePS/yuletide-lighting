import { z } from 'zod';

export const contactRoleSchema = z.enum([
  'primary',
  'spouse',
  'property_manager',
  'billing',
  'operations',
  'other',
]);

export const contactListFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  search: z.string().max(200).optional(),
  customerId: z.string().optional(),
});

export const contactInputSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: contactRoleSchema.default('primary'),
  title: z.string().max(120).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  phoneExtension: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  smsOptIn: z.boolean().default(true),
  emailOptIn: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  source: z.string().max(80).optional().or(z.literal('')),
});

export const updateContactInputSchema = contactInputSchema.partial();

export type ContactInput = z.infer<typeof contactInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
