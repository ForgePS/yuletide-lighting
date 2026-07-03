import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createContact360,
  deleteContact360,
  getContact360,
  listContacts360,
  updateContact360,
} from '@yuletide/firebase';
import { contactInputSchema, contactListFiltersSchema, updateContactInputSchema } from '@clcrm/validators';
import { router, adminProcedure, officeProcedure } from '../trpc';

export const contacts360Router = router({
  list: officeProcedure.input(contactListFiltersSchema.optional()).query(({ ctx, input }) =>
    listContacts360(ctx.auth.organizationId, {
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      customerId: input?.customerId,
    }),
  ),

  getById: officeProcedure.input(z.object({ contactId: z.string() })).query(async ({ ctx, input }) => {
    const contact = await getContact360(ctx.auth.organizationId, input.contactId);
    if (!contact) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
    return contact;
  }),

  create: officeProcedure.input(contactInputSchema).mutation(({ ctx, input }) =>
    createContact360(ctx.auth.organizationId, input, ctx.auth.userId),
  ),

  update: officeProcedure
    .input(z.object({ contactId: z.string(), data: updateContactInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const contact = await updateContact360(ctx.auth.organizationId, input.contactId, input.data, ctx.auth.userId);
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
      return contact;
    }),

  delete: adminProcedure.input(z.object({ contactId: z.string() })).mutation(({ ctx, input }) =>
    deleteContact360(ctx.auth.organizationId, input.contactId),
  ),
});
