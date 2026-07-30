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
} from '@clcrm/validators';
import { router, officeProcedure, adminProcedure, publicProcedure } from '../trpc';

function mapPortalErr(err: unknown, fallback: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: err instanceof Error ? err.message : fallback,
  });
}

export const portal360Router = router({
  public: router({
    dashboard: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      const data = await getPortalDashboard(input.token);
      if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Portal access not found or disabled.' });
      return data;
    }),

    timeline: publicProcedure.input(portalTokenInputSchema.extend({ limit: z.number().int().min(1).max(50).optional() })).query(async ({ input }) => {
      return listPortalTimeline(input.token, input.limit ?? 20);
    }),

    notifications: publicProcedure.input(portalTokenInputSchema.extend({ limit: z.number().int().min(1).max(50).optional() })).query(async ({ input }) => {
      return listPortalNotifications(input.token, input.limit ?? 20);
    }),

    markNotificationRead: publicProcedure.input(portalMarkNotificationReadSchema).mutation(async ({ input }) => {
      try {
        return await markPortalNotificationRead(input.token, input.notificationId);
      } catch (err) {
        mapPortalErr(err, 'Could not update notification');
      }
    }),

    markAllNotificationsRead: publicProcedure.input(portalTokenInputSchema).mutation(async ({ input }) => {
      try {
        return await markAllPortalNotificationsRead(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not update notifications');
      }
    }),

    contacts: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalContacts(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load contacts');
      }
    }),

    serviceRequests: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalServiceRequests(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load service requests');
      }
    }),

    agreements: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalAgreements(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load agreements');
      }
    }),

    documents: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalDocuments(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load documents');
      }
    }),

    storage: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalStorage(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load storage');
      }
    }),

    reviews: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalReviews(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load reviews');
      }
    }),

    referrals: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalReferrals(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load referrals');
      }
    }),

    messages: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await getPortalMessages(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load messages');
      }
    }),

    sendMessage: publicProcedure
      .input(portalTokenInputSchema.extend({ body: z.string().min(1).max(5000) }))
      .mutation(async ({ input }) => {
        try {
          return await sendPortalMessage(input.token, input.body);
        } catch (err) {
          mapPortalErr(err, 'Could not send message');
        }
      }),

    properties: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalProperties(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load properties');
      }
    }),

    consultations: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalConsultations(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load consultations');
      }
    }),

    takedowns: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalTakedowns(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load takedowns');
      }
    }),

    submitScheduleRequest: publicProcedure.input(portalScheduleRequestSchema).mutation(async ({ input }) => {
      try {
        return await submitPortalScheduleRequest(input.token, {
          appointmentType: input.appointmentType,
          propertyId: input.propertyId,
          preferredStartAt: input.preferredStartAt ?? null,
          preferredEndAt: input.preferredEndAt ?? null,
          preferredWindows: input.preferredWindows,
          notes: input.notes,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not submit schedule request');
      }
    }),

    invoices: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalInvoices(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load invoices');
      }
    }),

    proposals: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalProposals(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load proposals');
      }
    }),

    mockups: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalMockups(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load mockups');
      }
    }),

    jobs: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await listPortalJobs(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load jobs');
      }
    }),

    jobDetail: publicProcedure.input(portalJobDetailSchema).query(async ({ input }) => {
      try {
        return await getPortalJobDetail(input.token, input.jobId);
      } catch (err) {
        mapPortalErr(err, 'Could not load job');
      }
    }),

    signingHub: publicProcedure.input(portalTokenInputSchema).query(async ({ input }) => {
      try {
        return await getPortalSigningHub(input.token);
      } catch (err) {
        mapPortalErr(err, 'Could not load signing items');
      }
    }),

    submitServiceRequest: publicProcedure.input(portalServiceRequestSchema).mutation(async ({ input }) => {
      try {
        return await submitPortalServiceRequest(input.token, {
          title: input.title,
          description: input.description,
          category: input.category,
          propertyId: input.propertyId,
          priority: input.priority,
          accessInstructions: input.accessInstructions,
          locationNote: input.locationNote,
          photoUrls: input.photoUrls,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not submit service request');
      }
    }),

    uploadServicePhoto: publicProcedure.input(portalUploadPhotoSchema).mutation(async ({ input }) => {
      try {
        return await uploadPortalPhoto(input.token, {
          dataBase64: input.dataBase64,
          contentType: input.contentType,
          filename: input.filename,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not upload photo');
      }
    }),

    submitRebook: publicProcedure.input(portalRebookSchema).mutation(async ({ input }) => {
      try {
        return await submitPortalRebookRequest(input.token, {
          notes: input.notes,
          preferredMonth: input.preferredMonth,
          sameDesign: input.sameDesign,
          upgradeRequested: input.upgradeRequested,
        });
      } catch (err) {
        mapPortalErr(err, 'Could not submit rebook request');
      }
    }),

    rebookInfo: publicProcedure.input(portalTokenInputSchema).query(({ input }) => getPortalRebookInfo(input.token)),

    qrLanding: publicProcedure.input(portalQrAccessTokenSchema).query(async ({ input }) => {
      return getPortalQrLanding(input.token, { userAgent: input.userAgent });
    }),

    qrSendCode: publicProcedure.input(portalQrSendCodeSchema).mutation(async ({ input }) => {
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

    qrVerify: publicProcedure.input(portalQrVerifySchema).mutation(async ({ input }) => {
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

  enable: officeProcedure.input(portalEnableSchema).mutation(async ({ ctx, input }) => {
    try {
      return await enableCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId);
    } catch (err) {
      mapPortalErr(err, 'Could not enable portal');
    }
  }),

  invite: officeProcedure.input(portalEnableSchema).mutation(async ({ ctx, input }) => {
    try {
      return await sendPortalInviteEmail(ctx.auth.organizationId, input.customerId, ctx.auth.userId);
    } catch (err) {
      mapPortalErr(err, 'Could not send portal invite');
    }
  }),

  qrList: officeProcedure.input(portalAccountActionSchema).query(({ ctx, input }) =>
    getStaffPortalQrView(ctx.auth.organizationId, input.customerId),
  ),

  qrGenerate: officeProcedure.input(portalQrGenerateSchema).mutation(async ({ ctx, input }) => {
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

  qrRevoke: officeProcedure.input(portalQrCodeActionSchema).mutation(async ({ ctx, input }) => {
    try {
      return await revokePortalQrCode(ctx.auth.organizationId, input.qrCodeId, ctx.auth.userId);
    } catch (err) {
      mapPortalErr(err, 'Could not revoke QR code');
    }
  }),

  qrReplace: officeProcedure.input(portalQrReplaceSchema).mutation(async ({ ctx, input }) => {
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

  qrBulkGenerate: officeProcedure.input(portalQrBulkSchema).mutation(async ({ ctx, input }) => {
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

  qrScans: officeProcedure.input(portalQrCodeActionSchema.extend({ limit: z.number().int().min(1).max(100).optional() })).query(({ ctx, input }) =>
    listPortalQrScans(ctx.auth.organizationId, input.qrCodeId, input.limit ?? 50),
  ),

  qrOrgList: officeProcedure
    .input(z.object({
      status: z.enum([
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
      ]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).optional())
    .query(({ ctx, input }) =>
      listOrgPortalQrCodes(ctx.auth.organizationId, {
        status: input?.status,
        limit: input?.limit,
      }),
    ),

  qrAnalytics: officeProcedure.query(({ ctx }) => getPortalQrAnalytics(ctx.auth.organizationId)),

  revoke: officeProcedure.input(portalAccountActionSchema).mutation(({ ctx, input }) =>
    revokeCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
  ),

  suspend: officeProcedure.input(portalAccountActionSchema).mutation(({ ctx, input }) =>
    suspendCustomerPortal(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
  ),

  rotateToken: officeProcedure.input(portalAccountActionSchema).mutation(({ ctx, input }) =>
    rotatePortalAccessToken(ctx.auth.organizationId, input.customerId, ctx.auth.userId),
  ),

  getAccount: officeProcedure.input(portalAccountActionSchema).query(({ ctx, input }) =>
    getStaffPortalAccountView(ctx.auth.organizationId, input.customerId),
  ),

  features: officeProcedure.query(({ ctx }) => resolvePortalFeatures(ctx.auth.organizationId)),

  backfillAccounts: adminProcedure.mutation(({ ctx }) =>
    backfillPortalAccountsForOrg(ctx.auth.organizationId),
  ),
});
