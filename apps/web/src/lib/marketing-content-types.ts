export type HomeFeature = {
  title?: string | null;
  desc?: string | null;
  icon?: string | null;
  wide?: boolean | null;
};

export type HomePreviewStat = {
  label?: string | null;
  value?: string | null;
  change?: string | null;
};

export type HomeContent = {
  eyebrow?: string | null;
  headlinePrefix?: string | null;
  headlineAccent?: string | null;
  subheadline?: string | null;
  primaryCta?: string | null;
  secondaryCta?: string | null;
  previewStats?: (HomePreviewStat | null)[] | null;
  previewRouteText?: string | null;
  featuresTitle?: string | null;
  featuresSubtitle?: string | null;
  features?: (HomeFeature | null)[] | null;
  ctaTitle?: string | null;
  ctaBody?: string | null;
  ctaButton?: string | null;
  footerText?: string | null;
};

export type PricingPlan = {
  name?: string | null;
  price?: string | null;
  period?: string | null;
  badge?: string | null;
  highlight?: boolean | null;
  features?: (string | null)[] | null;
};

export type PricingContent = {
  title?: string | null;
  subtitle?: string | null;
  plans?: (PricingPlan | null)[] | null;
};
