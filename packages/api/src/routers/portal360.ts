import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getPortalDashboard,
  submitPortalServiceRequest,
  submitPortalRebookRequest,
  enableCustomerPortal,
  getPortalRebookInfo,
  revokeCustomerPortal,
  suspendCustomerPortal,
  rotatePortalAccessToken,
  getStaffPortalAccountView,
  listPortalTimeline,
  listPortalNotifications,
  markPortalNotificationRead,
  backfillPortalAccountsForOrg,
  resolvePortalFeatures,
  listPortalAgreements,
  listPortalDocuments,
  listPortalStorage,
  listPortalReviews,
  listPortalReferrals,
  getPortalMessages,
  sendPortalMessage,
  listPortalProperties,
  listPortalConsultations,
  listPortalTakedowns,
  submitPortalScheduleRequest,
  listPortalInvoices,
  listPortalProposals,
  listPortalMockups,
  listPortalJobs,
  getPortalJobDetail,
  getPortalSigningHub,
  listPortalContacts,
  listPortalServiceRequests,
  sendPortalInviteEmail,
  markAllPortalNotificationsRead,
  uploadPortalPhoto,
  generatePortalQrCode,
  revokePortalQrCode,
  replacePortalQrCode,
  bulkGeneratePortalQrCodes,
  getStaffPortalQrView,
  listPortalQrScans,
  listOrgPortalQrCodes,
  getPortalQrAnalytics,
  getPortalQrLanding,
  sendPortalQrVerificationCode,
  verifyPortalQrCodeAndActivate,
  createPortalUserInvitation,
  resendPortalUserInvitation,
  revokePortalInvitation,
  claimPortalInvitation,
  establishPortalSessionFromAccessToken,
  createPortalSessionContext,
  logoutAllPortalSessions,
  changePortalUserRole,
  getAdminAuth,
  requirePortalRouteAccess,
  authorizePortalPath,
  PortalAccessDeniedError,
  PortalActionNotPermittedError,
  PortalFeatureNotEnabledError,
  PORTAL_PUBLIC_MESSAGES,
} from '@yuletide/firebase';
import {
  portalTokenInputSchema,
  portalServiceRequestSchema,
  portalUploadPhotoSchema,
  portalRebookSchema,
  portalEnableSchema,
  portalAccountActionSchema,
  portalMarkNotificationReadSchema,
  portalScheduleRequestSchema,
  portalJobDetailSchema,
  portalQrGenerateSchema,
  portalQrCodeActionSchema,
  portalQrReplaceSchema,
  portalQrBulkSchema,
  portalQrAccessTokenSchema,
  portalQrSendCodeSchema,
  portalQrVerifySchema,
  portalInviteUserSchema,
  portalInviteActionSchema,
  portalClaimInvitationSchema,
  portalEstablishSessionSchema,
  portalAuthorizeRouteSchema,
} from '@clcrm/validators';
import { router, permissionProcedure, portalPublicProcedure } from '../trpc';

function mapPortalErr(err: unknown, fallback: string): never {
  if (err instanceof PortalAccessDeniedError) {
    throw new TRPCError({ code: 'NOT_FOUND', message: PORTAL_PUBLIC_MESSAGES.accessUnavailable });
  }
  if (err instanceof PortalFeatureNotEnabledError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'PORTAL_FEATURE_NOT_ENABLED' });
  }
  if (err instanceof PortalActionNotPermittedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'PORTAL_ACTION_NOT_PERMITTED' });
  }
  if (err instanceof Error && err.message === 'PORTAL_RESOURCE_NOT_FOUND') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'PORTAL_RESOURCE_NOT_FOUND' });
  }
  if (err instanceof Error && err.name === 'PortalResourceNotFoundError') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'PORTAL_RESOURCE_NOT_FOUND' });
  }
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: err instanceof Error ? err.message : fallback,
  });
}

const PORTAL_ENUMERATION_SAFE = PORTAL_PUBLIC_MESSAGES.verificationSent;

function portalAuth(ctx: { portalSessionToken?: string | null }, input: { token?: string }) {
  // Session-first routes (P2-S7) send '' — never treat that as a magic token.
  const token = input.token && input.token.length >= 8 ? input.token : null;
  return { token, sessionToken: ctx.portalSessionToken ?? null };
}

export const portal360Router = router({
  /**
   * Auth-surface procedures kept in a small nested router so client AppRouter
   * inference does not drop them from the large `public` procedure map.
   */
  auth: router({
    /** Claim invitation — authUserId is derived from verified Firebase ID token only. */
    claimInvitation: portalPublicProcedure
      .input(portalClaimInvitationSchema)
      .mutation(async ({ input }) => {
        try {
          const decoded = await getAdminAuth().verifyIdToken(input.idToken);
          const result = await claimPortalInvitation({
            invitationToken: input.invitationToken,
            authUserId: decoded.uid,
          });
          if (!result.ok) {
            return { ok: false as const, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable };
          }
          const session = await createPortalSessionContext({
            organizationId: result.organizationId,
            customerId: result.customerId,
            portalAccountId: result.portalAccountId,
            portalUserId: result.portalUserId,
          });
          if (!session) {
            return { ok: false as const, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable };
          }
          return {
            ok: true as const,
            message: 'Access confirmed.',
            sessionToken: session.token,
            expiresAt: session.expiresAt.toISOString(),
            context: session.context,
          };
        } catch {
          return { ok: false as const, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable };
        }
      }),

    /** Establish portal session from magic access token (compatibility). Cookie set via /api/portal/session. */
    establishSession: portalPublicProcedure
      .input(portalEstablishSessionSchema)
      .mutation(async ({ input }) => {
        const session = await establishPortalSessionFromAccessToken(input.accessToken);
        if (!session) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: PORTAL_PUBLIC_MESSAGES.accessUnavailable,
          });
        }
        return {
          ok: true,
          sessionToken: session.token,
          expiresAt: session.expiresAt.toISOString(),
          context: session.context,
        };
      }),

    /**
     * Canonical route authorization (P2-S5). Returns only safe public fields.
     * Does not embed customer data — use feature APIs after allow.
     */
    authorizeRoute: portalPublicProcedure
      .input(portalAuthorizeRouteSchema)
      .query(async ({ ctx, input }) => {
        const auth = portalAuth(ctx, input);
        if (input.pathname) {
          const parts = input.pathname.split('/').filter(Boolean);
          const resourceId =
            input.resourceId ||
            (parts[0] === 'portal' && parts[2] === 'jobs' && parts[3] ? parts[3] : undefined);
          const result = await authorizePortalPath({
            pathname: input.pathname,
            auth,
            resourceId,
          });
          if ('public' in result && result.public) {
            return { allowed: true as const };
          }
          if (!result.allowed) {
            return {
              allowed: false as const,
              reason: result.reason,
              message: result.publicMessage,
            };
          }
          return { allowed: true as const };
        }

        const result = await requirePortalRouteAccess({
          auth,
          feature: input.feature,
          action: input.action,
          resource:
            input.resourceType && input.resourceId
              ? { type: input.resourceType, id: input.resourceId }
              : undefined,
        });
        if (!result.allowed) {
          return {
            allowed: false as const,
            reason: result.reason,
            message: result.publicMessage,
          };
        }
        return { allowed: true as const };
      }),
  }),

  public: router({
    dashboard: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        const data = await getPortalDashboard(portalAuth(ctx, input));
        if (!data)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: PORTAL_PUBLIC_MESSAGES.accessUnavailable,
          });
        return data;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        mapPortalErr(err, 'Could not load portal dashboard');
      }
    }),

    timeline: portalPublicProcedure
      .input(portalTokenInputSchema.extend({ limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalTimeline(portalAuth(ctx, input), input.limit ?? 20);
        } catch (err) {
          mapPortalErr(err, 'Could not load timeline');
        }
      }),

    notifications: portalPublicProcedure
      .input(portalTokenInputSchema.extend({ limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalNotifications(portalAuth(ctx, input), input.limit ?? 20);
        } catch (err) {
          mapPortalErr(err, 'Could not load notifications');
        }
      }),

    markNotificationRead: portalPublicProcedure
      .input(portalMarkNotificationReadSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await markPortalNotificationRead(portalAuth(ctx, input), input.notificationId);
        } catch (err) {
          mapPortalErr(err, 'Could not update notification');
        }
      }),

    markAllNotificationsRead: portalPublicProcedure
      .input(portalTokenInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await markAllPortalNotificationsRead(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not update notifications');
        }
      }),

    contacts: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalContacts(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load contacts');
      }
    }),

    serviceRequests: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalServiceRequests(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not load service requests');
        }
      }),

    agreements: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalAgreements(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not load agreements');
        }
      }),

    documents: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalDocuments(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load documents');
      }
    }),

    storage: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalStorage(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load storage');
      }
    }),

    reviews: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalReviews(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load reviews');
      }
    }),

    referrals: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalReferrals(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load referrals');
      }
    }),

    messages: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await getPortalMessages(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load messages');
      }
    }),

    sendMessage: portalPublicProcedure
      .input(
        portalTokenInputSchema.extend({
          body: z.string().min(1).max(5000),
          idempotencyKey: z.string().min(8).max(200).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await sendPortalMessage(portalAuth(ctx, input), input.body, {
            idempotencyKey: input.idempotencyKey,
          });
        } catch (err) {
          mapPortalErr(err, 'Could not send message');
        }
      }),

    properties: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalProperties(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not load properties');
        }
      }),

    consultations: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await listPortalConsultations(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not load consultations');
        }
      }),

    takedowns: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalTakedowns(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load takedowns');
      }
    }),

    submitScheduleRequest: portalPublicProcedure
      .input(portalScheduleRequestSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await submitPortalScheduleRequest(portalAuth(ctx, input), {
            appointmentType: input.appointmentType,
            propertyId: input.propertyId,
            preferredStartAt: input.preferredStartAt ?? null,
            preferredEndAt: input.preferredEndAt ?? null,
            preferredWindows: input.preferredWindows,
            notes: input.notes,
            idempotencyKey: input.idempotencyKey,
          });
        } catch (err) {
          mapPortalErr(err, 'Could not submit schedule request');
        }
      }),

    invoices: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalInvoices(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load invoices');
      }
    }),

    proposals: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalProposals(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load proposals');
      }
    }),

    mockups: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalMockups(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load mockups');
      }
    }),

    jobs: portalPublicProcedure.input(portalTokenInputSchema).query(async ({ ctx, input }) => {
      try {
        return await listPortalJobs(portalAuth(ctx, input));
      } catch (err) {
        mapPortalErr(err, 'Could not load jobs');
      }
    }),

    jobDetail: portalPublicProcedure.input(portalJobDetailSchema).query(async ({ ctx, input }) => {
      try {
        return await getPortalJobDetail(portalAuth(ctx, input), input.jobId);
      } catch (err) {
        mapPortalErr(err, 'Could not load job');
      }
    }),

    signingHub: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await getPortalSigningHub(portalAuth(ctx, input));
        } catch (err) {
          mapPortalErr(err, 'Could not load signing items');
        }
      }),

    submitServiceRequest: portalPublicProcedure
      .input(portalServiceRequestSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await submitPortalServiceRequest(portalAuth(ctx, input), {
            title: input.title,
            description: input.description,
            category: input.category,
            propertyId: input.propertyId,
            priority: input.priority,
            accessInstructions: input.accessInstructions,
            locationNote: input.locationNote,
            photoUrls: input.photoUrls,
            idempotencyKey: input.idempotencyKey,
          });
        } catch (err) {
          mapPortalErr(err, 'Could not submit service request');
        }
      }),

    uploadServicePhoto: portalPublicProcedure
      .input(portalUploadPhotoSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await uploadPortalPhoto(portalAuth(ctx, input), {
            dataBase64: input.dataBase64,
            contentType: input.contentType,
            filename: input.filename,
          });
        } catch (err) {
          mapPortalErr(err, 'Could not upload photo');
        }
      }),

    submitRebook: portalPublicProcedure
      .input(portalRebookSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await submitPortalRebookRequest(portalAuth(ctx, input), {
            notes: input.notes,
            preferredMonth: input.preferredMonth,
            sameDesign: input.sameDesign,
            upgradeRequested: input.upgradeRequested,
            idempotencyKey: input.idempotencyKey,
          });
        } catch (err) {
          mapPortalErr(err, 'Could not submit rebook request');
        }
      }),

    rebookInfo: portalPublicProcedure
      .input(portalTokenInputSchema)
      .query(({ ctx, input }) => getPortalRebookInfo(portalAuth(ctx, input))),

    qrLanding: portalPublicProcedure.input(portalQrAccessTokenSchema).query(async ({ input }) => {
      return getPortalQrLanding(input.token, { userAgent: input.userAgent });
    }),

    qrSendCode: portalPublicProcedure.input(portalQrSendCodeSchema).mutation(async ({ input }) => {
      try {
        return await sendPortalQrVerificationCode(input.token, {
          channel: input.channel,
          contact: input.contact,
          userAgent: input.userAgent,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not send verification code');
      }
    }),

    qrVerify: portalPublicProcedure.input(portalQrVerifySchema).mutation(async ({ input }) => {
      try {
        return await verifyPortalQrCodeAndActivate(input.token, {
          code: input.code,
          acceptTerms: input.acceptTerms,
          userAgent: input.userAgent,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not verify and open portal');
      }
    }),
  }),

  logoutAllSessions: permissionProcedure('customers', 'edit')
    .input(portalAccountActionSchema)
    .mutation(({ ctx, input }) =>
      logoutAllPortalSessions(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
    ),

  changeUserRole: permissionProcedure('customers', 'edit')
    .input(
      z.object({
        portalUserId: z.string().min(1),
        role: z.enum([
          'account_owner',
          'authorized_contact',
          'billing_contact',
          'property_contact',
          'view_only',
        ]),
      }),
    )
    .mutation(({ ctx, input }) =>
      changePortalUserRole(
        ctx.auth.organizationId,
        input.portalUserId,
        input.role,
        ctx.auth.userId,
      ),
    ),

  enable: permissionProcedure('customers', 'create')
    .input(portalEnableSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await enableCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId);
      } catch (err) {
        mapPortalErr(err, 'Could not enable portal');
      }
    }),

  invite: permissionProcedure('customers', 'create')
    .input(portalEnableSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await sendPortalInviteEmail(
          ctx.auth.organizationId,
          input.customerId,
          ctx.auth.userId,
        );
      } catch (err) {
        mapPortalErr(err, 'Could not send portal invite');
      }
    }),

  inviteUser: permissionProcedure('customers', 'create')
    .input(portalInviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await createPortalUserInvitation({
          organizationId: ctx.auth.organizationId,
          customerId: input.customerId,
          role: input.role,
          email: input.email,
          displayName: input.displayName,
          contactId: input.contactId,
          propertyIds: input.propertyIds,
          actorId: ctx.auth.userId,
        });
        return {
          portalUserId: result.portalUser.id,
          invitationStatus: result.portalUser.invitationStatus,
          invitationExpiresAt: result.portalUser.invitationExpiresAt?.toISOString() ?? null,
          role: result.portalUser.role,
          deliveryChannel: result.delivery.channel,
          message: result.delivery.message,
          // Raw token only at emulator/test delivery boundary — never from live staff list/detail.
          invitationToken: result.delivery.invitationToken ?? null,
        };
      } catch (err) {
        mapPortalErr(err, 'Could not create portal invitation');
      }
    }),

  resendInvitation: permissionProcedure('customers', 'edit')
    .input(portalInviteActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await resendPortalUserInvitation({
          organizationId: ctx.auth.organizationId,
          portalUserId: input.portalUserId,
          actorId: ctx.auth.userId,
        });
        return {
          portalUserId: result.portalUser.id,
          invitationStatus: result.portalUser.invitationStatus,
          invitationExpiresAt: result.portalUser.invitationExpiresAt?.toISOString() ?? null,
          role: result.portalUser.role,
          deliveryChannel: result.delivery.channel,
          message: result.delivery.message,
          invitationToken: result.delivery.invitationToken ?? null,
        };
      } catch (err) {
        mapPortalErr(err, 'Could not resend portal invitation');
      }
    }),

  revokeInvitation: permissionProcedure('customers', 'edit')
    .input(portalInviteActionSchema)
    .mutation(async ({ ctx, input }) => {
      return revokePortalInvitation({
        organizationId: ctx.auth.organizationId,
        portalUserId: input.portalUserId,
        actorId: ctx.auth.userId,
      });
    }),

  qrList: permissionProcedure('customers', 'view')
    .input(portalAccountActionSchema)
    .query(({ ctx, input }) => getStaffPortalQrView(ctx.auth.organizationId, input.customerId)),

  qrGenerate: permissionProcedure('customers', 'create')
    .input(portalQrGenerateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generatePortalQrCode(ctx.auth.organizationId, {
          customerId: input.customerId,
          propertyId: input.propertyId,
          type: input.type,
          targetRecordId: input.targetRecordId,
          label: input.label,
          internalDescription: input.internalDescription,
          expiresAt: input.expiresAt ?? null,
          reusable: input.reusable,
          requireIdentityVerification: input.requireIdentityVerification,
          accessMode: input.accessMode,
          replaceExistingActivation: input.replaceExistingActivation,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not generate QR code');
      }
    }),

  qrRevoke: permissionProcedure('customers', 'edit')
    .input(portalQrCodeActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokePortalQrCode(ctx.auth.organizationId, input.qrCodeId, ctx.auth.userId);
      } catch (err) {
        mapPortalErr(err, 'Could not revoke QR code');
      }
    }),

  qrReplace: permissionProcedure('customers', 'edit')
    .input(portalQrReplaceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await replacePortalQrCode(ctx.auth.organizationId, input.qrCodeId, {
          label: input.label,
          expiresAt: input.expiresAt ?? null,
          reusable: input.reusable,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not replace QR code');
      }
    }),

  qrBulkGenerate: permissionProcedure('customers', 'create')
    .input(portalQrBulkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkGeneratePortalQrCodes(ctx.auth.organizationId, input.customerIds, {
          label: input.label,
          expiresAt: input.expiresAt ?? null,
          type: input.type,
          replaceExistingActivation: input.replaceExistingActivation,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not bulk generate QR codes');
      }
    }),

  qrScans: permissionProcedure('customers', 'view')
    .input(portalQrCodeActionSchema.extend({ limit: z.number().int().min(1).max(100).optional() }))
    .query(({ ctx, input }) =>
      listPortalQrScans(ctx.auth.organizationId, input.qrCodeId, input.limit ?? 50),
    ),

  qrOrgList: permissionProcedure('customers', 'view')
    .input(
      z
        .object({
          status: z
            .enum([
              'all',
              'draft',
              'active',
              'used_for_activation',
              'reusable',
              'expired',
              'revoked',
              'replaced',
              'suspended',
              'invalid',
            ])
            .optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      listOrgPortalQrCodes(ctx.auth.organizationId, {
        status: input?.status,
        limit: input?.limit,
      }),
    ),

  qrAnalytics: permissionProcedure('customers', 'view').query(({ ctx }) =>
    getPortalQrAnalytics(ctx.auth.organizationId),
  ),

  revoke: permissionProcedure('customers', 'edit')
    .input(portalAccountActionSchema)
    .mutation(({ ctx, input }) =>
      revokeCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
    ),

  suspend: permissionProcedure('customers', 'edit')
    .input(portalAccountActionSchema)
    .mutation(({ ctx, input }) =>
      suspendCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
    ),

  rotateToken: permissionProcedure('customers', 'edit')
    .input(portalAccountActionSchema)
    .mutation(({ ctx, input }) =>
      rotatePortalAccessToken(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
    ),

  getAccount: permissionProcedure('customers', 'view')
    .input(portalAccountActionSchema)
    .query(({ ctx, input }) =>
      getStaffPortalAccountView(ctx.auth.organizationId, input.customerId),
    ),

  features: permissionProcedure('customers', 'view').query(({ ctx }) =>
    resolvePortalFeatures(ctx.auth.organizationId),
  ),

  backfillAccounts: permissionProcedure('settings', 'edit').mutation(({ ctx }) =>
    backfillPortalAccountsForOrg(ctx.auth.organizationId),
  ),
});
