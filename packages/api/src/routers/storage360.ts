import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listStorageRecords,
  getStorageRecord,
  createStorageRecord,
  updateStorageRecord,
  createStoredItem,
  updateStoredItem,
  generateStoragePullSheet,
  createStorageFromRemoval,
  getStorageDashboard,
} from '@yuletide/firebase';
import {
  createStorageRecordSchema,
  updateStorageRecordSchema,
  createStoredItemSchema,
  updateStoredItemSchema,
  storagePullSheetSchema,
  createStorageFromRemovalSchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

function emptyToNull(value: string | undefined | null) {
  return value === '' || value == null ? null : value;
}

export const storage360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getStorageDashboard(ctx.auth.organizationId)),

  records: router({
    list: officeProcedure
      .input(z.object({ customerId: z.string().optional() }).optional())
      .query(({ ctx, input }) => listStorageRecords(ctx.auth.organizationId, input?.customerId)),
    getById: officeProcedure.input(z.object({ recordId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const detail = await getStorageRecord(ctx.auth.organizationId, input.recordId);
      if (!detail) throw new TRPCError({ code: 'NOT_FOUND' });
      return detail;
    }),
    create: officeProcedure.input(createStorageRecordSchema).mutation(({ ctx, input }) =>
      createStorageRecord(
        ctx.auth.organizationId,
        {
          customerId: input.customerId,
          propertyId: emptyToNull(input.propertyId),
          jobId: emptyToNull(input.jobId),
          storageType: input.storageType,
          binNumber: input.binNumber ?? '',
          locationId: input.locationId ?? 'Main warehouse',
          rack: emptyToNull(input.rack),
          shelf: emptyToNull(input.shelf),
          conditionNotes: emptyToNull(input.conditionNotes),
          photos: input.photos,
          storageFeeCents: input.storageFeeCents ?? null,
          agreementSignedAt: input.agreementSignedAt ?? null,
        },
        ctx.auth.userId,
      ),
    ),
    update: officeProcedure.input(updateStorageRecordSchema).mutation(({ ctx, input }) => {
      const { recordId, ...data } = input;
      return updateStorageRecord(
        ctx.auth.organizationId,
        recordId,
        {
          ...data,
          binNumber: data.binNumber ?? undefined,
          locationId: data.locationId ?? undefined,
          rack: data.rack !== undefined ? emptyToNull(data.rack) : undefined,
          shelf: data.shelf !== undefined ? emptyToNull(data.shelf) : undefined,
          conditionNotes: data.conditionNotes !== undefined ? emptyToNull(data.conditionNotes) : undefined,
        },
        ctx.auth.userId,
      );
    }),
    fromRemoval: officeProcedure.input(createStorageFromRemovalSchema).mutation(({ ctx, input }) =>
      createStorageFromRemoval(
        ctx.auth.organizationId,
        input.jobId,
        { binNumber: input.binNumber, locationId: input.locationId },
        ctx.auth.userId,
      ),
    ),
  }),

  items: router({
    create: officeProcedure.input(createStoredItemSchema).mutation(({ ctx, input }) =>
      createStoredItem(
        ctx.auth.organizationId,
        input.recordId,
        {
          name: input.name,
          quantity: input.quantity,
          condition: input.condition,
          notes: emptyToNull(input.notes),
        },
        ctx.auth.userId,
      ),
    ),
    update: officeProcedure.input(updateStoredItemSchema).mutation(({ ctx, input }) => {
      const { recordId, itemId, ...data } = input;
      return updateStoredItem(
        ctx.auth.organizationId,
        recordId,
        itemId,
        {
          ...data,
          notes: data.notes !== undefined ? emptyToNull(data.notes) : undefined,
        },
        ctx.auth.userId,
      );
    }),
  }),

  pullSheet: officeProcedure.input(storagePullSheetSchema).query(({ ctx, input }) =>
    generateStoragePullSheet(ctx.auth.organizationId, input),
  ),
});
