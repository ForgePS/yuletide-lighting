import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createMultiYearAgreement360,
  deleteMultiYearAgreement360,
  getAgreementByPublicToken,
  getMultiYearAgreement360,
  linkProjectToAgreement360,
  listMultiYearAgreements360,
  recordAgreementSignature,
  sendAgreementForSignature360,
  updateMultiYearAgreement360,
} from '@yuletide/firebase';
import {
  agreementPublicSignSchema,
  multiYearAgreementInputSchema,
  multiYearAgreementListFiltersSchema,
  updateMultiYearAgreementInputSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure, publicProcedure } from '../trpc';

export const agreements360Router = router({
  list: officeProcedure.input(multiYearAgreementListFiltersSchema.optional()).query(({ ctx, input }) =>
    listMultiYearAgreements360(ctx.auth.organizationId, {
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      status: input?.status,
      customerId: input?.customerId,
    }),
  ),

  getById: officeProcedure.input(z.object({ agreementId: z.string() })).query(async ({ ctx, input }) => {
    const agreement = await getMultiYearAgreement360(ctx.auth.organizationId, input.agreementId);
    if (!agreement) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
    return agreement;
  }),

  create: officeProcedure.input(multiYearAgreementInputSchema).mutation(({ ctx, input }) =>
    createMultiYearAgreement360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  update: officeProcedure
    .input(z.object({ agreementId: z.string(), data: updateMultiYearAgreementInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const agreement = await updateMultiYearAgreement360(
        ctx.auth.organizationId,
        input.agreementId,
        input.data,
        ctx.auth.userId,
      );
      if (!agreement) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
      return agreement;
    }),

  sendForSignature: officeProcedure
    .input(z.object({ agreementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agreement = await sendAgreementForSignature360(
        ctx.auth.organizationId,
        input.agreementId,
        ctx.auth.userId,
      );
      if (!agreement) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
      return agreement;
    }),

  linkProject: officeProcedure
    .input(z.object({ agreementId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agreement = await linkProjectToAgreement360(
        ctx.auth.organizationId,
        input.agreementId,
        input.projectId,
        ctx.auth.userId,
      );
      if (!agreement) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
      return agreement;
    }),

  delete: adminProcedure.input(z.object({ agreementId: z.string() })).mutation(({ ctx, input }) =>
    deleteMultiYearAgreement360(ctx.auth.organizationId, input.agreementId),
  ),

  public: router({
    getByToken: publicProcedure.input(z.object({ token: z.string().min(8) })).query(async ({ input }) => {
      const result = await getAgreementByPublicToken(input.token);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
      return result;
    }),

    sign: publicProcedure.input(agreementPublicSignSchema).mutation(async ({ input, ctx }) => {
      try {
        const result = await recordAgreementSignature(input.token, {
          signedByName: input.signedByName,
          signatureData: input.signatureData,
          ipAddress: input.ipAddress ?? (ctx as { ip?: string }).ip ?? null,
          userAgent: input.userAgent,
        });
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agreement not found' });
        return result;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Could not record signature',
        });
      }
    }),
  }),
});
