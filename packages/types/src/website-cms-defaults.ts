import type { CmsBlock, CmsPage, CmsSiteGlobals } from './website-cms';
import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_SITE_BRANDING,
  DEFAULT_SITE_GLOBALS,
  createBlockId,
} from './website-cms';

function bid() {
  return createBlockId();
}

export function buildDefaultHomePage(): CmsPage {
  const now = new Date();
  const blocks: CmsBlock[] = [
    {
      id: bid(),
      type: 'hero',
      enabled: true,
      label: 'Hero',
      eyebrow: 'Built for Christmas light installers',
      headline: 'Your install season,',
      headlineAccent: 'finally organized',
      subheadline:
        'Proposals, invoicing, inventory, crew scheduling, and customer messaging in one beautiful workspace — so you can focus on the lights, not the paperwork.',
      primaryCta: { label: 'Start 14-day free trial', href: '/sign-up', style: 'primary' },
      secondaryCta: { label: 'View pricing', href: '/pricing', style: 'secondary' },
    },
    {
      id: bid(),
      type: 'preview_dashboard',
      enabled: true,
      label: 'Product preview',
      stats: [
        { id: bid(), label: 'Revenue', value: '$48,250', change: '+12%' },
        { id: bid(), label: 'Active jobs', value: '23', change: '6 today' },
        { id: bid(), label: 'Conversion', value: '68%', change: '+4 pts' },
      ],
      routeText: "Today's route optimized — 8 stops, 142 mi",
    },
    {
      id: bid(),
      type: 'feature_grid',
      enabled: true,
      label: 'Features',
      title: 'Everything you need for peak season',
      subtitle: 'From first quote to takedown — one system your office and crew actually use.',
      features: [
        {
          id: bid(),
          title: 'Proposals that close',
          description: 'Branded quotes with multi-year pricing and mockups — send from the truck in minutes.',
          icon: 'sparkles',
          wide: true,
        },
        {
          id: bid(),
          title: 'Get paid faster',
          description: 'Card and ACH invoices with deposits before install.',
          icon: 'credit-card',
        },
        {
          id: bid(),
          title: 'Inventory you trust',
          description: 'Real-time stock, reservations, and low-stock alerts.',
          icon: 'package',
        },
        {
          id: bid(),
          title: 'Unified inbox',
          description: 'SMS, email, and portal notes with templates.',
          icon: 'message-square',
        },
        {
          id: bid(),
          title: 'Crew scheduling',
          description: 'Calendar, assignments, and optimized routes.',
          icon: 'calendar',
        },
        {
          id: bid(),
          title: 'Mockup editor',
          description: 'Show clients the finished look before install day.',
          icon: 'image',
        },
      ],
    },
    {
      id: bid(),
      type: 'cta',
      enabled: true,
      label: 'Bottom CTA',
      title: 'Ready before the rush hits?',
      body: 'Set up in minutes. No credit card required for your 14-day trial.',
      button: { label: 'Get started free', href: '/sign-up', style: 'primary' },
    },
  ];

  return {
    id: 'page_home',
    title: 'Home',
    slug: 'home',
    status: 'published',
    blocks,
    seo: {
      title: 'Yuletide Lighting — CRM for Christmas light installers',
      description:
        'Proposals, invoicing, inventory, crew scheduling, and customer messaging for Christmas light installers.',
      slug: 'home',
      includeInSitemap: true,
    },
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    version: 1,
  };
}

export function buildDefaultPricingPage(): CmsPage {
  const now = new Date();
  return {
    id: 'page_pricing',
    title: 'Pricing',
    slug: 'pricing',
    status: 'published',
    blocks: [
      {
        id: bid(),
        type: 'pricing_table',
        enabled: true,
        label: 'Plans',
        title: 'Simple pricing for growing installers',
        subtitle: '14-day free trial. No credit card required to start.',
        plans: [
          {
            id: bid(),
            name: 'Monthly',
            price: '$75',
            period: 'per month',
            highlight: false,
            features: [
              '10 users included',
              'Additional users $7/mo each',
              'Unlimited customers & proposals',
              'Inventory & scheduling',
              'Crew mobile app',
            ],
            cta: { label: 'Start free trial', href: '/sign-up', style: 'secondary' },
          },
          {
            id: bid(),
            name: 'Annual',
            price: '$750',
            period: 'per year ($62.50/mo)',
            badge: 'Save $150',
            highlight: true,
            features: [
              'Everything in monthly',
              'Priority support',
              'Onboarding call',
              'Best for full-season teams',
            ],
            cta: { label: 'Start free trial', href: '/sign-up', style: 'primary' },
          },
        ],
      },
    ],
    seo: {
      title: 'Pricing — Yuletide Lighting',
      description: 'Simple monthly and annual pricing for Christmas light installer teams.',
      slug: 'pricing',
      includeInSitemap: true,
    },
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    version: 1,
  };
}

export function buildDefaultSiteGlobals(): CmsSiteGlobals {
  return {
    ...DEFAULT_SITE_GLOBALS,
    branding: { ...DEFAULT_SITE_BRANDING },
    header: {
      ...DEFAULT_HEADER,
      navItems: DEFAULT_HEADER.navItems.map((i) => ({ ...i })),
      ctaButtons: DEFAULT_HEADER.ctaButtons.map((b) => ({ ...b })),
    },
    footer: {
      ...DEFAULT_FOOTER,
      columns: DEFAULT_FOOTER.columns.map((c) => ({
        ...c,
        links: c.links?.map((l) => ({ ...l })),
      })),
      copyrightText: 'Built for installers who do it right.',
    },
    updatedAt: new Date(),
  };
}
