import { z } from 'zod';

export const signPlacementTypeSchema = z.enum([
  'customer_yard',
  'roadside',
  'intersection',
  'subdivision_entrance',
  'commercial_property',
  'other',
]);

export const signLocationStatusSchema = z.enum([
  'active',
  'needs_pickup',
  'picked_up',
  'partially_recovered',
  'missing',
  'removed',
]);

export const signLocationAddressSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(50),
  zip: z.string().max(20),
  neighborhood: z.string().max(100).optional().nullable(),
});

export const createSignLocationSchema = z.object({
  seasonYear: z.number().int().min(2020).max(2100),
  location: signLocationAddressSchema,
  quantityPlaced: z.number().int().min(1).max(500),
  placementType: signPlacementTypeSchema,
  notes: z.string().max(2000).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  customerId: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
});

export const updateSignLocationSchema = z.object({
  locationId: z.string().min(1),
  location: signLocationAddressSchema.partial().optional(),
  quantityPlaced: z.number().int().min(1).max(500).optional(),
  placementType: signPlacementTypeSchema.optional(),
  status: signLocationStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const recoverSignLocationSchema = z.object({
  locationId: z.string().min(1),
  quantityRecovered: z.number().int().min(0),
  quantityMissing: z.number().int().min(0),
  recoveryType: z.enum([
    'recovered_all',
    'partial_recovery',
    'missing',
    'city_removed',
    'damaged',
    'other',
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

export const signLocationFilterSchema = z.object({
  seasonYear: z.number().int().optional(),
  city: z.string().optional(),
  status: signLocationStatusSchema.optional(),
  placementType: signPlacementTypeSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  crewUserId: z.string().optional(),
});

export const reverseGeocodeSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const signPickupQuerySchema = z.object({
  seasonYear: z.number().int().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

export const signTrackerSettingsSchema = z.object({
  costPerSignCents: z.number().int().min(0).max(100000),
});

export const createSignFromJobSchema = z.object({
  jobId: z.string().min(1),
  quantityPlaced: z.number().int().min(1).max(50).default(1),
  placementType: signPlacementTypeSchema.default('customer_yard'),
  notes: z.string().max(2000).optional().nullable(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
