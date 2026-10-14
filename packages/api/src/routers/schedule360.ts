import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  createEventFromJob,
  updateCalendarEvent,
  moveCalendarEvent,
  deleteCalendarEvent,
  duplicateCalendarEvent,
  detectScheduleConflicts,
  ensureCrews,
  updateCrewProfileAssignedUser,
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
  deleteCrewProfile,
  addCrewMember,
  removeCrewMember,
  listScheduleBlackouts,
  createScheduleBlackout,
  deleteScheduleBlackout,
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
  updateCrewAssignedUserSchema,
  createCrewSchema,
  updateCrewSchema,
  crewMemberSchema,
  createScheduleBlackoutSchema,
} from '@clcrm/validators';
import { router, permissionProcedure, requireModule, officeProcedure } from '../trpc';

export const schedule360Router = router({
  dashboard: permissionProcedure('jobs', 'view').query(({ ctx }) =>
    getScheduleDashboard(ctx.auth.organizationId),
  ),

  analytics: permissionProcedure('jobs', 'view').query(({ ctx }) =>
    getScheduleAnalytics(ctx.auth.organizationId),
  ),

  weather: permissionProcedure('jobs', 'view').query(({ ctx }) =>
    getWeatherForecast(ctx.auth.organizationId),
  ),

  seasonPlan: permissionProcedure('jobs', 'view').query(() => getSeasonPlan()),

  aiQuery: permissionProcedure('jobs', 'view')
    .input(aiSchedulingQuerySchema)
    .query(({ ctx, input }) => aiScheduleQuery(ctx.auth.organizationId, input.question)),

  events: router({
    list: permissionProcedure('jobs', 'view')
      .input(calendarRangeSchema.optional())
      .query(({ ctx, input }) => listCalendarEvents(ctx.auth.organizationId, input?.start, input?.end)),
    getById: permissionProcedure('jobs', 'view')
      .input(z.object({ eventId: z.string() }))
      .query(async ({ ctx, input }) => {
        const event = await getCalendarEvent(ctx.auth.organizationId, input.eventId);
        if (!event) throw new TRPCError({ code: 'NOT_FOUND' });
        return event;
      }),
    create: permissionProcedure('jobs', 'create')
      .input(createCalendarEventSchema)
      .mutation(({ ctx, input }) => createCalendarEvent(ctx.auth.organizationId, input, ctx.auth.userId)),
    createFromJob: permissionProcedure('jobs', 'create')
      .input(createFromJobSchema)
      .mutation(({ ctx, input }) => createEventFromJob(ctx.auth.organizationId, input, ctx.auth.userId)),
    update: permissionProcedure('jobs', 'edit')
      .input(updateCalendarEventSchema)
      .mutation(({ ctx, input }) => {
        const { eventId, ...data } = input;
        return updateCalendarEvent(ctx.auth.organizationId, eventId, data as never, ctx.auth.userId);
      }),
    move: permissionProcedure('jobs', 'edit')
      .input(moveEventSchema)
      .mutation(({ ctx, input }) => moveCalendarEvent(ctx.auth.organizationId, input, ctx.auth.userId)),
    delete: permissionProcedure('jobs', 'delete')
      .input(z.object({ eventId: z.string().min(1) }))
      .mutation(({ ctx, input }) => deleteCalendarEvent(ctx.auth.organizationId, input.eventId, ctx.auth.userId)),
    duplicate: permissionProcedure('jobs', 'create')
      .input(duplicateEventSchema)
      .mutation(({ ctx, input }) =>
        duplicateCalendarEvent(ctx.auth.organizationId, input.eventId, input.startAt, ctx.auth.userId),
      ),
    conflicts: permissionProcedure('jobs', 'view')
      .input(z.object({ eventId: z.string().optional() }).optional())
      .query(({ ctx, input }) => detectScheduleConflicts(ctx.auth.organizationId, input?.eventId)),
    notify: permissionProcedure('jobs', 'edit')
      .input(
        z.object({
          eventId: z.string(),
          type: z.enum(['confirmation', 'reminder_48h', 'reminder_24h', 'crew_en_route', 'completion']),
        }),
      )
      .mutation(({ ctx, input }) =>
        sendScheduleNotifications(ctx.auth.organizationId, input.eventId, input.type, ctx.auth.userId),
      ),
  }),

  crews: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) => ensureCrews(ctx.auth.organizationId)),
    get: permissionProcedure('jobs', 'view')
      .input(z.object({ crewId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
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
    delete: officeProcedure.input(z.object({ crewId: z.string().min(1) })).mutation(({ ctx, input }) =>
      deleteCrewProfile(ctx.auth.organizationId, input.crewId, ctx.auth.userId),
    ),
    addMember: officeProcedure.input(crewMemberSchema).mutation(({ ctx, input }) =>
      addCrewMember(ctx.auth.organizationId, input.crewId, input.userId, ctx.auth.userId),
    ),
    removeMember: officeProcedure.input(crewMemberSchema).mutation(({ ctx, input }) =>
      removeCrewMember(ctx.auth.organizationId, input.crewId, input.userId, ctx.auth.userId),
    ),
    updateAssignedUser: permissionProcedure('jobs', 'edit')
      .input(updateCrewAssignedUserSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateCrewProfileAssignedUser(
            ctx.auth.organizationId,
            input.crewId,
            input.assignedUserId,
            ctx.auth.userId,
          );
        } catch (err) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: err instanceof Error ? err.message : 'Crew profile not found',
          });
        }
      }),
  }),

  vehicles: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) => ensureVehicles(ctx.auth.organizationId)),
  }),

  templates: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) =>
      ensureScheduleTemplates(ctx.auth.organizationId),
    ),
  }),

  dispatch: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) =>
      listDispatchBoard(ctx.auth.organizationId),
    ),
    update: permissionProcedure('jobs', 'edit')
      .input(updateDispatchSchema)
      .mutation(({ ctx, input }) =>
        updateDispatchStatus(
          ctx.auth.organizationId,
          input.dispatchId,
          input.status,
          { eta: input.eta, completionPercent: input.completionPercent },
          ctx.auth.userId,
        ),
      ),
  }),

  routes: router({
    list: permissionProcedure('jobs', 'view')
      .use(requireModule('routes'))
      .input(z.object({ date: z.coerce.date().optional() }).optional())
      .query(({ ctx, input }) => listRoutes(ctx.auth.organizationId, input?.date)),
    optimize: permissionProcedure('jobs', 'edit')
      .use(requireModule('routes'))
      .input(optimizeRouteSchema)
      .mutation(({ ctx, input }) => optimizeRoute(ctx.auth.organizationId, input, ctx.auth.userId)),
  }),

  blackouts: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) => listScheduleBlackouts(ctx.auth.organizationId)),
    create: permissionProcedure('jobs', 'edit')
      .input(createScheduleBlackoutSchema)
      .mutation(({ ctx, input }) => createScheduleBlackout(ctx.auth.organizationId, input, ctx.auth.userId)),
    delete: permissionProcedure('jobs', 'edit')
      .input(z.object({ blackoutId: z.string().min(1) }))
      .mutation(({ ctx, input }) => deleteScheduleBlackout(ctx.auth.organizationId, input.blackoutId)),
  }),

  resources: router({
    list: permissionProcedure('jobs', 'view').query(({ ctx }) =>
      listResourceReservations(ctx.auth.organizationId),
    ),
    reserve: permissionProcedure('jobs', 'create')
      .input(createResourceReservationSchema)
      .mutation(({ ctx, input }) =>
        createResourceReservation(ctx.auth.organizationId, input as never, ctx.auth.userId),
      ),
  }),
});
