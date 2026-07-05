import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  createEventFromJob,
  updateCalendarEvent,
  moveCalendarEvent,
  duplicateCalendarEvent,
  detectScheduleConflicts,
  ensureCrews,
  ensureVehicles,
  ensureScheduleTemplates,
  listDispatchBoard,
  updateDispatchStatus,
  optimizeRoute,
  listRoutes,
  listResourceReservations,
  createResourceReservation,
  getScheduleDashboard,
  getScheduleAnalytics,
  getWeatherForecast,
  getSeasonPlan,
  aiScheduleQuery,
  sendScheduleNotifications,
  getCrewProfile,
  createCrewProfile,
  updateCrewProfile,
  archiveCrewProfile,
  addCrewMember,
  removeCrewMember,
} from '@yuletide/firebase';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  moveEventSchema,
  duplicateEventSchema,
  createFromJobSchema,
  updateDispatchSchema,
  optimizeRouteSchema,
  createResourceReservationSchema,
  aiSchedulingQuerySchema,
  calendarRangeSchema,
  createCrewSchema,
  updateCrewSchema,
  crewMemberSchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

export const schedule360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getScheduleDashboard(ctx.auth.organizationId)),

  analytics: officeProcedure.query(({ ctx }) => getScheduleAnalytics(ctx.auth.organizationId)),

  weather: officeProcedure.query(({ ctx }) => getWeatherForecast(ctx.auth.organizationId)),

  seasonPlan: officeProcedure.query(() => getSeasonPlan()),

  aiQuery: officeProcedure.input(aiSchedulingQuerySchema).query(({ ctx, input }) =>
    aiScheduleQuery(ctx.auth.organizationId, input.question),
  ),

  events: router({
    list: officeProcedure.input(calendarRangeSchema.optional()).query(({ ctx, input }) =>
      listCalendarEvents(ctx.auth.organizationId, input?.start, input?.end),
    ),
    getById: officeProcedure.input(z.object({ eventId: z.string() })).query(async ({ ctx, input }) => {
      const event = await getCalendarEvent(ctx.auth.organizationId, input.eventId);
      if (!event) throw new TRPCError({ code: 'NOT_FOUND' });
      return event;
    }),
    create: officeProcedure.input(createCalendarEventSchema).mutation(({ ctx, input }) =>
      createCalendarEvent(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    createFromJob: officeProcedure.input(createFromJobSchema).mutation(({ ctx, input }) =>
      createEventFromJob(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateCalendarEventSchema).mutation(({ ctx, input }) => {
      const { eventId, ...data } = input;
      return updateCalendarEvent(ctx.auth.organizationId, eventId, data as never, ctx.auth.userId);
    }),
    move: officeProcedure.input(moveEventSchema).mutation(({ ctx, input }) =>
      moveCalendarEvent(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    duplicate: officeProcedure.input(duplicateEventSchema).mutation(({ ctx, input }) =>
      duplicateCalendarEvent(ctx.auth.organizationId, input.eventId, input.startAt, ctx.auth.userId),
    ),
    conflicts: officeProcedure.input(z.object({ eventId: z.string().optional() }).optional()).query(({ ctx, input }) =>
      detectScheduleConflicts(ctx.auth.organizationId, input?.eventId),
    ),
    notify: officeProcedure
      .input(z.object({ eventId: z.string(), type: z.enum(['confirmation', 'reminder_48h', 'reminder_24h', 'crew_en_route', 'completion']) }))
      .mutation(({ ctx, input }) =>
        sendScheduleNotifications(ctx.auth.organizationId, input.eventId, input.type, ctx.auth.userId),
      ),
  }),

  crews: router({
    list: officeProcedure.query(({ ctx }) => ensureCrews(ctx.auth.organizationId)),
    get: officeProcedure.input(z.object({ crewId: z.string().min(1) })).query(async ({ ctx, input }) => {
      const crew = await getCrewProfile(ctx.auth.organizationId, input.crewId);
      if (!crew || !crew.isActive) throw new TRPCError({ code: 'NOT_FOUND' });
      return crew;
    }),
    create: officeProcedure.input(createCrewSchema).mutation(({ ctx, input }) =>
      createCrewProfile(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    update: officeProcedure.input(updateCrewSchema).mutation(({ ctx, input }) => {
      const { crewId, ...data } = input;
      return updateCrewProfile(ctx.auth.organizationId, crewId, data, ctx.auth.userId);
    }),
    archive: officeProcedure.input(z.object({ crewId: z.string().min(1) })).mutation(({ ctx, input }) =>
      archiveCrewProfile(ctx.auth.organizationId, input.crewId, ctx.auth.userId),
    ),
    addMember: officeProcedure.input(crewMemberSchema).mutation(({ ctx, input }) =>
      addCrewMember(ctx.auth.organizationId, input.crewId, input.userId, ctx.auth.userId),
    ),
    removeMember: officeProcedure.input(crewMemberSchema).mutation(({ ctx, input }) =>
      removeCrewMember(ctx.auth.organizationId, input.crewId, input.userId, ctx.auth.userId),
    ),
  }),

  vehicles: router({
    list: officeProcedure.query(({ ctx }) => ensureVehicles(ctx.auth.organizationId)),
  }),

  templates: router({
    list: officeProcedure.query(({ ctx }) => ensureScheduleTemplates(ctx.auth.organizationId)),
  }),

  dispatch: router({
    list: officeProcedure.query(({ ctx }) => listDispatchBoard(ctx.auth.organizationId)),
    update: officeProcedure.input(updateDispatchSchema).mutation(({ ctx, input }) =>
      updateDispatchStatus(ctx.auth.organizationId, input.dispatchId, input.status, { eta: input.eta, completionPercent: input.completionPercent }, ctx.auth.userId),
    ),
  }),

  routes: router({
    list: officeProcedure.input(z.object({ date: z.coerce.date().optional() }).optional()).query(({ ctx, input }) =>
      listRoutes(ctx.auth.organizationId, input?.date),
    ),
    optimize: officeProcedure.input(optimizeRouteSchema).mutation(({ ctx, input }) =>
      optimizeRoute(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
  }),

  resources: router({
    list: officeProcedure.query(({ ctx }) => listResourceReservations(ctx.auth.organizationId)),
    reserve: officeProcedure.input(createResourceReservationSchema).mutation(({ ctx, input }) =>
      createResourceReservation(ctx.auth.organizationId, input as never, ctx.auth.userId),
    ),
  }),
});
