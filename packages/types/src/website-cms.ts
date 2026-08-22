/** Website CMS — schema-driven pages, chrome, and branding stored in Firestore. */

export type BreakpointVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export type SpacingValue = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type BlockStyle = {
  width?: 'full' | 'wide' | 'contained' | 'narrow';
  alignment?: 'left' | 'center' | 'right';
  padding?: SpacingValue;
  margin?: SpacingValue;
  background?: string | null;
  overlay?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  animation?: 'none' | 'fade' | 'slide-up';
  visibility?: BreakpointVisibility;
  customClass?: string;
  customId?: string;
};

export type CmsLink = {
  label: string;
  href: string;
  openInNewTab?: boolean;
  style?: 'primary' | 'secondary' | 'ghost' | 'link';
};

export type CmsNavItem = {
  id: string;
  label: string;
  href: string;
  openInNewTab?: boolean;
  icon?: string | null;
  children?: CmsNavItem[];
  visibility?: BreakpointVisibility;
  showWhen?: 'always' | 'logged-out' | 'logged-in';
};

export type CmsHeaderConfig = {
  sticky: boolean;
  transparent: boolean;
  logoUrl?: string | null;
  logoAlt?: string;
  navItems: CmsNavItem[];
  ctaButtons: CmsLink[];
  showPhone?: boolean;
  phoneNumber?: string | null;
  announcementBar?: {
    enabled: boolean;
    text: string;
    href?: string | null;
    background?: string | null;
    textColor?: string | null;
  } | null;
};

export type CmsFooterColumn = {
  id: string;
  title: string;
  links?: CmsLink[];
  text?: string | null;
};

export type CmsFooterConfig = {
  columns: CmsFooterColumn[];
  copyrightText: string;
  socialLinks: CmsLink[];
  background?: string | null;
  textColor?: string | null;
};

export type CmsSiteBranding = {
  companyName: string;
  primaryLogoUrl: string | null;
  alternateLogoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: number;
  containerWidth: number;
};

export type CmsSeoSettings = {
  title: string;
  description: string;
  slug: string;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  includeInSitemap?: boolean;
};

export type CmsPageStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type CmsBlockType =
  | 'hero'
  | 'rich_text'
  | 'image'
  | 'image_text'
  | 'video'
  | 'gallery'
  | 'slideshow'
  | 'map'
  | 'calendar'
  | 'testimonials'
  | 'stats'
  | 'feature_grid'
  | 'pricing_table'
  | 'faq'
  | 'cta'
  | 'contact_form'
  | 'buttons'
  | 'divider'
  | 'spacer'
  | 'custom_html'
  | 'preview_dashboard'
  | 'collection_list'
  | 'site_search';

export type CmsBlockBase = {
  id: string;
  type: CmsBlockType;
  enabled: boolean;
  label?: string;
  style?: BlockStyle;
};

export type HeroBlock = CmsBlockBase & {
  type: 'hero';
  eyebrow?: string;
  headline: string;
  headlineAccent?: string;
  subheadline?: string;
  primaryCta?: CmsLink | null;
  secondaryCta?: CmsLink | null;
  backgroundImageUrl?: string | null;
};

export type FeatureGridBlock = CmsBlockBase & {
  type: 'feature_grid';
  title?: string;
  subtitle?: string;
  features: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    wide?: boolean;
  }>;
};

export type StatsBlock = CmsBlockBase & {
  type: 'stats';
  items: Array<{ id: string; label: string; value: string; change?: string }>;
  footerText?: string;
};

export type PricingTableBlock = CmsBlockBase & {
  type: 'pricing_table';
  title?: string;
  subtitle?: string;
  plans: Array<{
    id: string;
    name: string;
    price: string;
    period: string;
    badge?: string;
    highlight?: boolean;
    features: string[];
    cta?: CmsLink | null;
  }>;
};

export type CtaBlock = CmsBlockBase & {
  type: 'cta';
  title: string;
  body?: string;
  button?: CmsLink | null;
};

export type RichTextBlock = CmsBlockBase & {
  type: 'rich_text';
  html: string;
};

export type SpacerBlock = CmsBlockBase & {
  type: 'spacer';
  height: number;
};

export type DividerBlock = CmsBlockBase & {
  type: 'divider';
};

export type CustomHtmlBlock = CmsBlockBase & {
  type: 'custom_html';
  html: string;
};

export type ButtonsBlock = CmsBlockBase & {
  type: 'buttons';
  buttons: CmsLink[];
};

export type FaqBlock = CmsBlockBase & {
  type: 'faq';
  title?: string;
  items: Array<{ id: string; question: string; answer: string }>;
};

export type PreviewDashboardBlock = CmsBlockBase & {
  type: 'preview_dashboard';
  stats: Array<{ id: string; label: string; value: string; change?: string }>;
  routeText?: string;
};

export type ImageBlock = CmsBlockBase & {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  /** Optional focal point (percent 0–100) for object-position */
  focalPoint?: { x: number; y: number } | null;
  /** Optional crop window as % of image (0–100) */
  crop?: { x: number; y: number; width: number; height: number } | null;
  /** Optional responsive variants for srcset */
  variants?: Array<{ width: number; url: string }> | null;
};

export type ImageTextBlock = CmsBlockBase & {
  type: 'image_text';
  title?: string;
  body?: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  cta?: CmsLink | null;
};

export type VideoBlock = CmsBlockBase & {
  type: 'video';
  embedUrl: string;
  title?: string;
};

export type GalleryBlock = CmsBlockBase & {
  type: 'gallery';
  images: Array<{ id: string; src: string; alt: string; caption?: string }>;
};

export type SlideshowBlock = CmsBlockBase & {
  type: 'slideshow';
  slides: Array<{ id: string; src: string; alt: string; caption?: string; href?: string }>;
  autoplay?: boolean;
  intervalMs?: number;
  showDots?: boolean;
};

export type MapBlock = CmsBlockBase & {
  type: 'map';
  lat: number;
  lng: number;
  zoom?: number;
  markerLabel?: string;
  height?: number;
};

export type CalendarBlock = CmsBlockBase & {
  type: 'calendar';
  title?: string;
  mode: 'events' | 'embed_url';
  embedUrl?: string;
  events?: Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    location?: string;
  }>;
};

export type TestimonialsBlock = CmsBlockBase & {
  type: 'testimonials';
  title?: string;
  items: Array<{ id: string; quote: string; author: string; role?: string; avatarUrl?: string }>;
};

export type ContactFormBlock = CmsBlockBase & {
  type: 'contact_form';
  title?: string;
  formId?: string | null;
  submitLabel?: string;
  successMessage?: string;
};

export type CollectionListBlock = CmsBlockBase & {
  type: 'collection_list';
  collectionId: string;
  title?: string;
  limit?: number;
  featuredOnly?: boolean;
  layout?: 'grid' | 'list';
};

export type SiteSearchBlock = CmsBlockBase & {
  type: 'site_search';
  title?: string;
  placeholder?: string;
};

export type CmsBlock =
  | HeroBlock
  | FeatureGridBlock
  | StatsBlock
  | PricingTableBlock
  | CtaBlock
  | RichTextBlock
  | SpacerBlock
  | DividerBlock
  | CustomHtmlBlock
  | ButtonsBlock
  | FaqBlock
  | PreviewDashboardBlock
  | ImageBlock
  | ImageTextBlock
  | VideoBlock
  | GalleryBlock
  | SlideshowBlock
  | MapBlock
  | CalendarBlock
  | TestimonialsBlock
  | ContactFormBlock
  | CollectionListBlock
  | SiteSearchBlock;

export type CmsBreakpointOrder = {
  desktop?: string[];
  tablet?: string[];
  mobile?: string[];
};

export type CmsPageLocaleContent = {
  title?: string;
  blocks?: CmsBlock[];
  seo?: Partial<CmsSeoSettings>;
};

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  status: CmsPageStatus;
  blocks: CmsBlock[];
  seo: CmsSeoSettings;
  scheduledPublishAt?: Date | null;
  /** YL-S28 — named footer override; null/undefined = site default */
  footerId?: string | null;
  /** YL-S30 — per-breakpoint block id order overrides */
  blockOrderByBreakpoint?: CmsBreakpointOrder | null;
  /** YL-S30 — primary locale code (default en) */
  locale?: string;
  /** YL-S30 — alternate locale overlays keyed by locale code */
  translations?: Record<string, CmsPageLocaleContent> | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  version: number;
};

/** YL-S28 — reusable block group saved to the section library */
export type CmsSavedSection = {
  id: string;
  name: string;
  description?: string;
  blocks: CmsBlock[];
  createdAt: Date;
  updatedAt: Date;
  createdByEmail?: string;
};

/** YL-S28 — named footer variant (default remains globals.footer) */
export type CmsNamedFooter = {
  id: string;
  name: string;
  footer: CmsFooterConfig;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsSiteGlobals = {
  branding: CmsSiteBranding;
  header: CmsHeaderConfig;
  footer: CmsFooterConfig;
  defaultSeo: Omit<CmsSeoSettings, 'slug'>;
  /** YL-S27 — injected into marketing page head as a style tag */
  customHeadCss?: string | null;
  /** YL-S27 — injected into marketing page as a deferred script (trusted Creator content) */
  customHeadJs?: string | null;
  /** YL-S28 — optional GTM container id (e.g. GTM-XXXX) injected when set */
  gtmContainerId?: string | null;
  /** YL-S28 — optional Meta Pixel id */
  metaPixelId?: string | null;
  /** YL-S30 — marketing theme mode */
  themeMode?: 'light' | 'dark' | 'system';
  /** YL-S30 — named color/layout preset */
  themePreset?: 'default' | 'midnight' | 'forest' | 'snow';
  /** YL-S30 — layout density / chrome template */
  layoutTemplate?: 'classic' | 'centered' | 'minimal';
  /** YL-S30 — default content locale */
  defaultLocale?: string;
  /** YL-S30 — enabled locales for language switcher */
  availableLocales?: string[];
  updatedAt: Date;
};

export type CmsPageSummary = {
  id: string;
  title: string;
  slug: string;
  status: CmsPageStatus;
  updatedAt: Date;
  version: number;
  blockCount: number;
};

export type CmsPageVersion = {
  id: string;
  pageId: string;
  version: number;
  summary: string;
  snapshot: CmsPage;
  createdAt: Date;
  createdByEmail: string;
  createdByUserId: string;
};

export const DEFAULT_SITE_BRANDING: CmsSiteBranding = {
  companyName: 'Yuletide Lighting',
  primaryLogoUrl: '/logo.png',
  alternateLogoUrl: null,
  faviconUrl: '/logo.png',
  primaryColor: '#DC2626',
  secondaryColor: '#991B1B',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFBF5',
  textColor: '#0f172a',
  linkColor: '#DC2626',
  headingFont: 'DM Sans',
  bodyFont: 'DM Sans',
  borderRadius: 12,
  containerWidth: 1152,
};

export const DEFAULT_HEADER: CmsHeaderConfig = {
  sticky: true,
  transparent: false,
  logoUrl: '/logo.png',
  logoAlt: 'Yuletide Lighting',
  navItems: [
    {
      id: 'nav-pricing',
      label: 'Pricing',
      href: '/pricing',
      showWhen: 'always',
      visibility: { desktop: true, tablet: true, mobile: false },
    },
  ],
  ctaButtons: [
    { label: 'Sign in', href: '/sign-in', style: 'ghost' },
    { label: 'Start free trial', href: '/sign-up', style: 'primary' },
  ],
  showPhone: false,
  phoneNumber: null,
  announcementBar: null,
};

export const DEFAULT_FOOTER: CmsFooterConfig = {
  columns: [
    {
      id: 'col-product',
      title: 'Product',
      links: [
        { label: 'Pricing', href: '/pricing' },
        { label: 'Sign in', href: '/sign-in' },
      ],
    },
  ],
  copyrightText: 'Built for installers who do it right.',
  socialLinks: [],
  background: null,
  textColor: null,
};

export const DEFAULT_SITE_GLOBALS: CmsSiteGlobals = {
  branding: DEFAULT_SITE_BRANDING,
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  defaultSeo: {
    title: 'Yuletide Lighting — CRM for Christmas light installers',
    description:
      'Proposals, invoicing, inventory, crew scheduling, and customer messaging for Christmas light installers.',
    ogTitle: null,
    ogDescription: null,
    ogImageUrl: null,
    noIndex: false,
    noFollow: false,
    includeInSitemap: true,
  },
  customHeadCss: null,
  customHeadJs: null,
  gtmContainerId: null,
  metaPixelId: null,
  themeMode: 'light',
  themePreset: 'default',
  layoutTemplate: 'classic',
  defaultLocale: 'en',
  availableLocales: ['en'],
  updatedAt: new Date(0),
};

export function createBlockId() {
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}
