/** Canonical demo tenant slug (YT-TOUR-S2). */
export const DEMO_TENANT_SLUG = 'yuletide-demo';

export const DEMO_ORG_DISPLAY_NAME = 'Yuletide Demo Lighting Company';

/** Non-production environment marker for demo org provisioning scripts. */
export const DEMO_ENVIRONMENT_MARKER = 'demo';

export const DEMO_HERO_CUSTOMER_REF = 'demo-hero-john-smith';

export const DEMO_HERO_PROPERTY_REF = `${DEMO_HERO_CUSTOMER_REF}-property`;

export const DEMO_HERO_PROPOSAL_REF = `${DEMO_HERO_CUSTOMER_REF}-proposal`;

export const DEMO_HERO_JOB_REF = `${DEMO_HERO_CUSTOMER_REF}-job`;

export const DEMO_HERO_INVOICE_REF = `${DEMO_HERO_CUSTOMER_REF}-invoice`;

export const DEMO_HERO_SERVICE_ISSUE_REF = `${DEMO_HERO_CUSTOMER_REF}-service-issue`;

/** Stable magic-link token for John Smith portal (demo tour only — fictional customer). */
export const DEMO_HERO_PORTAL_ACCESS_TOKEN = 'ydemo-john-smith-portal-v1';

export const DEMO_SEED_MARKER = 'yuletide-demo-v1';

/** Canonical lifecycle tour (YT-TOUR-S4). */
export const YULETIDE_LIFECYCLE_TOUR_ID = 'yuletide-customer-lifecycle';

/** Resolved demo hero record ids for multi-route tours. */
export type DemoTourFixtures = {
  heroCustomerId: string;
  heroPropertyId: string | null;
  heroProposalId: string | null;
  heroJobId: string | null;
  heroInvoiceId: string | null;
  heroServiceIssueId: string | null;
  /** Magic-link token for hero customer portal entry (demo tour). */
  heroPortalAccessToken: string;
};

/** Simulated outbound response codes — never send live traffic for demo tenants. */
export const DEMO_EMAIL_SIMULATED = 'DEMO_EMAIL_SIMULATED';
export const DEMO_SMS_SIMULATED = 'DEMO_SMS_SIMULATED';
export const DEMO_PAYMENT_SIMULATED = 'DEMO_PAYMENT_SIMULATED';
export const DEMO_REFUND_SIMULATED = 'DEMO_REFUND_SIMULATED';
export const DEMO_SIGNATURE_SIMULATED = 'DEMO_SIGNATURE_SIMULATED';

/** Public demo entry modes (YT-TOUR-S3). */
export type DemoEntryMode = 'watch' | 'guided' | 'explore';

export const DEMO_ENTRY_MODES: DemoEntryMode[] = ['watch', 'guided', 'explore'];

/** Default tour launched from /demo. */
export const DEMO_ENTRY_TOUR_ID = YULETIDE_LIFECYCLE_TOUR_ID;

export const DEMO_ENTRY_USER_EMAIL = 'demo+entry@yuletide-demo.test';

export type DemoSimulatedOutboundCode =
  | typeof DEMO_EMAIL_SIMULATED
  | typeof DEMO_SMS_SIMULATED
  | typeof DEMO_PAYMENT_SIMULATED
  | typeof DEMO_REFUND_SIMULATED
  | typeof DEMO_SIGNATURE_SIMULATED;
