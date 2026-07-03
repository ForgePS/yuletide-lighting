import { z } from 'zod';

export const appointmentTypeSchema = z.enum([
  'estimate_visit', 'design_consultation', 'installation', 'takedown', 'service_call',
  'warranty_repair', 'storage_retrieval', 'storage_intake', 'commercial_project',
  'permanent_lighting_install', 'internal_meeting',
]);

export const dispatchStatusSchema = z.enum(['scheduled', 'en_route', 'arrived', 'working', 'completed', 'delayed']);

export const holidayEventTypeSchema = z.enum(['christmas', 'halloween', 'fourth_of_july', 'valentines', 'st_patricks', 'custom']);

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  appointmentType: appointmentTypeSchema,
  customerId: z.string().optional(),
  propertyId: z.string().optional(),
  jobId: z.string().optional(),
  proposalId: z.string().optional(),
  crewId: z.string().optional(),
  vehicleId: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  allDay: z.boolean().default(false),
  notes: z.string().max(5000).optional(),
  estimatedRevenueCents: z.number().int().min(0).default(0),
  holidayEventType: holidayEventTypeSchema.optional(),
});

export const updateCalendarEventSchema = createCalendarEventSchema.partial().extend({
  eventId: z.string().min(1),
  dispatchStatus: dispatchStatusSchema.optional(),
});

export const moveEventSchema = z.object({
  eventId: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  crewId: z.string().optional(),
});

export const duplicateEventSchema = z.object({
  eventId: z.string().min(1),
  startAt: z.coerce.date(),
});

export const createFromJobSchema = z.object({
  jobId: z.string().min(1),
  appointmentType: appointmentTypeSchema.default('installation'),
  crewId: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
});

export const updateDispatchSchema = z.object({
  dispatchId: z.string().min(1),
  status: dispatchStatusSchema,
  eta: z.coerce.date().optional(),
  completionPercent: z.number().min(0).max(100).optional(),
});

export const optimizeRouteSchema = z.object({
  routeDate: z.coerce.date(),
  crewId: z.string().optional(),
  eventIds: z.array(z.string()).min(1),
});

export const createResourceReservationSchema = z.object({
  resourceName: z.string().min(1),
  resourceType: z.enum(['lift', 'trailer', 'equipment', 'decoration']),
  eventId: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export const aiSchedulingQuerySchema = z.object({
  question: z.string().min(3).max(500),
});

export const calendarRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});
