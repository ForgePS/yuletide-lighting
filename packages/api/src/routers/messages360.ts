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
  ensureMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  ensureAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  triggerAutomation,
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  deleteConversation,
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
  updateConversationSchema,
  createTemplate360Schema,
  updateTemplate360Schema,
  deleteTemplate360Schema,
  createCampaignSchema,
  updateCampaign360Schema,
  deleteCampaign360Schema,
  createAutomationSchema,
  updateAutomation360Schema,
  deleteAutomation360Schema,
  deleteConversation360Schema,
  sendInternalMessageSchema,
  createReviewRequestSchema,
  aiCommunicationSchema,
  portalMessageSchema,
  portalTokenMessageSchema,
  triggerAutomationSchema,
} from '@clcrm/validators';
import { router, officeProcedure, publicProcedure } from '../trpc';

export const messages360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getMessagingDashboard(ctx.auth.organizationId)),

  aiGenerate: officeProcedure.input(aiCommunicationSchema).query(({ input }) =>
    aiCommunicationAssistant(input.prompt),
  ),

  conversations: router({
    list: officeProcedure.query(({ ctx }) => listConversations(ctx.auth.organizationId)),
    getById: officeProcedure.input(z.object({ conversationId: z.string() })).query(async ({ ctx, input }) => {
      const conv = await getConversation(ctx.auth.organizationId, input.conversationId);
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND' });
      const messages = await getConversationMessages(ctx.auth.organizationId, input.conversationId);
      return { conversation: conv, messages };
    }),
    getByCustomer: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      getConversationByCustomer(ctx.auth.organizationId, input.customerId),
    ),
    update: officeProcedure.input(updateConversationSchema).mutation(({ ctx, input }) =>
      updateConversation(ctx.auth.organizationId, input.conversationId, input as never, ctx.auth.userId),
    ),
    timeline: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      getCustomerTimeline(ctx.auth.organizationId, input.customerId),
    ),
    markRead: officeProcedure.input(z.object({ conversationId: z.string(), messageId: z.string() })).mutation(({ ctx, input }) =>
      markMessageRead(ctx.auth.organizationId, input.conversationId, input.messageId),
    ),
    delete: officeProcedure.input(deleteConversation360Schema).mutation(({ ctx, input }) =>
      deleteConversation(ctx.auth.organizationId, input.conversationId),
    ),
  }),

  send: officeProcedure.input(sendMessage360Schema).mutation(({ ctx, input }) =>
    sendMessage360(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  sms: router({
    sendBulk: officeProcedure.input(sendBulkSms360Schema).mutation(({ ctx, input }) =>
      sendBulkSms360(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),
    receive: officeProcedure.input(receiveSms360Schema).mutation(({ ctx, input }) =>
      receiveSms360(ctx.auth.organizationId, input),
    ),
  }),

  templates: router({
    list: officeProcedure.query(({ ctx }) => ensureMessageTemplates(ctx.auth.organizationId)),
    create: officeProcedure.input(createTemplate360Schema).mutation(({ ctx, input }) =>
      createMessageTemplate(ctx.auth.organizationId, { ...input, isActive: true } as never, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateTemplate360Schema).mutation(({ ctx, input }) => {
      const { templateId, ...data } = input;
      return updateMessageTemplate(ctx.auth.organizationId, templateId, data as never, ctx.auth.userId);
    }),
    delete: officeProcedure.input(deleteTemplate360Schema).mutation(({ ctx, input }) =>
      deleteMessageTemplate(ctx.auth.organizationId, input.templateId),
    ),
  }),

  automations: router({
    list: officeProcedure.query(({ ctx }) => ensureAutomations(ctx.auth.organizationId)),
    create: officeProcedure.input(createAutomationSchema).mutation(({ ctx, input }) =>
      createAutomation(ctx.auth.organizationId, input as never, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateAutomation360Schema).mutation(({ ctx, input }) => {
      const { automationId, ...data } = input;
      return updateAutomation(ctx.auth.organizationId, automationId, data as never, ctx.auth.userId);
    }),
    delete: officeProcedure.input(deleteAutomation360Schema).mutation(({ ctx, input }) =>
      deleteAutomation(ctx.auth.organizationId, input.automationId),
    ),
    toggle: officeProcedure.input(z.object({ automationId: z.string(), isActive: z.boolean() })).mutation(({ ctx, input }) =>
      toggleAutomation(ctx.auth.organizationId, input.automationId, input.isActive, ctx.auth.userId),
    ),
    trigger: officeProcedure.input(triggerAutomationSchema).mutation(({ ctx, input }) =>
      triggerAutomation(ctx.auth.organizationId, input.trigger, input.customerId, input.vars, ctx.auth.userId),
    ),
  }),

  campaigns: router({
    list: officeProcedure.query(({ ctx }) => listCampaigns(ctx.auth.organizationId)),
    create: officeProcedure.input(createCampaignSchema).mutation(({ ctx, input }) =>
      createCampaign(ctx.auth.organizationId, input as never, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateCampaign360Schema).mutation(({ ctx, input }) => {
      const { campaignId, ...data } = input;
      return updateCampaign(ctx.auth.organizationId, campaignId, data as never, ctx.auth.userId);
    }),
    delete: officeProcedure.input(deleteCampaign360Schema).mutation(({ ctx, input }) =>
      deleteCampaign(ctx.auth.organizationId, input.campaignId),
    ),
    send: officeProcedure.input(z.object({ campaignId: z.string() })).mutation(({ ctx, input }) =>
      sendCampaign(ctx.auth.organizationId, input.campaignId, ctx.auth.userId),
    ),
  }),

  internal: router({
    channels: officeProcedure.query(({ ctx }) => ensureInternalChannels(ctx.auth.organizationId)),
    messages: officeProcedure.input(z.object({ channelId: z.string() })).query(({ ctx, input }) =>
      listInternalMessages(ctx.auth.organizationId, input.channelId),
    ),
    send: officeProcedure.input(sendInternalMessageSchema).mutation(({ ctx, input }) =>
      sendInternalMessage(ctx.auth.organizationId, input.channelId, input.body, ctx.auth.userId, ctx.auth.email, input.mentions, input.attachmentUrls),
    ),
  }),

  reviews: router({
    list: officeProcedure.query(({ ctx }) => listReviewRequests(ctx.auth.organizationId)),
    create: officeProcedure.input(createReviewRequestSchema).mutation(({ ctx, input }) =>
      createReviewRequest(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  notifications: router({
    list: officeProcedure.query(({ ctx }) => listNotifications(ctx.auth.organizationId)),
  }),

  public: router({
    sendPortalMessage: publicProcedure.input(portalMessageSchema).mutation(async ({ input }) => {
      // Portal messages require org context from customer lookup — simplified for demo
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Use customer portal auth endpoint' });
    }),
    receiveSms: publicProcedure.input(receiveSms360Schema.extend({ organizationId: z.string().min(1) })).mutation(({ input }) =>
      receiveSms360(input.organizationId, input),
    ),
  }),
});
