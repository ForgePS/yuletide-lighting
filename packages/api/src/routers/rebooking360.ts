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
import { router, protectedProcedure, requireModule, requirePermission } from '../trpc';

const rebookingModule = requireModule('rebooking');
/** YL-S25: module + customers RBAC (matches nav permissionResource; no dedicated rebooking resource). */
const rebookingView = protectedProcedure
  .use(rebookingModule)
  .use(requirePermission('customers', 'view'));
const rebookingCreate = protectedProcedure
  .use(rebookingModule)
  .use(requirePermission('customers', 'create'));
const rebookingEdit = protectedProcedure
  .use(rebookingModule)
  .use(requirePermission('customers', 'edit'));

export const rebooking360Router = router({
  dashboard: rebookingView.query(({ ctx }) =>
    getRebookingDashboard(ctx.auth.organizationId),
  ),

  campaigns: router({
    list: rebookingView.query(({ ctx }) =>
      listRebookingCampaigns(ctx.auth.organizationId),
    ),
    getById: rebookingView
      .input(z.object({ campaignId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const campaign = await getRebookingCampaign(ctx.auth.organizationId, input.campaignId);
        if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' });
        return campaign;
      }),
    create: rebookingCreate
      .input(createRebookingCampaignSchema)
      .mutation(({ ctx, input }) => createRebookingCampaign(ctx.auth.organizationId, input, ctx.auth.userId)),
    update: rebookingEdit
      .input(updateRebookingCampaignSchema)
      .mutation(({ ctx, input }) => {
        const { campaignId, ...data } = input;
        return updateRebookingCampaign(ctx.auth.organizationId, campaignId, data, ctx.auth.userId);
      }),
    populate: rebookingEdit
      .input(z.object({ campaignId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        populateCampaignFromPriorSeason(ctx.auth.organizationId, input.campaignId, ctx.auth.userId),
      ),
    records: rebookingView
      .input(z.object({ campaignId: z.string().min(1) }))
      .query(({ ctx, input }) => listRebookingRecordsDetailed(ctx.auth.organizationId, input.campaignId)),
  }),

  records: router({
    update: rebookingEdit
      .input(updateRebookingRecordSchema)
      .mutation(({ ctx, input }) => {
        const { recordId, ...data } = input;
        return updateRebookingRecord(ctx.auth.organizationId, recordId, data, ctx.auth.userId);
      }),
    send: rebookingEdit
      .input(z.object({ recordId: z.string().min(1) }))
      .mutation(({ ctx, input }) =>
        sendRebookingOutreach(ctx.auth.organizationId, input.recordId, ctx.auth.userId),
      ),
    processRebook: rebookingCreate
      .input(processRebookSchema)
      .mutation(({ ctx, input }) =>
        processRebookRecord(ctx.auth.organizationId, input.recordId, {
          sameDesign: input.sameDesign,
          upgradeRequested: input.upgradeRequested,
          userId: ctx.auth.userId,
        }),
      ),
  }),
});
