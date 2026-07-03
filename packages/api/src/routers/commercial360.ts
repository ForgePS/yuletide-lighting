import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listCommercialAccounts,
  getCommercialAccount,
  createCommercialAccount,
  updateCommercialAccount,
  addCommercialLocation,
  updateCommercialLocation,
  createCommercialContract,
  updateCommercialContract,
  createMultiLocationCommercialProposal,
  getCommercialDashboard,
} from '@yuletide/firebase';
import {
  createCommercialAccountSchema,
  updateCommercialAccountSchema,
  createCommercialLocationSchema,
  updateCommercialLocationSchema,
  createCommercialContractSchema,
  updateCommercialContractSchema,
  createMultiLocationProposalSchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

function emptyToNull(value: string | undefined | null) {
  return value === '' || value == null ? null : value;
}

export const commercial360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getCommercialDashboard(ctx.auth.organizationId)),

  accounts: router({
    list: officeProcedure.query(({ ctx }) => listCommercialAccounts(ctx.auth.organizationId)),
    getById: officeProcedure.input(z.object({ accountId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const account = await getCommercialAccount(ctx.auth.organizationId, input.accountId);
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' });
      return account;
    }),
    create: officeProcedure.input(createCommercialAccountSchema).mutation(({ ctx, input }) =>
      createCommercialAccount(
        ctx.auth.organizationId,
        {
          name: input.name,
          customerId: emptyToNull(input.customerId),
          billingContactId: emptyToNull(input.billingContactId),
          accountManagerId: emptyToNull(input.accountManagerId),
          accountManagerName: emptyToNull(input.accountManagerName),
          billingAddress: emptyToNull(input.billingAddress),
          notes: emptyToNull(input.notes),
          status: input.status,
          siteMapUrl: emptyToNull(input.siteMapUrl),
        },
        ctx.auth.userId,
      ),
    ),
    update: officeProcedure.input(updateCommercialAccountSchema).mutation(({ ctx, input }) => {
      const { accountId, ...data } = input;
      return updateCommercialAccount(
        ctx.auth.organizationId,
        accountId,
        {
          ...data,
          customerId: data.customerId !== undefined ? emptyToNull(data.customerId) : undefined,
          billingContactId: data.billingContactId !== undefined ? emptyToNull(data.billingContactId) : undefined,
          accountManagerId: data.accountManagerId !== undefined ? emptyToNull(data.accountManagerId) : undefined,
          accountManagerName: data.accountManagerName !== undefined ? emptyToNull(data.accountManagerName) : undefined,
          billingAddress: data.billingAddress !== undefined ? emptyToNull(data.billingAddress) : undefined,
          notes: data.notes !== undefined ? emptyToNull(data.notes) : undefined,
          siteMapUrl: data.siteMapUrl !== undefined ? emptyToNull(data.siteMapUrl) : undefined,
        },
        ctx.auth.userId,
      );
    }),
  }),

  locations: router({
    create: officeProcedure.input(createCommercialLocationSchema).mutation(({ ctx, input }) => {
      const { accountId, ...data } = input;
      return addCommercialLocation(
        ctx.auth.organizationId,
        accountId,
        {
          ...data,
          addressLine2: emptyToNull(data.addressLine2),
          siteContactName: emptyToNull(data.siteContactName),
          siteContactPhone: emptyToNull(data.siteContactPhone),
          siteNotes: emptyToNull(data.siteNotes),
          propertyId: emptyToNull(data.propertyId),
          maintenanceScheduleNotes: emptyToNull(data.maintenanceScheduleNotes),
        },
        ctx.auth.userId,
      );
    }),
    update: officeProcedure.input(updateCommercialLocationSchema).mutation(({ ctx, input }) => {
      const { accountId, locationId, ...data } = input;
      return updateCommercialLocation(
        ctx.auth.organizationId,
        accountId,
        locationId,
        {
          ...data,
          addressLine2: data.addressLine2 !== undefined ? emptyToNull(data.addressLine2) : undefined,
          siteContactName: data.siteContactName !== undefined ? emptyToNull(data.siteContactName) : undefined,
          siteContactPhone: data.siteContactPhone !== undefined ? emptyToNull(data.siteContactPhone) : undefined,
          siteNotes: data.siteNotes !== undefined ? emptyToNull(data.siteNotes) : undefined,
          propertyId: data.propertyId !== undefined ? emptyToNull(data.propertyId) : undefined,
          maintenanceScheduleNotes:
            data.maintenanceScheduleNotes !== undefined ? emptyToNull(data.maintenanceScheduleNotes) : undefined,
        },
        ctx.auth.userId,
      );
    }),
  }),

  contracts: router({
    create: officeProcedure.input(createCommercialContractSchema).mutation(({ ctx, input }) => {
      const { accountId, ...data } = input;
      return createCommercialContract(
        ctx.auth.organizationId,
        accountId,
        {
          ...data,
          maintenanceNotes: emptyToNull(data.maintenanceNotes),
        },
        ctx.auth.userId,
      );
    }),
    update: officeProcedure.input(updateCommercialContractSchema).mutation(({ ctx, input }) => {
      const { accountId, contractId, ...data } = input;
      return updateCommercialContract(
        ctx.auth.organizationId,
        accountId,
        contractId,
        {
          ...data,
          maintenanceNotes: data.maintenanceNotes !== undefined ? emptyToNull(data.maintenanceNotes) : undefined,
        },
        ctx.auth.userId,
      );
    }),
  }),

  proposals: router({
    createMultiLocation: officeProcedure.input(createMultiLocationProposalSchema).mutation(({ ctx, input }) =>
      createMultiLocationCommercialProposal(
        ctx.auth.organizationId,
        {
          accountId: input.accountId,
          locationIds: input.locationIds,
          title: input.title,
          scopeOfWork: emptyToNull(input.scopeOfWork),
          lineItemsPerLocation: input.lineItemsPerLocation,
          defaultUnitPriceCents: input.defaultUnitPriceCents,
        },
        ctx.auth.userId,
      ),
    ),
  }),
});
