import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listSignLocations,
  getSignLocation,
  createSignLocation,
  updateSignLocation,
  deleteSignLocation,
  recoverSignLocation,
  reverseGeocodeSignLocation,
  getSignTrackerPageData,
  getSignTrackerDashboard,
  getSignCityBreakdown,
  getSignPickupRoute,
  getSignCampaignReport,
  getTerritoryIntelligence,
  getSignTrackerSettings,
  updateSignTrackerSettings,
  createSignLocationFromJob,
  getCustomerSignLocations,
  markSignLocationsNeedsPickup,
} from '@yuletide/firebase';
import {
  createSignLocationSchema,
  updateSignLocationSchema,
  deleteSignLocationSchema,
  recoverSignLocationSchema,
  signLocationFilterSchema,
  reverseGeocodeSchema,
  signPickupQuerySchema,
  signTrackerSettingsSchema,
  createSignFromJobSchema,
} from '@clcrm/validators';
import { router, requireModule, requirePermission, protectedProcedure } from '../trpc';

const signModule = requireModule('sign_tracker');
const signView = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'view'));
const signCreate = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'create'));
const signEdit = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'edit'));
const signDelete = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'delete'));
const signExport = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'export'));
const signManage = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'manage'));
const signArchive = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'archive'));
const signRestore = protectedProcedure.use(signModule).use(requirePermission('sign_tracker', 'restore'));

export const signTracker360Router = router({
  pageData: signView.input(signLocationFilterSchema.optional()).query(({ ctx, input }) =>
    getSignTrackerPageData(ctx.auth.organizationId, {
      seasonYear: input?.seasonYear,
      city: input?.city,
      status: input?.status,
      placementType: input?.placementType,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      crewUserId: input?.crewUserId,
    }),
  ),

  dashboard: signView
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignTrackerDashboard(ctx.auth.organizationId, input?.seasonYear)),

  cities: signView
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignCityBreakdown(ctx.auth.organizationId, input?.seasonYear)),

  list: signView.input(signLocationFilterSchema.optional()).query(({ ctx, input }) =>
    listSignLocations(ctx.auth.organizationId, {
      seasonYear: input?.seasonYear,
      city: input?.city,
      status: input?.status,
      placementType: input?.placementType,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      crewUserId: input?.crewUserId,
    }),
  ),

  getById: signView.input(z.object({ locationId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const loc = await getSignLocation(ctx.auth.organizationId, input.locationId);
    if (!loc) throw new TRPCError({ code: 'NOT_FOUND' });
    return loc;
  }),

  reverseGeocode: signCreate.input(reverseGeocodeSchema).query(({ input }) =>
    reverseGeocodeSignLocation(input.latitude, input.longitude),
  ),

  create: signCreate.input(createSignLocationSchema).mutation(({ ctx, input }) =>
    createSignLocation(
      ctx.auth.organizationId,
      {
        seasonYear: input.seasonYear,
        location: input.location,
        quantityPlaced: input.quantityPlaced,
        placementType: input.placementType,
        notes: input.notes,
        photoUrl: input.photoUrl,
        customerId: input.customerId,
        jobId: input.jobId,
      },
      ctx.auth.userId,
      ctx.auth.email,
    ),
  ),

  update: signEdit.input(updateSignLocationSchema).mutation(async ({ ctx, input }) => {
    const { locationId, ...data } = input;
    return updateSignLocation(ctx.auth.organizationId, locationId, data, ctx.auth.userId, ctx.auth.email);
  }),

  delete: signDelete.input(deleteSignLocationSchema).mutation(async ({ ctx, input }) => {
    await deleteSignLocation(ctx.auth.organizationId, input.locationId);
    return { ok: true as const };
  }),

  archive: signArchive.input(z.object({ locationId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    return updateSignLocation(
      ctx.auth.organizationId,
      input.locationId,
      { status: 'removed' },
      ctx.auth.userId,
      ctx.auth.email,
    );
  }),

  restore: signRestore
    .input(z.object({ locationId: z.string().min(1), status: z.enum(['active', 'needs_pickup']).default('active') }))
    .mutation(async ({ ctx, input }) => {
      return updateSignLocation(
        ctx.auth.organizationId,
        input.locationId,
        { status: input.status },
        ctx.auth.userId,
        ctx.auth.email,
      );
    }),

  recover: signEdit.input(recoverSignLocationSchema).mutation(({ ctx, input }) => {
    const { locationId, ...data } = input;
    return recoverSignLocation(ctx.auth.organizationId, locationId, data, ctx.auth.userId, ctx.auth.email);
  }),

  pickupRoute: signView.input(signPickupQuerySchema).query(({ ctx, input }) =>
    getSignPickupRoute(ctx.auth.organizationId, input.latitude, input.longitude, input.seasonYear),
  ),

  report: signView
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignCampaignReport(ctx.auth.organizationId, input?.seasonYear)),

  reportExport: signExport
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [report, locations] = await Promise.all([
        getSignCampaignReport(ctx.auth.organizationId, input?.seasonYear),
        listSignLocations(ctx.auth.organizationId, { seasonYear: input?.seasonYear }),
      ]);
      return { report, locations };
    }),

  territory: signView
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getTerritoryIntelligence(ctx.auth.organizationId, input?.seasonYear)),

  settings: router({
    get: signManage.query(({ ctx }) => getSignTrackerSettings(ctx.auth.organizationId)),
    update: signManage.input(signTrackerSettingsSchema).mutation(({ ctx, input }) =>
      updateSignTrackerSettings(ctx.auth.organizationId, input),
    ),
  }),

  createFromJob: signCreate.input(createSignFromJobSchema).mutation(({ ctx, input }) =>
    createSignLocationFromJob(
      ctx.auth.organizationId,
      input.jobId,
      {
        quantityPlaced: input.quantityPlaced,
        placementType: input.placementType,
        notes: input.notes,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      ctx.auth.userId,
      ctx.auth.email,
    ),
  ),

  byCustomer: signView.input(z.object({ customerId: z.string().min(1) })).query(({ ctx, input }) =>
    getCustomerSignLocations(ctx.auth.organizationId, input.customerId),
  ),

  markNeedsPickup: signEdit
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .mutation(({ ctx, input }) => markSignLocationsNeedsPickup(ctx.auth.organizationId, input?.seasonYear)),
});
