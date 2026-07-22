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
  | 'collection_list';

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
  | TestimonialsBlock
  | ContactFormBlock
  | CollectionListBlock;

export type CmsPage = {
  id: string;
  title: string;
  slug: string;
  status: CmsPageStatus;
  blocks: CmsBlock[];
  seo: CmsSeoSettings;
  scheduledPublishAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  version: number;
};

export type CmsSiteGlobals = {
  branding: CmsSiteBranding;
  header: CmsHeaderConfig;
  footer: CmsFooterConfig;
  defaultSeo: Omit<CmsSeoSettings, 'slug'>;
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
  primaryLogoUrl: null,
  alternateLogoUrl: null,
  faviconUrl: null,
  primaryColor: '#0f766e',
  secondaryColor: '#134e4a',
  accentColor: '#f59e0b',
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  linkColor: '#0f766e',
  headingFont: 'Geist Sans',
  bodyFont: 'Geist Sans',
  borderRadius: 12,
  containerWidth: 1152,
};

export const DEFAULT_HEADER: CmsHeaderConfig = {
  sticky: true,
  transparent: false,
  logoUrl: null,
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
  updatedAt: new Date(0),
};

export function createBlockId() {
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}
