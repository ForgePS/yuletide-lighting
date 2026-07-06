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
import { router, protectedProcedure, officeProcedure } from '../trpc';

function canManageSigns(role: string) {
  return ['owner', 'admin', 'office'].includes(role);
}

const crewOrOfficeProcedure = protectedProcedure.use(({ ctx, next }) => next({ ctx }));

export const signTracker360Router = router({
  pageData: protectedProcedure.input(signLocationFilterSchema.optional()).query(({ ctx, input }) =>
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

  dashboard: protectedProcedure
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignTrackerDashboard(ctx.auth.organizationId, input?.seasonYear)),

  cities: protectedProcedure
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignCityBreakdown(ctx.auth.organizationId, input?.seasonYear)),

  list: protectedProcedure.input(signLocationFilterSchema.optional()).query(({ ctx, input }) =>
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

  getById: protectedProcedure.input(z.object({ locationId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const loc = await getSignLocation(ctx.auth.organizationId, input.locationId);
    if (!loc) throw new TRPCError({ code: 'NOT_FOUND' });
    return loc;
  }),

  reverseGeocode: protectedProcedure.input(reverseGeocodeSchema).query(({ input }) =>
    reverseGeocodeSignLocation(input.latitude, input.longitude),
  ),

  create: crewOrOfficeProcedure.input(createSignLocationSchema).mutation(({ ctx, input }) =>
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

  update: crewOrOfficeProcedure.input(updateSignLocationSchema).mutation(async ({ ctx, input }) => {
    const { locationId, ...data } = input;
  if (!canManageSigns(ctx.auth.role) && (data.status || data.quantityPlaced)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Crew can only update location details' });
    }
    return updateSignLocation(ctx.auth.organizationId, locationId, data, ctx.auth.userId, ctx.auth.email);
  }),

  delete: officeProcedure.input(deleteSignLocationSchema).mutation(async ({ ctx, input }) => {
    await deleteSignLocation(ctx.auth.organizationId, input.locationId);
    return { ok: true as const };
  }),

  recover: crewOrOfficeProcedure.input(recoverSignLocationSchema).mutation(({ ctx, input }) => {
    const { locationId, ...data } = input;
    return recoverSignLocation(ctx.auth.organizationId, locationId, data, ctx.auth.userId, ctx.auth.email);
  }),

  pickupRoute: protectedProcedure.input(signPickupQuerySchema).query(({ ctx, input }) =>
    getSignPickupRoute(ctx.auth.organizationId, input.latitude, input.longitude, input.seasonYear),
  ),

  report: officeProcedure
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getSignCampaignReport(ctx.auth.organizationId, input?.seasonYear)),

  territory: officeProcedure
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .query(({ ctx, input }) => getTerritoryIntelligence(ctx.auth.organizationId, input?.seasonYear)),

  settings: router({
    get: officeProcedure.query(({ ctx }) => getSignTrackerSettings(ctx.auth.organizationId)),
    update: officeProcedure.input(signTrackerSettingsSchema).mutation(({ ctx, input }) =>
      updateSignTrackerSettings(ctx.auth.organizationId, input),
    ),
  }),

  createFromJob: crewOrOfficeProcedure.input(createSignFromJobSchema).mutation(({ ctx, input }) =>
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

  byCustomer: protectedProcedure.input(z.object({ customerId: z.string().min(1) })).query(({ ctx, input }) =>
    getCustomerSignLocations(ctx.auth.organizationId, input.customerId),
  ),

  markNeedsPickup: officeProcedure
    .input(z.object({ seasonYear: z.number().int().optional() }).optional())
    .mutation(({ ctx, input }) => markSignLocationsNeedsPickup(ctx.auth.organizationId, input?.seasonYear)),
});
