import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  cmsCollectionCreateSchema,
  cmsCollectionEntrySchema,
  cmsCollectionUpdateSchema,
  cmsFormCreateSchema,
  cmsFormSubmitSchema,
  cmsFormUpdateSchema,
  cmsMediaUpdateSchema,
  cmsNoticeSchema,
  cmsRedirectSchema,
  cmsSeoGlobalsSchema,
} from '@clcrm/validators';
import {
  createCmsForm,
  createCollection,
  deleteCmsForm,
  deleteCollection,
  deleteCollectionEntry,
  deleteMediaAsset,
  deleteNotice,
  deleteRedirect,
  ensureDefaultContactForm,
  getActiveNotices,
  getCmsForm,
  getCollection,
  getSeoGlobals,
  listCmsForms,
  listCollectionEntries,
  listCollections,
  listFormSubmissions,
  listMediaAssets,
  listNotices,
  listRedirects,
  registerMediaAsset,
  registerUploadedMediaAsset,
  submitCmsForm,
  updateCmsForm,
  updateCollection,
  updateFormSubmission,
  updateMediaAsset,
  updateSeoGlobals,
  upsertCollectionEntry,
  upsertNotice,
  upsertRedirect,
} from '@yuletide/firebase';
import { router, publicProcedure, creatorProcedure } from '../trpc';

export const siteCmsExtendedRouter = router({
  media: router({
    list: creatorProcedure
      .input(
        z
          .object({
            folder: z.string().optional(),
            kind: z.string().optional(),
            search: z.string().optional(),
          })
          .optional(),
      )
      .query(({ input }) => listMediaAssets(input)),
    update: creatorProcedure.input(cmsMediaUpdateSchema).mutation(({ input }) => {
      const { id, ...patch } = input;
      return updateMediaAsset(id, patch);
    }),
    delete: creatorProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      try {
        await deleteMediaAsset(input.id);
        return { ok: true };
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Delete failed',
        });
      }
    }),
    registerFromUpload: creatorProcedure
      .input(
        z.object({
          path: z.string(),
          url: z.string(),
          filename: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number(),
          folder: z.string().optional(),
          altText: z.string().optional(),
          caption: z.string().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        registerUploadedMediaAsset({ ...input, actorEmail: ctx.auth.email }),
      ),
  }),

  forms: router({
    list: creatorProcedure.query(() => listCmsForms()),
    get: creatorProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      const form = await getCmsForm(input.id);
      if (!form) throw new TRPCError({ code: 'NOT_FOUND' });
      return form;
    }),
    ensureDefault: creatorProcedure.mutation(() => ensureDefaultContactForm()),
    create: creatorProcedure.input(cmsFormCreateSchema).mutation(({ input }) => createCmsForm(input)),
    update: creatorProcedure.input(cmsFormUpdateSchema).mutation(({ input }) => {
      const { id, ...patch } = input;
      return updateCmsForm(id, patch);
    }),
    delete: creatorProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteCmsForm(input.id);
      return { ok: true };
    }),
    submissions: creatorProcedure
      .input(
        z.object({
          formId: z.string(),
          status: z.string().optional(),
          search: z.string().optional(),
        }),
      )
      .query(({ input }) => listFormSubmissions(input.formId, input)),
    updateSubmission: creatorProcedure
      .input(
        z.object({
          formId: z.string(),
          submissionId: z.string(),
          status: z.enum(['new', 'read', 'replied', 'spam', 'archived']).optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(({ input }) =>
        updateFormSubmission(input.formId, input.submissionId, {
          status: input.status,
          notes: input.notes,
        }),
      ),
    publicGet: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => getCmsForm(input.id)),
    publicSubmit: publicProcedure.input(cmsFormSubmitSchema).mutation(async ({ input }) => {
      try {
        return await submitCmsForm(input);
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Submit failed',
        });
      }
    }),
  }),

  collections: router({
    list: creatorProcedure.query(() => listCollections()),
    get: creatorProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      const col = await getCollection(input.id);
      if (!col) throw new TRPCError({ code: 'NOT_FOUND' });
      return col;
    }),
    create: creatorProcedure.input(cmsCollectionCreateSchema).mutation(({ input }) => createCollection(input)),
    update: creatorProcedure.input(cmsCollectionUpdateSchema).mutation(({ input }) => {
      const { id, ...patch } = input;
      return updateCollection(id, patch);
    }),
    delete: creatorProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteCollection(input.id);
      return { ok: true };
    }),
    entries: creatorProcedure
      .input(
        z.object({
          collectionId: z.string(),
          status: z.string().optional(),
          featuredOnly: z.boolean().optional(),
          limit: z.number().optional(),
        }),
      )
      .query(({ input }) =>
        listCollectionEntries(input.collectionId, {
          status: input.status,
          featuredOnly: input.featuredOnly,
          limit: input.limit,
        }),
      ),
    upsertEntry: creatorProcedure.input(cmsCollectionEntrySchema).mutation(({ input }) => {
      const { collectionId, ...rest } = input;
      return upsertCollectionEntry(collectionId, rest);
    }),
    deleteEntry: creatorProcedure
      .input(z.object({ collectionId: z.string(), entryId: z.string() }))
      .mutation(async ({ input }) => {
        await deleteCollectionEntry(input.collectionId, input.entryId);
        return { ok: true };
      }),
    publicEntries: publicProcedure
      .input(
        z.object({
          collectionId: z.string(),
          featuredOnly: z.boolean().optional(),
          limit: z.number().optional(),
        }),
      )
      .query(({ input }) =>
        listCollectionEntries(input.collectionId, {
          status: 'published',
          featuredOnly: input.featuredOnly,
          limit: input.limit,
        }),
      ),
  }),

  notices: router({
    list: creatorProcedure.query(() => listNotices()),
    active: publicProcedure
      .input(z.object({ pageSlug: z.string().optional() }).optional())
      .query(({ input }) => getActiveNotices(input?.pageSlug)),
    upsert: creatorProcedure.input(cmsNoticeSchema).mutation(({ input }) => upsertNotice(input)),
    delete: creatorProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteNotice(input.id);
      return { ok: true };
    }),
  }),

  redirects: router({
    list: creatorProcedure.query(() => listRedirects()),
    upsert: creatorProcedure.input(cmsRedirectSchema).mutation(({ input }) => upsertRedirect(input)),
    delete: creatorProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteRedirect(input.id);
      return { ok: true };
    }),
  }),

  seo: router({
    get: creatorProcedure.query(() => getSeoGlobals()),
    update: creatorProcedure.input(cmsSeoGlobalsSchema).mutation(({ input }) => updateSeoGlobals(input)),
    publicRobots: publicProcedure.query(async () => {
      const seo = await getSeoGlobals();
      return { robotsTxt: seo.robotsTxt };
    }),
  }),
});
