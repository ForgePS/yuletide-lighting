import { defineConfig } from 'tinacms';

const branch =
  process.env.NEXT_PUBLIC_TINA_BRANCH ||
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

const iconOptions = [
  { label: 'Sparkles', value: 'sparkles' },
  { label: 'Credit card', value: 'credit-card' },
  { label: 'Package', value: 'package' },
  { label: 'Messages', value: 'message-square' },
  { label: 'Calendar', value: 'calendar' },
  { label: 'Image', value: 'image' },
  { label: 'Route', value: 'route' },
];

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID ?? 'b17e495a-4dd4-4314-b4c8-7e816567433b',
  token: process.env.TINA_TOKEN ?? 'local',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'home',
        label: 'Homepage',
        path: 'content/marketing',
        format: 'json',
        match: {
          include: 'home',
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          { type: 'string', name: 'eyebrow', label: 'Eyebrow', required: true },
          { type: 'string', name: 'headlinePrefix', label: 'Headline (first part)', required: true },
          { type: 'string', name: 'headlineAccent', label: 'Headline (accent)', required: true },
          { type: 'string', name: 'subheadline', label: 'Subheadline', ui: { component: 'textarea' } },
          { type: 'string', name: 'primaryCta', label: 'Primary button', required: true },
          { type: 'string', name: 'secondaryCta', label: 'Secondary button', required: true },
          {
            type: 'object',
            name: 'previewStats',
            label: 'Dashboard preview stats',
            list: true,
            fields: [
              { type: 'string', name: 'label', label: 'Label', required: true },
              { type: 'string', name: 'value', label: 'Value', required: true },
              { type: 'string', name: 'change', label: 'Change text', required: true },
            ],
          },
          { type: 'string', name: 'previewRouteText', label: 'Route preview line', required: true },
          { type: 'string', name: 'featuresTitle', label: 'Features heading', required: true },
          { type: 'string', name: 'featuresSubtitle', label: 'Features subheading', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'features',
            label: 'Feature cards',
            list: true,
            fields: [
              { type: 'string', name: 'title', label: 'Title', required: true },
              { type: 'string', name: 'desc', label: 'Description', ui: { component: 'textarea' } },
              { type: 'string', name: 'icon', label: 'Icon', options: iconOptions, required: true },
              { type: 'boolean', name: 'wide', label: 'Wide card (2 columns on large screens)' },
            ],
          },
          { type: 'string', name: 'ctaTitle', label: 'Bottom CTA heading', required: true },
          { type: 'string', name: 'ctaBody', label: 'Bottom CTA body', ui: { component: 'textarea' } },
          { type: 'string', name: 'ctaButton', label: 'Bottom CTA button', required: true },
          { type: 'string', name: 'footerText', label: 'Footer tagline', required: true },
        ],
      },
      {
        name: 'pricing',
        label: 'Pricing page',
        path: 'content/marketing',
        format: 'json',
        match: {
          include: 'pricing',
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          { type: 'string', name: 'title', label: 'Page title', required: true, isTitle: true },
          { type: 'string', name: 'subtitle', label: 'Subtitle', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'plans',
            label: 'Plans',
            list: true,
            fields: [
              { type: 'string', name: 'name', label: 'Plan name', required: true },
              { type: 'string', name: 'price', label: 'Price', required: true },
              { type: 'string', name: 'period', label: 'Billing period', required: true },
              { type: 'string', name: 'badge', label: 'Badge (optional)' },
              { type: 'boolean', name: 'highlight', label: 'Highlight plan' },
              {
                type: 'string',
                name: 'features',
                label: 'Features',
                list: true,
              },
            ],
          },
        ],
      },
    ],
  },
});
