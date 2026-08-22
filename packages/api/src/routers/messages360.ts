import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listConversations,
  getConversation,
  updateConversation,
  getConversationByCustomer,
  getConversationMessages,
  sendMessage360,
  receivePortalMessage,
  markMessageRead,
  getCustomerTimeline,
  sendBulkSms360,
  receiveSms360,
  resolveOrganizationIdByTwilioToPhone,
  verifyTwilioRequestSignature,
  ensureMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  ensureAutomations,
  createAutomation,
  toggleAutomation,
  updateAutomation,
  triggerAutomation,
  listCampaigns,
  createCampaign,
  sendCampaign,
  ensureInternalChannels,
  sendInternalMessage,
  listInternalMessages,
  listReviewRequests,
  createReviewRequest,
  getMessagingDashboard,
  listNotifications,
  aiCommunicationAssistant,
} from '@yuletide/firebase';
import {
  sendMessage360Schema,
  sendBulkSms360Schema,
  receiveSms360Schema,
  receiveSmsPublicSchema,
  updateConversationSchema,
  createTemplate360Schema,
  updateTemplate360Schema,
  updateAutomation360Schema,
  createCampaignSchema,
  createAutomationSchema,
  sendInternalMessageSchema,
  createReviewRequestSchema,
  aiCommunicationSchema,
  portalMessageSchema,
  triggerAutomationSchema,
} from '@clcrm/validators';
import { router, permissionProcedure, publicProcedure } from '../trpc';

export const messages360Router = router({
  dashboard: permissionProcedure('customers', 'view').query(({ ctx }) =>
    getMessagingDashboard(ctx.auth.organizationId),
  ),

  aiGenerate: permissionProcedure('customers', 'view')
    .input(aiCommunicationSchema)
    .query(({ input }) => aiCommunicationAssistant(input.prompt)),

  conversations: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) =>
      listConversations(ctx.auth.organizationId),
    ),
    getById: permissionProcedure('customers', 'view')
      .input(z.object({ conversationId: z.string() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversation(ctx.auth.organizationId, input.conversationId);
        if (!conv) throw new TRPCError({ code: 'NOT_FOUND' });
        const messages = await getConversationMessages(ctx.auth.organizationId, input.conversationId);
        return { conversation: conv, messages };
      }),
    getByCustomer: permissionProcedure('customers', 'view')
      .input(z.object({ customerId: z.string() }))
      .query(({ ctx, input }) => getConversationByCustomer(ctx.auth.organizationId, input.customerId)),
    update: permissionProcedure('customers', 'edit')
      .input(updateConversationSchema)
      .mutation(({ ctx, input }) =>
        updateConversation(ctx.auth.organizationId, input.conversationId, input as never, ctx.auth.userId),
      ),
    timeline: permissionProcedure('customers', 'view')
      .input(z.object({ customerId: z.string() }))
      .query(({ ctx, input }) => getCustomerTimeline(ctx.auth.organizationId, input.customerId)),
    markRead: permissionProcedure('customers', 'edit')
      .input(z.object({ conversationId: z.string(), messageId: z.string() }))
      .mutation(({ ctx, input }) =>
        markMessageRead(ctx.auth.organizationId, input.conversationId, input.messageId),
      ),
  }),

  send: permissionProcedure('customers', 'edit')
    .input(sendMessage360Schema)
    .mutation(({ ctx, input }) =>
      sendMessage360(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  sms: router({
    sendBulk: permissionProcedure('customers', 'edit')
      .input(sendBulkSms360Schema)
      .mutation(({ ctx, input }) =>
        sendBulkSms360(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
      ),
    receive: permissionProcedure('customers', 'edit')
      .input(receiveSms360Schema)
      .mutation(({ ctx, input }) => receiveSms360(ctx.auth.organizationId, input)),
  }),

  templates: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) =>
      ensureMessageTemplates(ctx.auth.organizationId),
    ),
    create: permissionProcedure('customers', 'create')
      .input(createTemplate360Schema)
      .mutation(({ ctx, input }) =>
        createMessageTemplate(
          ctx.auth.organizationId,
          { ...input, isActive: true } as never,
          ctx.auth.userId,
        ),
      ),
    update: permissionProcedure('customers', 'edit')
      .input(z.object({ templateId: z.string(), data: updateTemplate360Schema }))
      .mutation(({ ctx, input }) =>
        updateMessageTemplate(ctx.auth.organizationId, input.templateId, input.data, ctx.auth.userId),
      ),
  }),

  automations: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) =>
      ensureAutomations(ctx.auth.organizationId),
    ),
    create: permissionProcedure('customers', 'create')
      .input(createAutomationSchema)
      .mutation(({ ctx, input }) =>
        createAutomation(ctx.auth.organizationId, input as never, ctx.auth.userId),
      ),
    toggle: permissionProcedure('customers', 'edit')
      .input(z.object({ automationId: z.string(), isActive: z.boolean() }))
      .mutation(({ ctx, input }) =>
        toggleAutomation(ctx.auth.organizationId, input.automationId, input.isActive, ctx.auth.userId),
      ),
    update: permissionProcedure('customers', 'edit')
      .input(z.object({ automationId: z.string(), data: updateAutomation360Schema }))
      .mutation(({ ctx, input }) =>
        updateAutomation(ctx.auth.organizationId, input.automationId, input.data, ctx.auth.userId),
      ),
    trigger: permissionProcedure('customers', 'edit')
      .input(triggerAutomationSchema)
      .mutation(({ ctx, input }) =>
        triggerAutomation(
          ctx.auth.organizationId,
          input.trigger,
          input.customerId,
          input.vars,
          ctx.auth.userId,
        ),
      ),
  }),

  campaigns: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) => listCampaigns(ctx.auth.organizationId)),
    create: permissionProcedure('customers', 'create')
      .input(createCampaignSchema)
      .mutation(({ ctx, input }) =>
        createCampaign(ctx.auth.organizationId, input as never, ctx.auth.userId),
      ),
    send: permissionProcedure('customers', 'edit')
      .input(z.object({ campaignId: z.string() }))
      .mutation(({ ctx, input }) => sendCampaign(ctx.auth.organizationId, input.campaignId, ctx.auth.userId)),
  }),

  internal: router({
    channels: permissionProcedure('customers', 'view').query(({ ctx }) =>
      ensureInternalChannels(ctx.auth.organizationId),
    ),
    messages: permissionProcedure('customers', 'view')
      .input(z.object({ channelId: z.string() }))
      .query(({ ctx, input }) => listInternalMessages(ctx.auth.organizationId, input.channelId)),
    send: permissionProcedure('customers', 'edit')
      .input(sendInternalMessageSchema)
      .mutation(({ ctx, input }) =>
        sendInternalMessage(
          ctx.auth.organizationId,
          input.channelId,
          input.body,
          ctx.auth.userId,
          ctx.auth.email,
          input.mentions,
          input.attachmentUrls,
        ),
      ),
  }),

  reviews: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) =>
      listReviewRequests(ctx.auth.organizationId),
    ),
    create: permissionProcedure('customers', 'create')
      .input(createReviewRequestSchema)
      .mutation(({ ctx, input }) => createReviewRequest(ctx.auth.organizationId, input, ctx.auth.userId)),
  }),

  notifications: router({
    list: permissionProcedure('customers', 'view').query(({ ctx }) =>
      listNotifications(ctx.auth.organizationId),
    ),
  }),

  public: router({
    sendPortalMessage: publicProcedure.input(portalMessageSchema).mutation(async ({ input }) => {
      // Portal messages require org context from customer lookup — simplified for demo
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Use customer portal auth endpoint' });
    }),
    receiveSms: publicProcedure.input(receiveSmsPublicSchema).mutation(async ({ input }) => {
      const verification = verifyTwilioRequestSignature({
        authToken: process.env.TWILIO_AUTH_TOKEN,
        signature: input.twilioSignature,
        url: input.webhookUrl ?? '',
        params: {
          To: input.toPhone,
          From: input.fromPhone ?? '',
          Body: input.body,
          ...(input.providerMessageId ? { MessageSid: input.providerMessageId } : {}),
        },
      });
      if (!verification.ok) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: verification.reason ?? 'Invalid Twilio signature',
        });
      }
      const orgId = await resolveOrganizationIdByTwilioToPhone(input.toPhone);
      if (!orgId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No organization mapped to this inbound phone number',
        });
      }
      return receiveSms360(orgId, input);
    }),
  }),
});
