/** Customer Portal account model + feature entitlements (Phase 1). */

export type PortalAccountStatus =
  | 'not_invited'
  | 'invitation_pending'
  | 'active'
  | 'locked'
  | 'suspended'
  | 'archived';

export type PortalUserRole =
  | 'account_owner'
  | 'authorized_contact'
  | 'billing_contact'
  | 'property_contact'
  | 'view_only';

export type PortalUserStatus = 'invited' | 'active' | 'locked' | 'suspended';

export type PortalFeatureKey =
  | 'dashboard'
  | 'properties'
  | 'consultations'
  | 'mockups'
  | 'proposals'
  | 'agreements'
  | 'e_sign'
  | 'billing'
  | 'online_payments'
  | 'scheduling'
  | 'install_tracking'
  | 'service_requests'
  | 'takedowns'
  | 'storage'
  | 'messaging'
  | 'documents'
  | 'reviews'
  | 'referrals'
  | 'rebooking';

export const PORTAL_FEATURES: Array<{ key: PortalFeatureKey; label: string; description: string }> =
  [
    { key: 'dashboard', label: 'Customer Dashboard', description: 'Portal home and overview' },
    { key: 'properties', label: 'Properties', description: 'View customer properties' },
    { key: 'consultations', label: 'Consultations', description: 'Consultation history' },
    { key: 'mockups', label: 'Designs and Mockups', description: 'View and approve designs' },
    { key: 'proposals', label: 'Proposals', description: 'View and approve proposals' },
    { key: 'agreements', label: 'Agreements', description: 'View multi-year agreements' },
    { key: 'e_sign', label: 'Electronic Signatures', description: 'Sign proposals and agreements' },
    { key: 'billing', label: 'Billing', description: 'View invoices and balances' },
    { key: 'online_payments', label: 'Online Payments', description: 'Pay invoices online' },
    { key: 'scheduling', label: 'Scheduling', description: 'View upcoming appointments' },
    {
      key: 'install_tracking',
      label: 'Installation Tracking',
      description: 'Track install job status',
    },
    { key: 'service_requests', label: 'Service Requests', description: 'Submit service issues' },
    { key: 'takedowns', label: 'Takedowns', description: 'View takedown schedule' },
    { key: 'storage', label: 'Customer Storage', description: 'View seasonal storage' },
    { key: 'messaging', label: 'Messaging', description: 'Message your lighting company' },
    { key: 'documents', label: 'Documents', description: 'View shared documents' },
    { key: 'reviews', label: 'Reviews', description: 'Leave reviews' },
    { key: 'referrals', label: 'Referrals', description: 'Referral program' },
    { key: 'rebooking', label: 'Rebooking', description: 'Rebook for next season' },
  ];

export const DEFAULT_PORTAL_FEATURES: PortalFeatureKey[] = PORTAL_FEATURES.map((f) => f.key);

/** Default features enabled for new tenant portal settings (Phase 1 + 2 surfaces). */
export const PHASE1_ACTIVE_PORTAL_FEATURES: PortalFeatureKey[] = [
  'dashboard',
  'properties',
  'consultations',
  'mockups',
  'proposals',
  'agreements',
  'e_sign',
  'billing',
  'online_payments',
  'scheduling',
  'install_tracking',
  'service_requests',
  'takedowns',
  'storage',
  'messaging',
  'documents',
  'reviews',
  'referrals',
  'rebooking',
];

export type PortalAccount = {
  id: string;
  organizationId: string;
  customerId: string;
  portalEnabled: boolean;
  status: PortalAccountStatus;
  /**
   * Legacy plaintext magic token (P2-S7: new writes must be null; prefer accessTokenHash).
   * May still exist on pre-migration accounts during COMPATIBILITY mode.
   */
  accessToken?: string | null;
  /** Canonical hash `v1:<hex>` of magic access token (P2-S7). */
  accessTokenHash?: string | null;
  /** Hash algorithm version for fail-closed unknown versions. */
  accessTokenHashVersion?: number | null;
  primaryPortalUserId?: string | null;
  invitedAt?: Date | null;
  activatedAt?: Date | null;
  suspendedAt?: Date | null;
  suspendedBy?: string | null;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  lastLoginAt?: Date | null;
  /** Bumped to invalidate all portal sessions for this account. */
  sessionVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PortalUser = {
  id: string;
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  contactId?: string | null;
  /** Firebase Auth UID when claimed (Phase 2). Never client-assigned. */
  authUserId?: string | null;
  role: PortalUserRole;
  status: PortalUserStatus;
  propertyIds: string[];
  permissions: string[];
  displayName?: string | null;
  email?: string | null;
  normalizedEmail?: string | null;
  invitationStatus?: 'none' | 'pending' | 'consumed' | 'revoked' | 'expired' | 'replaced' | null;
  invitationSentAt?: Date | null;
  invitationExpiresAt?: Date | null;
  invitationConsumedAt?: Date | null;
  invitationTokenHash?: string | null;
  claimedAt?: Date | null;
  lastLoginAt?: Date | null;
  failedVerificationCount?: number;
  lockedUntil?: Date | null;
  suspendedAt?: Date | null;
  suspendedBy?: string | null;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  sessionVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

/** Dedicated portal session (separate from staff AuthContext). */
export type PortalSessionContext = {
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
  role: PortalUserRole;
  enabledFeatures: PortalFeatureKey[];
  sessionVersion: number;
};

export type PortalTimelineEvent = {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  eventType: string;
  title: string;
  description?: string | null;
  relatedRecordType?: string | null;
  relatedRecordId?: string | null;
  customerVisible: boolean;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PortalNotification = {
  id: string;
  organizationId: string;
  portalUserId: string;
  customerId: string;
  category: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Staff-managed QR — URL is /portal/access/{rawToken}; only tokenHash is stored at rest. */
export type PortalQrCodeType =
  | 'customer_portal'
  | 'property'
  | 'proposal'
  | 'invoice'
  | 'service_request'
  | 'installation'
  | 'takedown'
  | 'rebooking';

export type PortalQrCodeStatus =
  | 'draft'
  | 'active'
  | 'used_for_activation'
  | 'reusable'
  | 'expired'
  | 'revoked'
  | 'replaced'
  | 'suspended'
  | 'invalid';

export type PortalQrAccessMode = 'activation' | 'authenticated_deep_link' | 'portal_home';

export type PortalQrCode = {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  portalAccountId?: string | null;
  type: PortalQrCodeType;
  targetRecordId?: string | null;
  /** SHA-256 hex of the raw access token. Raw token is never stored after generation. */
  tokenHash: string;
  tokenVersion: number;
  /** Legacy plaintext token (migration only). */
  token?: string | null;
  status: PortalQrCodeStatus;
  accessMode: PortalQrAccessMode;
  reusable: boolean;
  requireIdentityVerification: boolean;
  expiresAt?: Date | null;
  activatedAt?: Date | null;
  revokedAt?: Date | null;
  replacedByQrCodeId?: string | null;
  replacesId?: string | null;
  label?: string | null;
  internalDescription?: string | null;
  campaignId?: string | null;
  printTemplateId?: string | null;
  scanCount: number;
  failedVerificationCount: number;
  lastScannedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PortalQrValidationResult =
  | 'valid'
  | 'expired'
  | 'revoked'
  | 'invalid'
  | 'tenant_disabled'
  | 'portal_suspended';

export type PortalQrAuthResult =
  | 'already_authenticated'
  | 'sign_in_required'
  | 'verification_required'
  | 'verification_failed'
  | 'activated';

export type PortalQrScanEvent = {
  id: string;
  organizationId: string;
  qrCodeId: string;
  customerId: string;
  propertyId?: string | null;
  scannedAt: Date;
  validationResult: PortalQrValidationResult;
  authenticationResult?: PortalQrAuthResult | null;
  deviceClass?: 'phone' | 'tablet' | 'desktop' | 'unknown' | null;
  browserFamily?: string | null;
  operatingSystemFamily?: string | null;
  userAgent?: string | null;
  failureReason?: string | null;
  diagnosticReference: string;
  createdAt: Date;
};

export type PortalQrAuditAction =
  | 'generated'
  | 'printed'
  | 'downloaded'
  | 'emailed'
  | 'sms_sent'
  | 'scanned'
  | 'verification_attempted'
  | 'verification_failed'
  | 'activated'
  | 'expired'
  | 'revoked'
  | 'replaced'
  | 'bulk_generated'
  | 'settings_changed';

export type PortalQrAuditEvent = {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  qrCodeId?: string | null;
  action: PortalQrAuditAction;
  userId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  batchId?: string | null;
  createdAt: Date;
};

/** Safe public customer payload — never includes notes, costs, tokens, or pipeline internals. */
export type PortalCustomerPublic = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PortalOrgPublic = {
  id: string;
  companyName: string;
  brandColor?: string | null;
  logoUrl?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
};

export type PortalNavItem = {
  key: PortalFeatureKey | 'notifications' | 'home';
  label: string;
  href: string;
  enabled: boolean;
};
