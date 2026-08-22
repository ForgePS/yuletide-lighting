import { z } from 'zod';

export const cmsFormFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    'text',
    'email',
    'phone',
    'textarea',
    'select',
    'checkbox',
    'radio',
    'number',
    'date',
    'file',
    'consent',
    'hidden',
    'signature',
  ]),
  label: z.string().min(1),
  name: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  helpText: z.string().optional(),
  width: z.enum(['full', 'half']).optional(),
  step: z.number().int().min(1).max(20).optional(),
  visibleWhen: z
    .object({
      field: z.string(),
      op: z.enum(['eq', 'neq', 'truthy', 'falsy']),
      value: z.string().optional(),
    })
    .nullable()
    .optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

export const cmsFormSettingsSchema = z.object({
  submitLabel: z.string(),
  successMessage: z.string(),
  redirectUrl: z.string().nullable().optional(),
  notifyEmails: z.array(z.string()),
  confirmationEmailEnabled: z.boolean(),
  confirmationSubject: z.string().optional(),
  confirmationBody: z.string().optional(),
  spamProtection: z.enum(['none', 'honeypot', 'turnstile']),
  multiStep: z.boolean(),
});

export const cmsFormUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(cmsFormFieldSchema),
  settings: cmsFormSettingsSchema,
});

export const cmsFormCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const cmsFormSubmitSchema = z.object({
  formId: z.string().min(1),
  data: z.record(z.unknown()),
  honeypot: z.string().optional(),
  captchaToken: z.string().optional(),
});

export const cmsCollectionFieldSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'rich_text', 'number', 'date', 'image', 'url', 'boolean', 'select']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const cmsCollectionCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const cmsCollectionUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(cmsCollectionFieldSchema),
});

export const cmsCollectionEntrySchema = z.object({
  id: z.string().optional(),
  collectionId: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  data: z.record(z.unknown()),
  tags: z.array(z.string()),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.date().nullable().optional(),
  scheduledAt: z.date().nullable().optional(),
});

export const cmsNoticeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['announcement_bar', 'emergency', 'promo_banner', 'modal', 'exit_intent', 'cookie']),
  enabled: z.boolean(),
  title: z.string(),
  body: z.string(),
  buttonLabel: z.string().nullable().optional(),
  buttonHref: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  priority: z.number().int(),
  startAt: z.date().nullable().optional(),
  endAt: z.date().nullable().optional(),
  targetPages: z.union([z.literal('all'), z.array(z.string())]),
  targetDevices: z.array(z.enum(['desktop', 'tablet', 'mobile'])),
  displayFrequency: z.enum(['always', 'once', 'session']),
  dismissible: z.boolean(),
});

export const cmsRedirectSchema = z.object({
  id: z.string().optional(),
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.union([z.literal(301), z.literal(302)]),
  enabled: z.boolean(),
});

export const cmsSeoGlobalsSchema = z.object({
  robotsTxt: z.string(),
  defaultTitleTemplate: z.string(),
  defaultDescription: z.string(),
  twitterHandle: z.string().nullable().optional(),
  organizationSchemaJson: z.string().nullable().optional(),
});

export const cmsMediaUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  folder: z.string().optional(),
  focalPoint: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  variants: z
    .array(z.object({ width: z.number().int().positive(), url: z.string() }))
    .nullable()
    .optional(),
});
