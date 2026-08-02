import { z } from 'zod';

export const portalFeatureKeySchema = z.enum([
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
]);

export const portalAccountStatusSchema = z.enum([
  'not_invited',
  'invitation_pending',
  'active',
  'locked',
  'suspended',
  'archived',
]);

export const portalTokenInputSchema = z.object({
  token: z.string().min(8).max(128).optional(),
});

export const portalServiceRequestSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().optional(),
  propertyId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  accessInstructions: z.string().max(1000).optional(),
  locationNote: z.string().max(500).optional(),
  photoUrls: z.array(z.string().min(1).max(500)).max(6).optional(),
});

export const portalUploadPhotoSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  dataBase64: z.string().min(1).max(7_000_000),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  filename: z.string().max(120).optional(),
});

export const portalRebookSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  notes: z.string().max(2000).optional(),
  preferredMonth: z.string().max(40).optional(),
  sameDesign: z.boolean().optional(),
  upgradeRequested: z.boolean().optional(),
});

export const portalEnableSchema = z.object({
  customerId: z.string().min(1),
});

export const portalAccountActionSchema = z.object({
  customerId: z.string().min(1),
});

export const portalMarkNotificationReadSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  notificationId: z.string().min(1),
});

export const portalScheduleRequestSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  appointmentType: z.enum([
    'estimate_visit',
    'design_consultation',
    'installation',
    'takedown',
    'service_call',
  ]),
  propertyId: z.string().optional(),
  preferredStartAt: z.coerce.date().nullable().optional(),
  preferredEndAt: z.coerce.date().nullable().optional(),
  preferredWindows: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const portalJobDetailSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  jobId: z.string().min(1),
});

export const portalQrGenerateSchema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  type: z
    .enum([
      'customer_portal',
      'property',
      'proposal',
      'invoice',
      'service_request',
      'installation',
      'takedown',
      'rebooking',
    ])
    .optional(),
  targetRecordId: z.string().optional().nullable(),
  label: z.string().max(120).nullable().optional(),
  internalDescription: z.string().max(500).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  reusable: z.boolean().optional(),
  requireIdentityVerification: z.boolean().optional(),
  accessMode: z.enum(['activation', 'authenticated_deep_link', 'portal_home']).optional(),
  replaceExistingActivation: z.boolean().optional(),
});

export const portalQrCodeActionSchema = z.object({
  qrCodeId: z.string().min(1),
});

export const portalQrReplaceSchema = z.object({
  qrCodeId: z.string().min(1),
  label: z.string().max(120).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  reusable: z.boolean().optional(),
});

export const portalQrBulkSchema = z.object({
  customerIds: z.array(z.string().min(1)).min(1).max(100),
  label: z.string().max(120).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  type: z
    .enum([
      'customer_portal',
      'property',
      'proposal',
      'invoice',
      'service_request',
      'installation',
      'takedown',
      'rebooking',
    ])
    .optional(),
  replaceExistingActivation: z.boolean().optional(),
});

export const portalQrAccessTokenSchema = z.object({
  token: z.string().min(16).max(128),
  userAgent: z.string().max(500).optional(),
});

export const portalQrSendCodeSchema = z.object({
  token: z.string().min(16).max(128),
  channel: z.enum(['email', 'sms']),
  contact: z.string().min(3).max(200),
  userAgent: z.string().max(500).optional(),
});

export const portalQrVerifySchema = z.object({
  token: z.string().min(16).max(128),
  code: z.string().min(4).max(12),
  acceptTerms: z.boolean(),
  userAgent: z.string().max(500).optional(),
});

export const portalInviteUserSchema = z.object({
  customerId: z.string().min(1),
  email: z.string().email().max(200),
  role: z.enum([
    'account_owner',
    'authorized_contact',
    'billing_contact',
    'property_contact',
    'view_only',
  ]),
  displayName: z.string().max(120).nullable().optional(),
  contactId: z.string().min(1).nullable().optional(),
  propertyIds: z.array(z.string().min(1)).max(50).optional(),
});

export const portalInviteActionSchema = z.object({
  portalUserId: z.string().min(1),
});

export const portalClaimInvitationSchema = z.object({
  invitationToken: z.string().min(16).max(200),
  /** Firebase ID token — server extracts authUserId; clients must not send uid. */
  idToken: z.string().min(20).max(4096),
});

export const portalEstablishSessionSchema = z.object({
  /** Legacy magic access token (dual-write compatible). */
  accessToken: z.string().min(8).max(128),
});

export const portalAuthorizeRouteSchema = z.object({
  token: z.string().min(8).max(128).optional(),
  feature: portalFeatureKeySchema.optional(),
  action: z
    .enum([
      'view',
      'request',
      'create',
      'edit',
      'sign',
      'pay',
      'download',
      'message',
      'manage_users',
      'manage_contacts',
    ])
    .optional(),
  resourceType: z.string().min(1).max(64).optional(),
  resourceId: z.string().min(1).max(128).optional(),
  pathname: z.string().min(1).max(400).optional(),
});

export const updatePortalSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  portalLogoUrl: z.string().max(2000).nullable().optional(),
  portalPrimaryColor: z.string().max(40).nullable().optional(),
  allowSelfScheduling: z.boolean().optional(),
  allowOnlinePayments: z.boolean().optional(),
  allowServiceRequests: z.boolean().optional(),
  enabledFeatures: z.array(portalFeatureKeySchema).optional(),
  permissions: z
    .object({
      viewProposals: z.boolean(),
      viewInvoices: z.boolean(),
      approveDesigns: z.boolean(),
      requestService: z.boolean(),
    })
    .optional(),
});
