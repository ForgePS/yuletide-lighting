/** Company Setup step ids (YT-TOUR-S6). */
export const COMPANY_SETUP_STEP_IDS = [
  'company_profile',
  'branding',
  'business_address',
  'service_areas',
  'users',
  'crews',
  'services',
  'pricing',
  'tax_settings',
  'payment_settings',
  'inventory',
  'customer_import',
  'first_customer',
  'first_proposal',
  'scheduling',
  'launch_readiness',
] as const;

export type CompanySetupStepId = (typeof COMPANY_SETUP_STEP_IDS)[number];

export const SKIPPABLE_COMPANY_SETUP_STEPS: CompanySetupStepId[] = [
  'customer_import',
  'inventory',
  'services',
];

export type OnboardingStatus = 'not-started' | 'in-progress' | 'complete';

export type CompanySetupCategory =
  | 'foundation'
  | 'team'
  | 'commercial'
  | 'operations'
  | 'launch';

export const COMPANY_SETUP_VERSION = 1;
