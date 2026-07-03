import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listRebookingCampaigns,
  getRebookingCampaign,
  createRebookingCampaign,
  updateRebookingCampaign,
  listRebookingRecordsDetailed,
  populateCampaignFromPriorSeason,
  updateRebookingRecord,
  sendRebookingOutreach,
  processRebookRecord,
  getRebookingDashboard,
} from '@yuletide/firebase';
import {
  createRebookingCampaignSchema,
  updateRebookingCampaignSchema,
  updateRebookingRecordSchema,
  processRebookSchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

export const rebooking360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getRebookingDashboard(ctx.auth.organizationId)),

  campaigns: router({
    list: officeProcedure.query(({ ctx }) => listRebookingCampaigns(ctx.auth.organizationId)),
    getById: officeProcedure.input(z.object({ campaignId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const campaign = await getRebookingCampaign(ctx.auth.organizationId, input.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' });
      return campaign;
    }),
    create: officeProcedure.input(createRebookingCampaignSchema).mutation(({ ctx, input }) =>
      createRebookingCampaign(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateRebookingCampaignSchema).mutation(({ ctx, input }) => {
      const { campaignId, ...data } = input;
      return updateRebookingCampaign(ctx.auth.organizationId, campaignId, data, ctx.auth.userId);
    }),
    populate: officeProcedure.input(z.object({ campaignId: z.string().min(1) })).mutation(({ ctx, input }) =>
      populateCampaignFromPriorSeason(ctx.auth.organizationId, input.campaignId, ctx.auth.userId),
    ),
    records: officeProcedure.input(z.object({ campaignId: z.string().min(1) })).query(({ ctx, input }) =>
      listRebookingRecordsDetailed(ctx.auth.organizationId, input.campaignId),
    ),
  }),

  records: router({
    update: officeProcedure.input(updateRebookingRecordSchema).mutation(({ ctx, input }) => {
      const { recordId, ...data } = input;
      return updateRebookingRecord(ctx.auth.organizationId, recordId, data, ctx.auth.userId);
    }),
    send: officeProcedure.input(z.object({ recordId: z.string().min(1) })).mutation(({ ctx, input }) =>
      sendRebookingOutreach(ctx.auth.organizationId, input.recordId, ctx.auth.userId),
    ),
    processRebook: officeProcedure.input(processRebookSchema).mutation(({ ctx, input }) =>
      processRebookRecord(ctx.auth.organizationId, input.recordId, {
        sameDesign: input.sameDesign,
        upgradeRequested: input.upgradeRequested,
        userId: ctx.auth.userId,
      }),
    ),
  }),
});
