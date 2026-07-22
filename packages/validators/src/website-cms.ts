import { z } from 'zod';

const spacingSchema = z
  .object({
    top: z.number().optional(),
    right: z.number().optional(),
    bottom: z.number().optional(),
    left: z.number().optional(),
  })
  .optional();

const visibilitySchema = z
  .object({
    desktop: z.boolean(),
    tablet: z.boolean(),
    mobile: z.boolean(),
  })
  .optional();

export const blockStyleSchema = z
  .object({
    width: z.enum(['full', 'wide', 'contained', 'narrow']).optional(),
    alignment: z.enum(['left', 'center', 'right']).optional(),
    padding: spacingSchema,
    margin: spacingSchema,
    background: z.string().nullable().optional(),
    overlay: z.string().nullable().optional(),
    borderColor: z.string().nullable().optional(),
    borderWidth: z.number().optional(),
    borderRadius: z.number().optional(),
    shadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    animation: z.enum(['none', 'fade', 'slide-up']).optional(),
    visibility: visibilitySchema,
    customClass: z.string().optional(),
    customId: z.string().optional(),
  })
  .optional();

export const cmsLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  openInNewTab: z.boolean().optional(),
  style: z.enum(['primary', 'secondary', 'ghost', 'link']).optional(),
});

const blockBase = {
  id: z.string().min(1),
  enabled: z.boolean(),
  label: z.string().optional(),
  style: blockStyleSchema,
};

export const cmsBlockSchema = z.discriminatedUnion('type', [
  z.object({
    ...blockBase,
    type: z.literal('hero'),
    eyebrow: z.string().optional(),
    headline: z.string(),
    headlineAccent: z.string().optional(),
    subheadline: z.string().optional(),
    primaryCta: cmsLinkSchema.nullable().optional(),
    secondaryCta: cmsLinkSchema.nullable().optional(),
    backgroundImageUrl: z.string().nullable().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('feature_grid'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    features: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
        wide: z.boolean().optional(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal('stats'),
    items: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
        change: z.string().optional(),
      }),
    ),
    footerText: z.string().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('pricing_table'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    plans: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.string(),
        period: z.string(),
        badge: z.string().optional(),
        highlight: z.boolean().optional(),
        features: z.array(z.string()),
        cta: cmsLinkSchema.nullable().optional(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal('cta'),
    title: z.string(),
    body: z.string().optional(),
    button: cmsLinkSchema.nullable().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('rich_text'),
    html: z.string(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('spacer'),
    height: z.number().min(0).max(800),
  }),
  z.object({
    ...blockBase,
    type: z.literal('divider'),
  }),
  z.object({
    ...blockBase,
    type: z.literal('custom_html'),
    html: z.string(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('buttons'),
    buttons: z.array(cmsLinkSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal('faq'),
    title: z.string().optional(),
    items: z.array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal('preview_dashboard'),
    stats: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
        change: z.string().optional(),
      }),
    ),
    routeText: z.string().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('image'),
    src: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('image_text'),
    title: z.string().optional(),
    body: z.string().optional(),
    imageUrl: z.string(),
    imageAlt: z.string(),
    imagePosition: z.enum(['left', 'right']),
    cta: cmsLinkSchema.nullable().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('video'),
    embedUrl: z.string(),
    title: z.string().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('gallery'),
    images: z.array(
      z.object({
        id: z.string(),
        src: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal('testimonials'),
    title: z.string().optional(),
    items: z.array(
      z.object({
        id: z.string(),
        quote: z.string(),
        author: z.string(),
        role: z.string().optional(),
        avatarUrl: z.string().optional(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal('contact_form'),
    title: z.string().optional(),
    formId: z.string().nullable().optional(),
    submitLabel: z.string().optional(),
    successMessage: z.string().optional(),
  }),
  z.object({
    ...blockBase,
    type: z.literal('collection_list'),
    collectionId: z.string().min(1),
    title: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    featuredOnly: z.boolean().optional(),
    layout: z.enum(['grid', 'list']).optional(),
  }),
]);

export const cmsSeoSchema = z.object({
  title: z.string(),
  description: z.string(),
  slug: z.string().min(1),
  canonicalUrl: z.string().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImageUrl: z.string().nullable().optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  includeInSitemap: z.boolean().optional(),
});

export const cmsPageUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  blocks: z.array(cmsBlockSchema),
  seo: cmsSeoSchema,
  scheduledPublishAt: z.date().nullable().optional(),
  changeSummary: z.string().optional(),
});

export const cmsPageCreateSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  duplicateFromId: z.string().optional(),
});

const navItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    href: z.string(),
    openInNewTab: z.boolean().optional(),
    icon: z.string().nullable().optional(),
    children: z.array(navItemSchema).optional(),
    visibility: visibilitySchema,
    showWhen: z.enum(['always', 'logged-out', 'logged-in']).optional(),
  }),
);

export const cmsSiteGlobalsSchema = z.object({
  branding: z.object({
    companyName: z.string().min(1),
    primaryLogoUrl: z.string().nullable(),
    alternateLogoUrl: z.string().nullable(),
    faviconUrl: z.string().nullable(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),
    linkColor: z.string(),
    headingFont: z.string(),
    bodyFont: z.string(),
    borderRadius: z.number(),
    containerWidth: z.number(),
  }),
  header: z.object({
    sticky: z.boolean(),
    transparent: z.boolean(),
    logoUrl: z.string().nullable().optional(),
    logoAlt: z.string().optional(),
    navItems: z.array(navItemSchema),
    ctaButtons: z.array(cmsLinkSchema),
    showPhone: z.boolean().optional(),
    phoneNumber: z.string().nullable().optional(),
    announcementBar: z
      .object({
        enabled: z.boolean(),
        text: z.string(),
        href: z.string().nullable().optional(),
        background: z.string().nullable().optional(),
        textColor: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  }),
  footer: z.object({
    columns: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        links: z.array(cmsLinkSchema).optional(),
        text: z.string().nullable().optional(),
      }),
    ),
    copyrightText: z.string(),
    socialLinks: z.array(cmsLinkSchema),
    background: z.string().nullable().optional(),
    textColor: z.string().nullable().optional(),
  }),
  defaultSeo: z.object({
    title: z.string(),
    description: z.string(),
    canonicalUrl: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    ogImageUrl: z.string().nullable().optional(),
    noIndex: z.boolean().optional(),
    noFollow: z.boolean().optional(),
    includeInSitemap: z.boolean().optional(),
  }),
});

export const crmNavItemSchema = z.object({
  key: z.string(),
  label: z.string().min(1),
  href: z.string().min(1),
  enabled: z.boolean(),
  order: z.number().int(),
  section: z
    .enum(['home', 'sales', 'operations', 'inventory', 'finance', 'marketing', 'administration'])
    .optional(),
  moduleKey: z.string().nullable().optional(),
  permissionResource: z.string().nullable().optional(),
});

export const crmCustomFieldSchema = z.object({
  id: z.string(),
  entity: z.enum(['customer', 'property', 'job', 'proposal', 'invoice', 'contact']),
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'textarea']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  enabled: z.boolean(),
  order: z.number().int(),
});

export const crmUiConfigUpdateSchema = z.object({
  navItems: z.array(crmNavItemSchema),
  labelOverrides: z.record(z.string()),
  theme: z.object({
    sidebarBackground: z.string().nullable().optional(),
    sidebarText: z.string().nullable().optional(),
    accentColor: z.string().nullable().optional(),
    useOrgBrandingInApp: z.boolean().optional(),
  }),
  customFields: z.array(crmCustomFieldSchema),
});
