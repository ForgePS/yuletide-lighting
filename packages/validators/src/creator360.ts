import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().url().max(500).nullable(),
);

export const creatorOrgListSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['all', 'active', 'trialing', 'past_due', 'canceled', 'locked', 'none']).default('all'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const creatorUserListSchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const creatorUpdateOrgSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  subscriptionStatus: z.enum(['none', 'trialing', 'active', 'past_due', 'canceled', 'locked']).optional(),
  subscriptionPlan: z.enum(['monthly', 'yearly']).nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});

export const creatorExtendTrialSchema = z.object({
  organizationId: z.string().min(1),
  additionalDays: z.number().int().min(1).max(365),
  note: z.string().max(2000).optional(),
});

export const creatorSubscriptionListSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['all', 'active', 'trialing', 'past_due', 'canceled', 'locked', 'none', 'no_access']).default('all'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const creatorSubscriptionPresetSchema = z.object({
  organizationId: z.string().min(1),
  preset: z.enum(['start_trial', 'activate_monthly', 'activate_yearly', 'complimentary', 'mark_past_due', 'cancel', 'reactivate']),
  days: z.number().int().min(1).max(730).optional(),
  note: z.string().max(2000).optional(),
});

export const platformSettingsSchema = z.object({
  productName: z.string().min(1).max(120),
  productLabel: z.string().min(1).max(120),
  tagline: z.string().max(300),
  platformLogoUrl: optionalUrl.optional(),
  version: z.string().max(40),
  status: z.enum(['active', 'maintenance', 'beta']),
  marketingUrl: optionalUrl.optional(),
  hostingUrl: optionalUrl.optional(),
  docsUrl: optionalUrl.optional(),
  availableModules: z.array(z.enum([
    'pipeline', 'customers', 'proposals', 'invoices', 'inventory', 'jobs', 'crew',
    'schedule', 'messages', 'mockups', 'reports', 'automation', 'commercial',
    'storage', 'rebooking', 'reviews', 'time_clock', 'routes',
  ])).min(1),
  signupEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500),
  defaultTrialDays: z.number().int().min(0).max(90),
  supportEmail: z.string().email().max(200),
  announcementBanner: z.string().max(500).nullable().optional(),
  platformCreatorEmails: z.array(z.string().email().max(200)).optional(),
  platformCreatorUids: z.array(z.string().min(1).max(128)).optional(),
});

export const creatorProvisionOrgSchema = z.object({
  companyName: z.string().min(1).max(200),
  ownerEmail: z.string().email().max(200).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  note: z.string().max(2000).optional(),
});

export const creatorOrgModulesSchema = z.object({
  organizationId: z.string().min(1),
  enabledModules: z.array(z.enum([
    'pipeline', 'customers', 'proposals', 'invoices', 'inventory', 'jobs', 'crew',
    'schedule', 'messages', 'mockups', 'reports', 'automation', 'commercial',
    'storage', 'rebooking', 'reviews', 'time_clock', 'routes',
  ])),
  note: z.string().max(2000).optional(),
});
