import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  cmsPageCreateSchema,
  cmsPageUpdateSchema,
  cmsSiteGlobalsSchema,
} from '@clcrm/validators';
import {
  createCmsPage,
  deleteCmsPage,
  getCmsPageById,
  getCmsPageBySlug,
  getPublishedPageBundle,
  getSiteGlobals,
  listCmsPageVersions,
  listCmsPages,
  restoreCmsPageVersion,
  updateCmsPage,
  updateSiteGlobals,
  ensureWebsiteCmsSeeded,
} from '@yuletide/firebase';
import { router, publicProcedure, creatorProcedure } from '../trpc';

export const websiteCmsRouter = router({
  public: router({
    getPage: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          return await getPublishedPageBundle(input.slug);
        } catch (err) {
          console.error('[websiteCms.public.getPage]', err);
          return { page: null, globals: await getSiteGlobals().catch(() => null) };
        }
      }),
    getGlobals: publicProcedure.query(async () => {
      try {
        return await getSiteGlobals();
      } catch (err) {
        console.error('[websiteCms.public.getGlobals]', err);
        return null;
      }
    }),
  }),

  seed: creatorProcedure.mutation(async () => {
    await ensureWebsiteCmsSeeded();
    return { ok: true };
  }),

  pages: router({
    list: creatorProcedure.query(() => listCmsPages()),
    get: creatorProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ input }) => {
        const page = await getCmsPageById(input.id);
        if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
        return page;
      }),
    getBySlug: creatorProcedure
      .input(z.object({ slug: z.string().min(1), includeDrafts: z.boolean().optional() }))
      .query(({ input }) => getCmsPageBySlug(input.slug, { includeDrafts: input.includeDrafts ?? true })),
    create: creatorProcedure.input(cmsPageCreateSchema).mutation(async ({ ctx, input }) => {
      try {
        return await createCmsPage(input, {
          email: ctx.auth.email,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Could not create page',
        });
      }
    }),
    update: creatorProcedure.input(cmsPageUpdateSchema).mutation(async ({ ctx, input }) => {
      try {
        return await updateCmsPage(input, {
          email: ctx.auth.email,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Could not update page',
        });
      }
    }),
    delete: creatorProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        try {
          await deleteCmsPage(input.id, {
            email: ctx.auth.email,
            userId: ctx.auth.userId,
          });
          return { ok: true };
        } catch (err) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err instanceof Error ? err.message : 'Could not delete page',
          });
        }
      }),
    versions: creatorProcedure
      .input(z.object({ pageId: z.string().min(1), limit: z.number().int().min(1).max(50).optional() }))
      .query(({ input }) => listCmsPageVersions(input.pageId, input.limit)),
    restoreVersion: creatorProcedure
      .input(z.object({ versionId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await restoreCmsPageVersion(input.versionId, {
            email: ctx.auth.email,
            userId: ctx.auth.userId,
          });
        } catch (err) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err instanceof Error ? err.message : 'Could not restore version',
          });
        }
      }),
  }),

  globals: router({
    get: creatorProcedure.query(() => getSiteGlobals()),
    update: creatorProcedure.input(cmsSiteGlobalsSchema).mutation(({ ctx, input }) =>
      updateSiteGlobals(input, {
        email: ctx.auth.email,
        userId: ctx.auth.userId,
      }),
    ),
  }),
});
