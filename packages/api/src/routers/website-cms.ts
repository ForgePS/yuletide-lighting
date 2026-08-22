import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  cmsNamedFooterUpsertSchema,
  cmsPageCreateSchema,
  cmsPageUpdateSchema,
  cmsSavedSectionCreateSchema,
  cmsSavedSectionUpdateSchema,
  cmsSiteGlobalsSchema,
} from '@clcrm/validators';
import {
  createCmsPage,
  createCmsSavedSection,
  deleteCmsPage,
  deleteCmsSavedSection,
  deleteNamedFooter,
  ensureWebsiteCmsSeeded,
  getCmsLinkCheckReport,
  getCmsPageById,
  getCmsPageBySlug,
  getPublishedPageBundle,
  getSiteGlobals,
  listCmsPageVersions,
  listCmsPages,
  listCmsSavedSections,
  listNamedFooters,
  restoreCmsPageVersion,
  runCmsBrokenLinkCheck,
  searchPublishedCmsPages,
  updateCmsPage,
  updateCmsSavedSection,
  updateSiteGlobals,
  upsertNamedFooter,
} from '@yuletide/firebase';
import { router, publicProcedure, creatorProcedure } from '../trpc';
import { revalidateCmsPublicPaths } from '../cms-revalidate';

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
    search: publicProcedure
      .input(z.object({ query: z.string().min(1).max(120), limit: z.number().int().min(1).max(50).optional() }))
      .query(async ({ input }) => {
        try {
          return await searchPublishedCmsPages(input.query, input.limit ?? 20);
        } catch (err) {
          console.error('[websiteCms.public.search]', err);
          return [];
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
        const page = await createCmsPage(input, {
          email: ctx.auth.email,
          userId: ctx.auth.userId,
        });
        await revalidateCmsPublicPaths(page.slug);
        return page;
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Could not create page',
        });
      }
    }),
    update: creatorProcedure.input(cmsPageUpdateSchema).mutation(async ({ ctx, input }) => {
      try {
        const page = await updateCmsPage(input, {
          email: ctx.auth.email,
          userId: ctx.auth.userId,
        });
        await revalidateCmsPublicPaths(page.slug);
        return page;
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
          const existing = await getCmsPageById(input.id);
          await deleteCmsPage(input.id, {
            email: ctx.auth.email,
            userId: ctx.auth.userId,
          });
          await revalidateCmsPublicPaths(existing?.slug);
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
          const page = await restoreCmsPageVersion(input.versionId, {
            email: ctx.auth.email,
            userId: ctx.auth.userId,
          });
          await revalidateCmsPublicPaths(page.slug);
          return page;
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
    update: creatorProcedure.input(cmsSiteGlobalsSchema).mutation(async ({ ctx, input }) => {
      const globals = await updateSiteGlobals(input, {
        email: ctx.auth.email,
        userId: ctx.auth.userId,
      });
      await revalidateCmsPublicPaths();
      return globals;
    }),
  }),

  sections: router({
    list: creatorProcedure.query(() => listCmsSavedSections()),
    create: creatorProcedure.input(cmsSavedSectionCreateSchema).mutation(async ({ ctx, input }) => {
      return createCmsSavedSection(input, { email: ctx.auth.email, userId: ctx.auth.userId });
    }),
    update: creatorProcedure.input(cmsSavedSectionUpdateSchema).mutation(async ({ ctx, input }) => {
      try {
        return await updateCmsSavedSection(input, {
          email: ctx.auth.email,
          userId: ctx.auth.userId,
        });
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Could not update section',
        });
      }
    }),
    delete: creatorProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await deleteCmsSavedSection(input.id, { email: ctx.auth.email, userId: ctx.auth.userId });
        return { ok: true };
      }),
  }),

  footers: router({
    list: creatorProcedure.query(() => listNamedFooters()),
    upsert: creatorProcedure.input(cmsNamedFooterUpsertSchema).mutation(async ({ ctx, input }) => {
      const footer = await upsertNamedFooter(input, {
        email: ctx.auth.email,
        userId: ctx.auth.userId,
      });
      await revalidateCmsPublicPaths();
      return footer;
    }),
    delete: creatorProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await deleteNamedFooter(input.id, { email: ctx.auth.email, userId: ctx.auth.userId });
        await revalidateCmsPublicPaths();
        return { ok: true };
      }),
  }),

  links: router({
    report: creatorProcedure.query(() => getCmsLinkCheckReport()),
    runCheck: creatorProcedure.mutation(async () => {
      try {
        return await runCmsBrokenLinkCheck();
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Link check failed',
        });
      }
    }),
  }),
});
