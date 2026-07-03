import { z } from 'zod';

export const commercialAccountStatusSchema = z.enum(['active', 'prospect', 'on_hold', 'archived']);
export const commercialContractStatusSchema = z.enum(['draft', 'active', 'pending_renewal', 'expired', 'cancelled']);

export const createCommercialAccountSchema = z.object({
  name: z.string().min(1).max(200),
  customerId: z.string().optional().or(z.literal('')),
  billingContactId: z.string().optional().or(z.literal('')),
  accountManagerId: z.string().optional().or(z.literal('')),
  accountManagerName: z.string().max(200).optional().or(z.literal('')),
  billingAddress: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(10000).optional().or(z.literal('')),
  status: commercialAccountStatusSchema.default('prospect'),
  siteMapUrl: z.string().max(2000).optional().or(z.literal('')),
});

export const updateCommercialAccountSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  customerId: z.string().optional().or(z.literal('')),
  billingContactId: z.string().optional().or(z.literal('')),
  accountManagerId: z.string().optional().or(z.literal('')),
  accountManagerName: z.string().max(200).optional().or(z.literal('')),
  billingAddress: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(10000).optional().or(z.literal('')),
  status: commercialAccountStatusSchema.optional(),
  siteMapUrl: z.string().max(2000).optional().or(z.literal('')),
});

export const createCommercialLocationSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  postalCode: z.string().min(1).max(20),
  siteContactName: z.string().max(200).optional().or(z.literal('')),
  siteContactPhone: z.string().max(50).optional().or(z.literal('')),
  siteNotes: z.string().max(5000).optional().or(z.literal('')),
  propertyId: z.string().optional().or(z.literal('')),
  maintenanceScheduleNotes: z.string().max(5000).optional().or(z.literal('')),
});

export const updateCommercialLocationSchema = z.object({
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(50).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  siteContactName: z.string().max(200).optional().or(z.literal('')),
  siteContactPhone: z.string().max(50).optional().or(z.literal('')),
  siteNotes: z.string().max(5000).optional().or(z.literal('')),
  propertyId: z.string().optional().or(z.literal('')),
  mockupIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
  maintenanceScheduleNotes: z.string().max(5000).optional().or(z.literal('')),
});

export const createCommercialContractSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  renewalDate: z.coerce.date().optional().nullable(),
  amountCents: z.number().int().min(0),
  status: commercialContractStatusSchema.default('draft'),
  maintenanceNotes: z.string().max(5000).optional().or(z.literal('')),
});

export const updateCommercialContractSchema = z.object({
  accountId: z.string().min(1),
  contractId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  renewalDate: z.coerce.date().optional().nullable(),
  amountCents: z.number().int().min(0).optional(),
  status: commercialContractStatusSchema.optional(),
  maintenanceNotes: z.string().max(5000).optional().or(z.literal('')),
});

export const createMultiLocationProposalSchema = z.object({
  accountId: z.string().min(1),
  locationIds: z.array(z.string().min(1)).min(1),
  title: z.string().min(1).max(200),
  scopeOfWork: z.string().max(10000).optional().or(z.literal('')),
  lineItemsPerLocation: z.array(z.object({
    locationId: z.string().min(1),
    description: z.string().min(1).max(500),
    quantity: z.number().min(0).default(1),
    unitPriceCents: z.number().int().min(0),
  })).optional(),
  defaultUnitPriceCents: z.number().int().min(0).default(250000),
});
