import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createProperty,
  updateProperty,
  colList,
  colGet,
  colCreate,
  colUpdate,
  getByPublicToken,
  getOrganization,
  updateOrganization,
  nanoid,
  reserveJobMaterials,
  consumeJobMaterials,
  getLowStockItems,
  getAdminFirestore,
  getJob360,
  createEventFromJob,
  syncCustomerPipelineFromJob,
  inferAppointmentTypeFromJob,
  createStorageFromRemoval,
} from '@yuletide/firebase';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createPropertySchema,
  updatePropertySchema,
  createInventoryItemSchema,
  createProposalSchema,
  createInvoiceSchema,
  sendMessageSchema,
  scheduleJobSchema,
  orgSettingsSchema,
  createMockupSchema,
  timeEntrySchema,
  paginationSchema,
  reportFilterSchema,
} from '@clcrm/validators';
import { customer360Router } from './customer360';
import { portal360Router } from './portal360';
import { rebooking360Router } from './rebooking360';
import { storage360Router } from './storage360';
import { commercial360Router } from './commercial360';
import { contacts360Router } from './contacts360';
import { agreements360Router } from './agreements360';
import { timeClock360Router } from './timeClock360';
import { projectPrep360Router } from './projectPrep360';
import { serviceIssues360Router } from './serviceIssues360';
import { proposals360Router } from './proposals360';
import { inventory360Router } from './inventory360';
import { invoices360Router } from './invoices360';
import { messages360Router } from './messages360';
import { schedule360Router } from './schedule360';
import { mockups360Router } from './mockups360';
import { reports360Router } from './reports360';
import { settings360Router } from './settings360';
import { billingRouter } from './billing';
import { import360Router } from './import360';
import { crew360Router, crewMobileRouter } from './crew360';
import { reviews360Router } from './reviews360';
import { automation360Router } from './automation360';
import { creator360Router } from './creator360';
import { signTracker360Router } from './signTracker360';
import { router, protectedProcedure, officeProcedure, adminProcedure, publicProcedure } from '../trpc';

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotalCents: number;
  depositCents: number;
  amountPaidCents: number;
  dueDate?: Date | null;
  publicToken: string;
};

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  subtotalCents: number;
  viewCount: number;
  publicToken: string;
  createdAt: Date;
  lineItems: Array<{ id: string; description: string; quantity: number; unitPriceCents: number }>;
  acceptedAt?: Date | null;
  acceptedByName?: string | null;
  agreementMode?: 'single' | 'multi';
  agreementOptions?: Array<{ code: string; label: string; active: boolean }>;
};

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
};

type PropertyRow = {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
};

type JobRow = {
  id: string;
  title: string;
  stage: string;
  customerId?: string;
  propertyId?: string;
  proposalId?: string;
  assignedCrewUserId?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
};

type RouteRow = {
  id: string;
  stops: Array<{ jobId: string; address: string; order: number }>;
};

function calcSubtotal(lineItems: Array<{ quantity: number; unitPriceCents: number }>) {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}

function billingFieldsFromInput(input: {
  billingSameAsPhysical: boolean;
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
  if (input.billingSameAsPhysical) {
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
    billingAddressLine1: input.billingAddressLine1 || null,
    billingAddressLine2: input.billingAddressLine2 || null,
    billingCity: input.billingCity || null,
    billingState: input.billingState || null,
    billingPostalCode: input.billingPostalCode || null,
  };
}

async function upsertPrimaryProperty(
  orgId: string,
  customerId: string,
  data: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    gateCodesInstructions?: string;
  },
) {
  const db = getAdminFirestore();
  const existing = await db
    .collection(`organizations/${orgId}/properties`)
    .where('customerId', '==', customerId)
    .limit(1)
    .get();

  const propertyPayload = {
    label: 'Primary',
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 || null,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    country: 'US',
    installNotes: data.gateCodesInstructions || null,
  };

  if (existing.docs[0]) {
    return updateProperty(orgId, existing.docs[0].id, propertyPayload);
  }
  return createProperty(orgId, { customerId, ...propertyPayload });
}

export const customersRouter = router({
  list: officeProcedure.input(paginationSchema).query(({ ctx, input }) =>
    listCustomers(ctx.auth.organizationId, input.search, input.page, input.pageSize),
  ),
  getById: officeProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) =>
    getCustomer(ctx.auth.organizationId, input.id),
  ),
  create: officeProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    const orgId = ctx.auth.organizationId;
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
      ...customerInput
    } = input;

    const customer = await createCustomer(orgId, {
      ...customerInput,
      email: customerInput.email || null,
      phone: customerInput.phone || null,
      tags: customerInput.tags ?? [],
      smsOptIn: customerInput.smsOptIn ?? true,
      emailOptIn: customerInput.emailOptIn ?? true,
      ...billingFieldsFromInput({
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
    });

    await createProperty(orgId, {
      customerId: customer.id,
      label: 'Primary',
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      postalCode,
      country: 'US',
      installNotes: gateCodesInstructions || null,
    });

    return customer;
  }),
  update: officeProcedure
    .input(z.object({ id: z.string(), data: updateCustomerSchema }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.auth.organizationId;
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
        ...customerInput
      } = input.data;

      const billingPatch =
        billingSameAsPhysical !== undefined ||
        billingAddressLine1 !== undefined ||
        billingAddressLine2 !== undefined ||
        billingCity !== undefined ||
        billingState !== undefined ||
        billingPostalCode !== undefined
          ? billingFieldsFromInput({
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
            })
          : {};

      const customer = await updateCustomer(orgId, input.id, {
        ...customerInput,
        ...(customerInput.email !== undefined ? { email: customerInput.email || null } : {}),
        ...(customerInput.phone !== undefined ? { phone: customerInput.phone || null } : {}),
        ...billingPatch,
      });

      if (addressLine1 && city && state && postalCode) {
        await upsertPrimaryProperty(orgId, input.id, {
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          gateCodesInstructions,
        });
      } else if (gateCodesInstructions !== undefined) {
        const existing = await getCustomer(orgId, input.id);
        const primary = existing?.properties[0];
        if (primary) {
          await updateProperty(orgId, primary.id, { installNotes: gateCodesInstructions || null });
        }
      }

      return customer;
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteCustomer(ctx.auth.organizationId, input.id)),
});

export const propertiesRouter = router({
  create: officeProcedure.input(createPropertySchema).mutation(({ ctx, input }) =>
    createProperty(ctx.auth.organizationId, input),
  ),
  update: officeProcedure
    .input(z.object({ id: z.string(), data: updatePropertySchema }))
    .mutation(({ ctx, input }) => updateProperty(ctx.auth.organizationId, input.id, input.data)),
  geocode: officeProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const property = await colGet<Record<string, string>>(ctx.auth.organizationId, 'properties', input.id);
    if (!property) throw new TRPCError({ code: 'NOT_FOUND' });
    const address = `${property.addressLine1}, ${property.city}, ${property.state} ${property.postalCode}`;
    const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return property;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`,
    );
    const data = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
    const [lng, lat] = data.features?.[0]?.center ?? [null, null];
    if (lat && lng) {
      return colUpdate(ctx.auth.organizationId, 'properties', input.id, { latitude: lat, longitude: lng });
    }
    return property;
  }),
});

export const inventoryRouter = router({
  list: officeProcedure.query(({ ctx }) =>
    colList<{
      id: string;
      sku: string;
      name: string;
      quantityOnHand: number;
      quantityReserved: number;
      reorderThreshold: number;
      prices: Array<{ agreementCode: string; unitPriceCents: number }>;
    }>(ctx.auth.organizationId, 'inventoryItems'),
  ),
  lowStock: officeProcedure.query(({ ctx }) => getLowStockItems(ctx.auth.organizationId)),
  create: officeProcedure.input(createInventoryItemSchema).mutation(({ ctx, input }) =>
    colCreate(ctx.auth.organizationId, 'inventoryItems', { ...input, quantityReserved: 0 }),
  ),
  update: officeProcedure
    .input(z.object({ id: z.string(), data: createInventoryItemSchema.partial() }))
    .mutation(({ ctx, input }) => colUpdate(ctx.auth.organizationId, 'inventoryItems', input.id, input.data)),
});

export const proposalsRouter = router({
  list: officeProcedure.query(({ ctx }) => colList<ProposalRow>(ctx.auth.organizationId, 'proposals')),
  getById: officeProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => colGet<ProposalRow>(ctx.auth.organizationId, 'proposals', input.id)),
  create: officeProcedure.input(createProposalSchema).mutation(async ({ ctx, input }) => {
    const lineItems = input.lineItems.map((item) => ({ ...item, id: nanoid() }));
    const proposal = await colCreate(ctx.auth.organizationId, 'proposals', {
      ...input,
      lineItems,
      subtotalCents: calcSubtotal(lineItems),
      status: 'draft',
      publicToken: nanoid(32),
      viewCount: 0,
      mockupIds: [],
    });
    await colCreate(ctx.auth.organizationId, 'jobs', {
      customerId: input.customerId,
      propertyId: input.propertyId,
      proposalId: proposal.id,
      title: input.title,
      stage: 'draft_proposal',
    });
    return proposal;
  }),
  send: officeProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const proposal = await colUpdate(ctx.auth.organizationId, 'proposals', input.id, {
      status: 'sent',
      sentAt: new Date(),
    });
    const jobs = await colList<{ id: string; proposalId: string }>(ctx.auth.organizationId, 'jobs');
    const job = jobs.find((j) => j.proposalId === input.id);
    if (job) await colUpdate(ctx.auth.organizationId, 'jobs', job.id, { stage: 'sent_proposal' });
    return proposal;
  }),
  getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const proposal = await getByPublicToken<ProposalRow & { organizationId: string; customerId: string; propertyId: string }>(
      'proposals',
      input.token,
    );
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    const orgId = proposal.organizationId;
    await colUpdate(orgId, 'proposals', proposal.id, {
      viewCount: (proposal.viewCount ?? 0) + 1,
      lastViewedAt: new Date(),
      status: proposal.status === 'sent' ? 'viewed' : proposal.status,
    });
    const customer = await colGet<CustomerRow>(orgId, 'customers', proposal.customerId);
    const property = await colGet<PropertyRow>(orgId, 'properties', proposal.propertyId);
    const organization = await getOrganization(orgId);
    return { proposal, customer, property, organization, mockups: [] as Array<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null }> };
  }),
  accept: publicProcedure
    .input(z.object({ token: z.string(), agreementCode: z.string().optional(), customerName: z.string() }))
    .mutation(async ({ input }) => {
      const proposal = await getByPublicToken<Record<string, unknown>>('proposals', input.token);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      const orgId = proposal.organizationId as string;
      return colUpdate(orgId, 'proposals', proposal.id as string, {
        status: 'accepted',
        selectedAgreementCode: input.agreementCode,
        acceptedAt: new Date(),
        acceptedByName: input.customerName,
      });
    }),
});

export const invoicesRouter = router({
  list: officeProcedure.query(({ ctx }) => colList<InvoiceRow>(ctx.auth.organizationId, 'invoices')),
  createFromProposal: officeProcedure.input(createInvoiceSchema).mutation(async ({ ctx, input }) => {
    const proposal = await colGet<Record<string, unknown>>(ctx.auth.organizationId, 'proposals', input.proposalId);
    if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
    if (proposal.status !== 'accepted') throw new TRPCError({ code: 'BAD_REQUEST' });
    const all = await colList<InvoiceRow>(ctx.auth.organizationId, 'invoices');
    const depositCents = Math.round((proposal.subtotalCents as number) * (input.depositPercent / 100));
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + input.dueDays);
    return colCreate(ctx.auth.organizationId, 'invoices', {
      customerId: proposal.customerId,
      proposalId: input.proposalId,
      invoiceNumber: `INV-${String(all.length + 1).padStart(5, '0')}`,
      status: 'sent',
      subtotalCents: proposal.subtotalCents,
      depositPercent: input.depositPercent,
      depositCents,
      amountPaidCents: 0,
      dueDate,
      publicToken: nanoid(32),
      sentAt: new Date(),
    });
  }),
  getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const invoice = await getByPublicToken<InvoiceRow & { organizationId: string; customerId: string }>(
      'invoices',
      input.token,
    );
    if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
    const orgId = invoice.organizationId;
    const customer = await colGet<CustomerRow>(orgId, 'customers', invoice.customerId);
    const organization = await getOrganization(orgId);
    return { invoice, customer, organization };
  }),
});

export const jobsRouter = router({
  list: officeProcedure
    .input(z.object({ stage: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const jobs = await colList<JobRow>(ctx.auth.organizationId, 'jobs');
      return input?.stage ? jobs.filter((j) => j.stage === input.stage) : jobs;
    }),
  getById: officeProcedure.input(z.object({ jobId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const detail = await getJob360(ctx.auth.organizationId, input.jobId);
    if (!detail) throw new TRPCError({ code: 'NOT_FOUND' });
    return detail;
  }),
  pipeline: officeProcedure.query(async ({ ctx }) => {
    const allJobs = await colList<JobRow>(ctx.auth.organizationId, 'jobs');
    const stages = [
      'draft_proposal', 'sent_proposal', 'accepted_proposal', 'invoiced', 'deposit_paid',
      'inventory_reserved', 'scheduled', 'installed', 'removal_scheduled', 'removed',
      'review_requested', 'complete',
    ] as const;
    return stages.map((stage) => ({ stage, jobs: allJobs.filter((j) => j.stage === stage) }));
  }),
  reserveInventory: officeProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(({ ctx, input }) => reserveJobMaterials(ctx.auth.organizationId, input.jobId)),
  completeInstall: officeProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(({ ctx, input }) => consumeJobMaterials(ctx.auth.organizationId, input.jobId)),
  schedule: officeProcedure
    .input(
      z.object({
        jobId: z.string().min(1),
        crewUserId: z.string().optional(),
        crewId: z.string().optional(),
        scheduledStart: z.string().datetime(),
        scheduledEnd: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
    const job = await colGet<JobRow>(ctx.auth.organizationId, 'jobs', input.jobId);
    if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
    const start = new Date(input.scheduledStart);
    const end = input.scheduledEnd
      ? new Date(input.scheduledEnd)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const appointmentType = inferAppointmentTypeFromJob({
      ...job,
      customerId: job.customerId ?? '',
    });
    await createEventFromJob(
      ctx.auth.organizationId,
      {
        jobId: input.jobId,
        appointmentType,
        crewId: input.crewId ?? input.crewUserId,
        startAt: start,
        endAt: end,
      },
      ctx.auth.userId,
    );
    return { success: true };
  }),
  markRemovalComplete: officeProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await colGet<JobRow>(ctx.auth.organizationId, 'jobs', input.jobId);
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      await colUpdate(ctx.auth.organizationId, 'jobs', input.jobId, { stage: 'removed', removedAt: new Date() });
      if (job.customerId) {
        await syncCustomerPipelineFromJob(ctx.auth.organizationId, job.customerId, 'removed', ctx.auth.userId);
        await createStorageFromRemoval(ctx.auth.organizationId, input.jobId, {}, ctx.auth.userId);
      }
      return { success: true };
    }),
});

export const messagesRouter = router({
  threads: officeProcedure.query(async ({ ctx }) => {
    const threads = await colList<{ id: string; customerId: string; unreadCount: number }>(
      ctx.auth.organizationId,
      'messageThreads',
    );
    const customers = await colList<{ id: string; firstName: string; lastName: string }>(
      ctx.auth.organizationId,
      'customers',
    );
    return threads.map((thread) => ({
      thread,
      customer: customers.find((c) => c.id === thread.customerId) ?? {
        id: thread.customerId,
        firstName: 'Customer',
        lastName: '',
      },
    }));
  }),
  getThread: officeProcedure.input(z.object({ customerId: z.string() })).query(async ({ ctx, input }) => {
    const threads = await colList<{ id: string; customerId: string }>(ctx.auth.organizationId, 'messageThreads');
    let thread = threads.find((t) => t.customerId === input.customerId);
    if (!thread) {
      thread = await colCreate(ctx.auth.organizationId, 'messageThreads', {
        customerId: input.customerId,
        unreadCount: 0,
      });
    }
    const allMessages = await colList<{
      id: string;
      threadId: string;
      channel: string;
      direction: string;
      body: string;
    }>(ctx.auth.organizationId, 'messages');
    const messages = allMessages.filter((m) => m.threadId === thread!.id);
    return { thread, messages };
  }),
  send: officeProcedure.input(sendMessageSchema).mutation(async ({ ctx, input }) => {
    const message = await colCreate(ctx.auth.organizationId, 'messages', {
      customerId: input.customerId,
      channel: input.channel,
      direction: 'outbound',
      subject: input.subject,
      body: input.body,
      sentByUserId: ctx.auth.userId,
      isRead: false,
    });
    return message;
  }),
  templates: officeProcedure.query(({ ctx }) =>
    colList<{ id: string; name: string; body: string }>(ctx.auth.organizationId, 'messageTemplates'),
  ),
  automations: officeProcedure.query(({ ctx }) => colList(ctx.auth.organizationId, 'automations')),
});

export const scheduleRouter = router({
  calendar: officeProcedure
    .input(z.object({ start: z.string().datetime(), end: z.string().datetime() }))
    .query(async ({ ctx }) => {
      const blocks = await colList<{ id: string; jobId: string; startAt: Date; endAt: Date }>(
        ctx.auth.organizationId,
        'scheduleBlocks',
      );
      const jobs = await colList<JobRow>(ctx.auth.organizationId, 'jobs');
      return blocks.map((block) => ({ block, job: jobs.find((j) => j.id === block.jobId) }));
    }),
  optimizeRoute: officeProcedure
    .input(z.object({ crewUserId: z.string().optional(), routeDate: z.string().datetime(), jobIds: z.array(z.string()) }))
    .mutation(({ ctx, input }) =>
      colCreate(ctx.auth.organizationId, 'routes', { ...input, routeDate: new Date(input.routeDate), stops: [] }),
    ),
  getRoutes: officeProcedure
    .input(z.object({ date: z.string().datetime() }))
    .query(({ ctx }) => colList<RouteRow>(ctx.auth.organizationId, 'routes')),
});

export const mockupsRouter = router({
  list: officeProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const all = await colList<{ propertyId: string }>(ctx.auth.organizationId, 'mockups');
      return all.filter((m) => m.propertyId === input.propertyId);
    }),
  create: officeProcedure.input(createMockupSchema).mutation(({ ctx, input }) =>
    colCreate(ctx.auth.organizationId, 'mockups', { ...input, version: 1 }),
  ),
  attachToProposal: officeProcedure
    .input(z.object({ proposalId: z.string(), mockupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await colGet<{ mockupIds: string[] }>(ctx.auth.organizationId, 'proposals', input.proposalId);
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      return colUpdate(ctx.auth.organizationId, 'proposals', input.proposalId, {
        mockupIds: [...new Set([...(proposal.mockupIds ?? []), input.mockupId])],
      });
    }),
});

export const reportsRouter = router({
  dashboard: officeProcedure.input(reportFilterSchema.optional()).query(async ({ ctx, input }) => {
    const year = input?.year ?? null;
    const customers = await colList<{ createdAt?: Date }>(ctx.auth.organizationId, 'customers');
    const proposals = await colList<{ status: string; subtotalCents?: number; createdAt?: Date; season?: string }>(ctx.auth.organizationId, 'proposals');
    const invoices = await colList<{ amountPaidCents?: number; subtotalCents?: number; status: string; paidAt?: Date; createdAt?: Date }>(ctx.auth.organizationId, 'invoices');
    const jobs = await colList<{ stage: string; createdAt?: Date; completionDate?: Date }>(ctx.auth.organizationId, 'jobs');

    const inYear = (date?: Date | null) => !year || (date && date.getFullYear() === year);
    const proposalInYear = (p: { season?: string; createdAt?: Date }) =>
      !year || String(p.season) === String(year) || inYear(p.createdAt);

    const scopedProposals = proposals.filter(proposalInYear);
    const scopedInvoices = invoices.filter((i) => inYear(i.paidAt ?? i.createdAt));
    const scopedJobs = jobs.filter((j) => inYear(j.completionDate ?? j.createdAt));
    const accepted = scopedProposals.filter((p) => p.status === 'accepted' || p.status === 'approved');

    return {
      customers: year ? customers.filter((c) => inYear(c.createdAt)).length : customers.length,
      proposals: scopedProposals.length,
      acceptedProposals: accepted.length,
      conversionRate: scopedProposals.length ? Math.round((accepted.length / scopedProposals.length) * 100) : 0,
      revenueCents: scopedInvoices.reduce((s, i) => s + (i.amountPaidCents ?? 0), 0),
      pendingCents: invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + ((i.subtotalCents ?? 0) - (i.amountPaidCents ?? 0)), 0),
      activeJobs: scopedJobs.filter((j) => !['complete', 'lost', 'installed'].includes(j.stage)).length,
    };
  }),
  exportCsv: officeProcedure
    .input(z.object({ type: z.enum(['customers', 'invoices', 'jobs']) }))
    .query(async ({ ctx, input }) => {
      const rows = await colList(ctx.auth.organizationId, input.type);
      return JSON.stringify(rows);
    }),
});

export const settingsRouter = router({
  get: officeProcedure.query(({ ctx }) => getOrganization(ctx.auth.organizationId)),
  update: adminProcedure.input(orgSettingsSchema).mutation(({ ctx, input }) =>
    updateOrganization(ctx.auth.organizationId, input),
  ),
  team: officeProcedure.query(async ({ ctx }) => {
    const { getAdminFirestore } = await import('@yuletide/firebase');
    const snap = await getAdminFirestore()
      .collection('users')
      .where('organizationId', '==', ctx.auth.organizationId)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        firstName: data.firstName as string | undefined,
        lastName: data.lastName as string | undefined,
        email: data.email as string,
        role: data.role as string,
      };
    });
  }),
});

export const reviewsRouter = router({
  send: officeProcedure
    .input(z.object({ jobId: z.string(), platform: z.enum(['google', 'facebook']).default('google') }))
    .mutation(async ({ ctx, input }) => {
      const job = await colGet<{ customerId: string }>(ctx.auth.organizationId, 'jobs', input.jobId);
      if (!job?.customerId) throw new TRPCError({ code: 'NOT_FOUND' });
      const { triggerReviewRequestForJob } = await import('@yuletide/firebase');
      const result = await triggerReviewRequestForJob(ctx.auth.organizationId, input.jobId, ctx.auth.userId);
      if (!result) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Could not send review request' });
      return result;
    }),
});

export const appRouter = router({
  customers: customersRouter,
  customer360: customer360Router,
  portal360: portal360Router,
  rebooking360: rebooking360Router,
  storage360: storage360Router,
  commercial360: commercial360Router,
  contacts360: contacts360Router,
  agreements360: agreements360Router,
  timeClock360: timeClock360Router,
  projectPrep360: projectPrep360Router,
  serviceIssues360: serviceIssues360Router,
  proposals360: proposals360Router,
  inventory360: inventory360Router,
  invoices360: invoices360Router,
  messages360: messages360Router,
  schedule360: schedule360Router,
  mockups360: mockups360Router,
  reports360: reports360Router,
  settings360: settings360Router,
  billing: billingRouter,
  import360: import360Router,
  properties: propertiesRouter,
  inventory: inventoryRouter,
  proposals: proposalsRouter,
  invoices: invoicesRouter,
  jobs: jobsRouter,
  messages: messagesRouter,
  schedule: scheduleRouter,
  mockups: mockupsRouter,
  crew360: crew360Router,
  crew: crewMobileRouter,
  reviews360: reviews360Router,
  automation360: automation360Router,
  creator360: creator360Router,
  signTracker360: signTracker360Router,
  reports: reportsRouter,
  settings: settingsRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
