import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomers360,
  listCustomerProperties360,
  getCustomerProperty360,
  listAllProperties360,
  createCustomerProperty360,
  updateCustomerProperty360,
  deleteCustomerProperty360,
  listActivities,
  createActivity,
  listDesigns,
  createDesign,
  updateDesign,
  listCustomerJobs,
  createCustomerJob,
  updateCustomerJob,
  deleteCustomerJob360,
  listStorageItems,
  createStorageItem,
  updateStorageItem,
  listCommunications,
  createCommunication,
  listFollowUpRules,
  ensureFollowUpRules,
  updateFollowUpRule,
  getCustomerOverviewStats,
  calculateCustomerInsights,
  getCustomerPortalAccess,
  getCustomerPipeline,
  updateCustomerPipelineStage,
  updateCustomerNextAction,
  logCustomerActivity,
  seedCustomer360Demo,
} from '@yuletide/firebase';
import {
  customerListFiltersSchema,
  createCustomer360Schema,
  updateCustomer360Schema,
  customerProperty360Schema,
  updateCustomerProperty360Schema,
  createActivitySchema,
  createDesignSchema,
  updateDesignSchema,
  createCustomerJobSchema,
  updateCustomerJobSchema,
  createStorageItemSchema,
  updateStorageItemSchema,
  createCommunicationSchema,
  updateFollowUpRuleSchema,
  addCustomerNoteSchema,
  customerPipelineFiltersSchema,
  updateCustomerPipelineStageSchema,
  updateCustomerNextActionSchema,
  propertyListFiltersSchema,
} from '@clcrm/validators';
import { router, officeProcedure, adminProcedure } from '../trpc';

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function billingFrom360(input: {
  billingSameAsPhysical?: boolean;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  if (input.billingSameAsPhysical !== false) {
    return {
      billingSameAsPhysical: true,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingPostalCode: null,
    };
  }
  return {
    billingSameAsPhysical: false,
    billingAddressLine1: emptyToNull(input.billingAddressLine1),
    billingAddressLine2: emptyToNull(input.billingAddressLine2),
    billingCity: emptyToNull(input.billingCity),
    billingState: emptyToNull(input.billingState),
    billingPostalCode: emptyToNull(input.billingPostalCode),
  };
}

function mailingFrom360(input: {
  mailingSameAsBilling?: boolean;
  mailingAddressLine1?: string;
  mailingAddressLine2?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingPostalCode?: string;
}) {
  if (input.mailingSameAsBilling !== false) {
    return {
      mailingSameAsBilling: true,
      mailingAddressLine1: null,
      mailingAddressLine2: null,
      mailingCity: null,
      mailingState: null,
      mailingPostalCode: null,
    };
  }
  return {
    mailingSameAsBilling: false,
    mailingAddressLine1: emptyToNull(input.mailingAddressLine1),
    mailingAddressLine2: emptyToNull(input.mailingAddressLine2),
    mailingCity: emptyToNull(input.mailingCity),
    mailingState: emptyToNull(input.mailingState),
    mailingPostalCode: emptyToNull(input.mailingPostalCode),
  };
}

async function requireCustomer(orgId: string, customerId: string) {
  const customer = await getCustomer(orgId, customerId);
  if (!customer) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' });
  }
  return customer;
}

export const customer360Router = router({
  list: officeProcedure.input(customerListFiltersSchema).query(({ ctx, input }) =>
    listCustomers360(ctx.auth.organizationId, {
      search: input.search,
      page: input.page,
      pageSize: input.pageSize,
      customerTypes: input.customerTypes,
      statuses: input.statuses,
      year: input.year,
      enrich: input.enrich,
    }),
  ),

  pipeline: officeProcedure.input(customerPipelineFiltersSchema.optional()).query(({ ctx, input }) =>
    getCustomerPipeline(ctx.auth.organizationId, {
      search: input?.search,
      stages: input?.stages,
      overdueOnly: input?.overdueOnly,
    }),
  ),

  updatePipelineStage: officeProcedure
    .input(updateCustomerPipelineStageSchema)
    .mutation(({ ctx, input }) =>
      updateCustomerPipelineStage(
        ctx.auth.organizationId,
        input.customerId,
        input.stage,
        ctx.auth.userId,
        ctx.auth.email ?? 'Office',
      ),
    ),

  updateNextAction: officeProcedure
    .input(updateCustomerNextActionSchema)
    .mutation(({ ctx, input }) =>
      updateCustomerNextAction(
        ctx.auth.organizationId,
        input.customerId,
        {
          nextAction: emptyToNull(input.nextAction),
          nextActionDue: input.nextActionDue ?? null,
        },
        ctx.auth.userId,
      ),
    ),

  getBasic: officeProcedure.input(z.object({ customerId: z.string() })).query(async ({ ctx, input }) => {
    const customer = await requireCustomer(ctx.auth.organizationId, input.customerId);
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: customer.businessName ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    };
  }),

  getById: officeProcedure.input(z.object({ customerId: z.string(), year: z.number().int().optional().nullable() })).query(async ({ ctx, input }) => {
    const customer = await requireCustomer(ctx.auth.organizationId, input.customerId);
    const properties = await listCustomerProperties360(ctx.auth.organizationId, input.customerId);
    const stats = await getCustomerOverviewStats(ctx.auth.organizationId, input.customerId, customer, input.year);
    const insights = calculateCustomerInsights(stats, customer);
    const portal = getCustomerPortalAccess(customer);
    return { ...customer, properties, stats, insights, portal };
  }),

  create: officeProcedure.input(createCustomer360Schema).mutation(async ({ ctx, input }) => {
    const orgId = ctx.auth.organizationId;
    const userId = ctx.auth.userId;
    const {
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      gateCodesInstructions,
      billingSameAsPhysical,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      mailingSameAsBilling,
      mailingAddressLine1,
      mailingAddressLine2,
      mailingCity,
      mailingState,
      mailingPostalCode,
      ...customerInput
    } = input;

    const customer = await createCustomer(orgId, {
      ...customerInput,
      businessName: emptyToNull(customerInput.businessName),
      customerType: customerInput.customerType ?? 'residential',
      status: customerInput.status ?? 'lead',
      referralSource: emptyToNull(customerInput.referralSource),
      assignedSalespersonId: emptyToNull(customerInput.assignedSalespersonId),
      assignedSalespersonName: emptyToNull(customerInput.assignedSalespersonName),
      email: emptyToNull(customerInput.email),
      secondaryEmail: emptyToNull(customerInput.secondaryEmail),
      phone: emptyToNull(customerInput.phone),
      mobilePhone: emptyToNull(customerInput.mobilePhone),
      preferredContactMethod: customerInput.preferredContactMethod ?? 'email',
      notes: emptyToNull(customerInput.notes),
      tags: customerInput.tags ?? [],
      smsOptIn: customerInput.smsOptIn ?? true,
      emailOptIn: customerInput.emailOptIn ?? true,
      portalEnabled: false,
      pipelineStage: 'new_lead',
      stageUpdatedAt: new Date(),
      ...billingFrom360({
        billingSameAsPhysical,
        billingAddressLine1,
        billingAddressLine2,
        billingCity,
        billingState,
        billingPostalCode,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
      }),
      ...mailingFrom360({
        mailingSameAsBilling,
        mailingAddressLine1,
        mailingAddressLine2,
        mailingCity,
        mailingState,
        mailingPostalCode,
      }),
    });

    await createCustomerProperty360(
      orgId,
      customer.id,
      {
        propertyName: 'Primary',
        propertyType: customerInput.customerType ?? 'residential',
        label: 'Primary',
        addressLine1,
        addressLine2: emptyToNull(addressLine2),
        city,
        state,
        postalCode,
        country: 'US',
        latitude: null,
        longitude: null,
        gateCode: emptyToNull(gateCodesInstructions),
        hoaInfo: null,
        accessInstructions: emptyToNull(gateCodesInstructions),
        installNotes: emptyToNull(gateCodesInstructions),
        powerSourceLocations: null,
        ladderAccessPoints: null,
        roofMeasurementNotes: null,
        treeCount: null,
        shrubCount: null,
        wreathLocations: null,
        garlandLocations: null,
        siteHazards: [],
        siteHazardNotes: null,
        photos: {},
      },
      userId,
    );

    await logCustomerActivity(
      orgId,
      customer.id,
      'lead_created',
      `Customer ${customer.firstName} ${customer.lastName} created`,
      userId,
      ctx.auth.email ?? 'Office',
    );

    return customer;
  }),

  update: officeProcedure
    .input(z.object({ customerId: z.string(), data: updateCustomer360Schema }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.auth.organizationId;
      const userId = ctx.auth.userId;
      await requireCustomer(orgId, input.customerId);

      const {
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        gateCodesInstructions,
        billingSameAsPhysical,
        billingAddressLine1,
        billingAddressLine2,
        billingCity,
        billingState,
        billingPostalCode,
        mailingSameAsBilling,
        mailingAddressLine1,
        mailingAddressLine2,
        mailingCity,
        mailingState,
        mailingPostalCode,
        ...customerInput
      } = input.data;

      const patch: Record<string, unknown> = { ...customerInput };
      if (customerInput.businessName !== undefined) patch.businessName = emptyToNull(customerInput.businessName);
      if (customerInput.email !== undefined) patch.email = emptyToNull(customerInput.email);
      if (customerInput.secondaryEmail !== undefined) patch.secondaryEmail = emptyToNull(customerInput.secondaryEmail);
      if (customerInput.phone !== undefined) patch.phone = emptyToNull(customerInput.phone);
      if (customerInput.mobilePhone !== undefined) patch.mobilePhone = emptyToNull(customerInput.mobilePhone);
      if (customerInput.notes !== undefined) patch.notes = emptyToNull(customerInput.notes);
      if (customerInput.referralSource !== undefined) patch.referralSource = emptyToNull(customerInput.referralSource);
      if (customerInput.assignedSalespersonName !== undefined) {
        patch.assignedSalespersonName = emptyToNull(customerInput.assignedSalespersonName);
      }

      if (billingSameAsPhysical !== undefined || billingAddressLine1 !== undefined) {
        Object.assign(
          patch,
          billingFrom360({
            billingSameAsPhysical: billingSameAsPhysical ?? true,
            billingAddressLine1,
            billingAddressLine2,
            billingCity,
            billingState,
            billingPostalCode,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
          }),
        );
      }

      if (mailingSameAsBilling !== undefined || mailingAddressLine1 !== undefined) {
        Object.assign(
          patch,
          mailingFrom360({
            mailingSameAsBilling: mailingSameAsBilling ?? true,
            mailingAddressLine1,
            mailingAddressLine2,
            mailingCity,
            mailingState,
            mailingPostalCode,
          }),
        );
      }

      const customer = await updateCustomer(orgId, input.customerId, patch);

      if (addressLine1 && city && state && postalCode) {
        const properties = await listCustomerProperties360(orgId, input.customerId);
        const primary = properties[0];
        if (primary) {
          await updateCustomerProperty360(
            orgId,
            input.customerId,
            primary.id,
            {
              addressLine1,
              addressLine2: emptyToNull(addressLine2),
              city,
              state,
              postalCode,
              gateCode: gateCodesInstructions !== undefined ? emptyToNull(gateCodesInstructions) : undefined,
              installNotes: gateCodesInstructions !== undefined ? emptyToNull(gateCodesInstructions) : undefined,
              accessInstructions: gateCodesInstructions !== undefined ? emptyToNull(gateCodesInstructions) : undefined,
            },
            userId,
          );
        }
      }

      return customer;
    }),

  archive: officeProcedure.input(z.object({ customerId: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.auth.organizationId;
    await requireCustomer(orgId, input.customerId);
    const customer = await updateCustomer(orgId, input.customerId, {
      status: 'archived',
      archivedAt: new Date(),
    });
    await logCustomerActivity(
      orgId,
      input.customerId,
      'note_added',
      'Customer archived',
      ctx.auth.userId,
      ctx.auth.email ?? 'Office',
    );
    return customer;
  }),

  delete: adminProcedure.input(z.object({ customerId: z.string() })).mutation(({ ctx, input }) =>
    deleteCustomer(ctx.auth.organizationId, input.customerId),
  ),

  addNote: officeProcedure.input(addCustomerNoteSchema).mutation(async ({ ctx, input }) => {
    const orgId = ctx.auth.organizationId;
    const customer = await requireCustomer(orgId, input.customerId);
    const notes = [customer.notes, input.note].filter(Boolean).join('\n\n');
    await updateCustomer(orgId, input.customerId, { notes });
    await logCustomerActivity(
      orgId,
      input.customerId,
      'note_added',
      input.note,
      ctx.auth.userId,
      ctx.auth.email ?? 'Office',
    );
    return { success: true };
  }),

  seedDemo: officeProcedure.mutation(({ ctx }) =>
    seedCustomer360Demo(ctx.auth.organizationId, ctx.auth.userId),
  ),

  properties: router({
    list: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      listCustomerProperties360(ctx.auth.organizationId, input.customerId),
    ),
    listAll: officeProcedure.input(propertyListFiltersSchema.optional()).query(({ ctx, input }) =>
      listAllProperties360(ctx.auth.organizationId, {
        search: input?.search,
        propertyProfileType: input?.propertyProfileType,
        installComplexity: input?.installComplexity,
      }),
    ),
    getById: officeProcedure
      .input(z.object({ customerId: z.string(), propertyId: z.string() }))
      .query(async ({ ctx, input }) => {
        const property = await getCustomerProperty360(
          ctx.auth.organizationId,
          input.customerId,
          input.propertyId,
        );
        if (!property) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
        }
        return property;
      }),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: customerProperty360Schema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        return createCustomerProperty360(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            addressLine2: emptyToNull(input.data.addressLine2),
            propertyType: emptyToNull(input.data.propertyType) ?? 'residential',
            gateCode: emptyToNull(input.data.gateCode),
            hoaInfo: emptyToNull(input.data.hoaInfo),
            accessInstructions: emptyToNull(input.data.accessInstructions),
            installNotes: emptyToNull(input.data.installNotes),
            powerSourceLocations: emptyToNull(input.data.powerSourceLocations),
            gfciNotes: emptyToNull(input.data.gfciNotes),
            ladderAccessPoints: emptyToNull(input.data.ladderAccessPoints),
            roofMeasurementNotes: emptyToNull(input.data.roofMeasurementNotes),
            wreathLocations: emptyToNull(input.data.wreathLocations),
            garlandLocations: emptyToNull(input.data.garlandLocations),
            siteHazardNotes: emptyToNull(input.data.siteHazardNotes),
            previousYearDesignNotes: emptyToNull(input.data.previousYearDesignNotes),
            siteHazards: input.data.siteHazards ?? [],
            photos: input.data.photos ?? {},
            galleryPhotos: input.data.galleryPhotos ?? [],
            ladderRequired: input.data.ladderRequired ?? false,
            liftRequired: input.data.liftRequired ?? false,
            installComplexity: input.data.installComplexity ?? 'medium',
          },
          ctx.auth.userId,
        );
      }),
    update: officeProcedure
      .input(
        z.object({
          customerId: z.string(),
          propertyId: z.string(),
          data: updateCustomerProperty360Schema,
        }),
      )
      .mutation(({ ctx, input }) =>
        updateCustomerProperty360(
          ctx.auth.organizationId,
          input.customerId,
          input.propertyId,
          input.data,
          ctx.auth.userId,
        ),
      ),
    delete: officeProcedure
      .input(z.object({ customerId: z.string(), propertyId: z.string() }))
      .mutation(({ ctx, input }) =>
        deleteCustomerProperty360(ctx.auth.organizationId, input.customerId, input.propertyId),
      ),
  }),

  activities: router({
    list: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      listActivities(ctx.auth.organizationId, input.customerId),
    ),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: createActivitySchema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        return createActivity(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            userId: ctx.auth.userId,
            userName: input.data.userName || ctx.auth.email || 'Office',
            occurredAt: input.data.occurredAt ?? new Date(),
            relatedRecordType: emptyToNull(input.data.relatedRecordType),
            relatedRecordId: emptyToNull(input.data.relatedRecordId),
            relatedRecordLabel: emptyToNull(input.data.relatedRecordLabel),
          },
          ctx.auth.userId,
        );
      }),
  }),

  designs: router({
    list: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      listDesigns(ctx.auth.organizationId, input.customerId),
    ),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: createDesignSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        const design = await createDesign(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            propertyId: emptyToNull(input.data.propertyId),
            propertyName: emptyToNull(input.data.propertyName),
            designerId: ctx.auth.userId,
            designerName: input.data.designerName || ctx.auth.email || 'Designer',
            originalPhotoUrl: emptyToNull(input.data.originalPhotoUrl),
            mockupImageUrl: emptyToNull(input.data.mockupImageUrl),
            installedResultPhotoUrl: emptyToNull(input.data.installedResultPhotoUrl),
            revisionNotes: emptyToNull(input.data.revisionNotes),
          },
          ctx.auth.userId,
        );
        await logCustomerActivity(
          ctx.auth.organizationId,
          input.customerId,
          'design_created',
          `Design "${design.designName}" v${design.versionNumber} created`,
          ctx.auth.userId,
          ctx.auth.email ?? 'Office',
          { relatedRecordType: 'design', relatedRecordId: design.id, relatedRecordLabel: design.designName },
        );
        return design;
      }),
    update: officeProcedure
      .input(z.object({ customerId: z.string(), designId: z.string(), data: updateDesignSchema }))
      .mutation(({ ctx, input }) =>
        updateDesign(ctx.auth.organizationId, input.customerId, input.designId, input.data, ctx.auth.userId),
      ),
  }),

  jobs: router({
    list: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      listCustomerJobs(ctx.auth.organizationId, input.customerId),
    ),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: createCustomerJobSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        const job = await createCustomerJob(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            propertyId: emptyToNull(input.data.propertyId),
            propertyName: emptyToNull(input.data.propertyName),
            materialsUsed: emptyToNull(input.data.materialsUsed),
            crewNotes: emptyToNull(input.data.crewNotes),
            assignedCrewIds: [],
          },
          ctx.auth.userId,
        );
        const activityType =
          input.data.jobType === 'installation'
            ? 'installation_scheduled'
            : input.data.jobType === 'takedown'
              ? 'takedown_scheduled'
              : 'note_added';
        await logCustomerActivity(
          ctx.auth.organizationId,
          input.customerId,
          activityType,
          `Job "${job.title}" created`,
          ctx.auth.userId,
          ctx.auth.email ?? 'Office',
          { relatedRecordType: 'job', relatedRecordId: job.id, relatedRecordLabel: job.title },
        );
        return job;
      }),
    update: officeProcedure
      .input(z.object({ customerId: z.string(), jobId: z.string(), data: updateCustomerJobSchema }))
      .mutation(({ ctx, input }) =>
        updateCustomerJob(ctx.auth.organizationId, input.customerId, input.jobId, input.data, ctx.auth.userId),
      ),
    delete: adminProcedure
      .input(z.object({ customerId: z.string(), jobId: z.string() }))
      .mutation(({ ctx, input }) => deleteCustomerJob360(ctx.auth.organizationId, input.customerId, input.jobId)),
  }),

  storage: router({
    list: officeProcedure.input(z.object({ customerId: z.string() })).query(({ ctx, input }) =>
      listStorageItems(ctx.auth.organizationId, input.customerId),
    ),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: createStorageItemSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        return createStorageItem(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            notes: emptyToNull(input.data.notes),
            warehouseBuilding: emptyToNull(input.data.warehouseBuilding),
            row: emptyToNull(input.data.row),
            shelf: emptyToNull(input.data.shelf),
            bin: emptyToNull(input.data.bin),
            barcodeValue: emptyToNull(input.data.barcodeValue) ?? `YL-${Date.now()}`,
          },
          ctx.auth.userId,
        );
      }),
    update: officeProcedure
      .input(z.object({ customerId: z.string(), itemId: z.string(), data: updateStorageItemSchema }))
      .mutation(({ ctx, input }) =>
        updateStorageItem(ctx.auth.organizationId, input.customerId, input.itemId, input.data, ctx.auth.userId),
      ),
  }),

  communications: router({
    list: officeProcedure
      .input(z.object({ customerId: z.string(), type: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const items = await listCommunications(ctx.auth.organizationId, input.customerId);
        if (!input.type) return items;
        return items.filter((c) => c.type === input.type);
      }),
    create: officeProcedure
      .input(z.object({ customerId: z.string(), data: createCommunicationSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireCustomer(ctx.auth.organizationId, input.customerId);
        const comm = await createCommunication(
          ctx.auth.organizationId,
          input.customerId,
          {
            ...input.data,
            subject: emptyToNull(input.data.subject),
            employeeId: ctx.auth.userId,
            employeeName: input.data.employeeName || ctx.auth.email || 'Office',
            occurredAt: input.data.occurredAt ?? new Date(),
            relatedPropertyId: emptyToNull(input.data.relatedPropertyId),
            relatedJobId: emptyToNull(input.data.relatedJobId),
            relatedQuoteId: emptyToNull(input.data.relatedQuoteId),
          },
          ctx.auth.userId,
        );
        const activityType =
          input.data.type === 'email'
            ? 'email_sent'
            : input.data.type === 'sms'
              ? 'sms_sent'
              : input.data.type === 'phone'
                ? 'phone_call_logged'
                : 'note_added';
        await logCustomerActivity(
          ctx.auth.organizationId,
          input.customerId,
          activityType,
          input.data.subject || input.data.body.slice(0, 120),
          ctx.auth.userId,
          ctx.auth.email ?? 'Office',
          { relatedRecordType: 'communication', relatedRecordId: comm.id },
        );
        return comm;
      }),
  }),

  followUpRules: router({
    list: officeProcedure.query(async ({ ctx }) => ensureFollowUpRules(ctx.auth.organizationId)),
    update: officeProcedure
      .input(z.object({ ruleId: z.string(), data: updateFollowUpRuleSchema }))
      .mutation(({ ctx, input }) =>
        updateFollowUpRule(ctx.auth.organizationId, input.ruleId, input.data, ctx.auth.userId),
      ),
  }),
});
