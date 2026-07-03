import { eq, and, desc, ilike, or, sql, count, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { TRPCError } from '@trpc/server';
import {
  getDb,
  customers,
  properties,
  proposals,
  jobs,
  invoices,
  inventoryItems,
  jobMaterials,
  messageThreads,
  messages,
  messageTemplates,
  automations,
  scheduleBlocks,
  routes,
  mockups,
  timeEntries,
  reviewRequests,
  jobPhotos,
  organizations,
  users,
  payments,
} from '@clcrm/db';
import {
  reserveJobMaterials,
  consumeJobMaterials,
  releaseJobMaterials,
  getLowStockItems,
} from '@clcrm/db';
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
} from '@clcrm/validators';
import { z } from 'zod';
import { router, protectedProcedure, officeProcedure, adminProcedure, publicProcedure } from '../trpc';

function orgScope(organizationId: string) {
  return organizationId;
}

function calcSubtotal(
  lineItems: Array<{ quantity: number; unitPriceCents: number }>,
): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
}

export const customersRouter = router({
  list: officeProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const db = getDb();
    const orgId = orgScope(ctx.auth.organizationId);
    const offset = (input.page - 1) * input.pageSize;

    const whereClause = input.search
      ? and(
          eq(customers.organizationId, orgId),
          or(
            ilike(customers.firstName, `%${input.search}%`),
            ilike(customers.lastName, `%${input.search}%`),
            ilike(customers.email, `%${input.search}%`),
            ilike(customers.phone, `%${input.search}%`),
          ),
        )
      : eq(customers.organizationId, orgId);

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(input.pageSize)
        .offset(offset),
      db.select({ total: count() }).from(customers).where(whereClause),
    ]);

    return { items, total, page: input.page, pageSize: input.pageSize };
  }),

  getById: officeProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(eq(customers.id, input.id), eq(customers.organizationId, ctx.auth.organizationId)),
        );
      if (!customer) throw new TRPCError({ code: 'NOT_FOUND' });

      const customerProperties = await db
        .select()
        .from(properties)
        .where(eq(properties.customerId, customer.id));

      return { ...customer, properties: customerProperties };
    }),

  create: officeProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [created] = await db
      .insert(customers)
      .values({
        organizationId: ctx.auth.organizationId,
        ...input,
        email: input.email || null,
        phone: input.phone || null,
      })
      .returning();
    return created!;
  }),

  update: officeProcedure
    .input(z.object({ id: z.string().uuid(), data: updateCustomerSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [updated] = await db
        .update(customers)
        .set({ ...input.data, updatedAt: new Date() })
        .where(
          and(eq(customers.id, input.id), eq(customers.organizationId, ctx.auth.organizationId)),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(customers)
        .where(
          and(eq(customers.id, input.id), eq(customers.organizationId, ctx.auth.organizationId)),
        );
      return { success: true };
    }),
});

export const propertiesRouter = router({
  create: officeProcedure.input(createPropertySchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [created] = await db
      .insert(properties)
      .values({ organizationId: ctx.auth.organizationId, ...input })
      .returning();
    return created!;
  }),

  update: officeProcedure
    .input(z.object({ id: z.string().uuid(), data: updatePropertySchema }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [updated] = await db
        .update(properties)
        .set({ ...input.data, updatedAt: new Date() })
        .where(
          and(eq(properties.id, input.id), eq(properties.organizationId, ctx.auth.organizationId)),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return updated;
    }),

  geocode: officeProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [property] = await db
        .select()
        .from(properties)
        .where(
          and(eq(properties.id, input.id), eq(properties.organizationId, ctx.auth.organizationId)),
        );
      if (!property) throw new TRPCError({ code: 'NOT_FOUND' });

      const address = `${property.addressLine1}, ${property.city}, ${property.state} ${property.postalCode}`;
      const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        return property;
      }

      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`,
      );
      const data = (await res.json()) as {
        features?: Array<{ center?: [number, number] }>;
      };
      const [lng, lat] = data.features?.[0]?.center ?? [null, null];

      if (lat && lng) {
        const [updated] = await db
          .update(properties)
          .set({ latitude: lat, longitude: lng, updatedAt: new Date() })
          .where(eq(properties.id, property.id))
          .returning();
        return updated!;
      }
      return property;
    }),
});

export const inventoryRouter = router({
  list: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.organizationId, ctx.auth.organizationId))
      .orderBy(inventoryItems.name);
  }),

  lowStock: officeProcedure.query(async ({ ctx }) => {
    return getLowStockItems(ctx.auth.organizationId);
  }),

  create: officeProcedure.input(createInventoryItemSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [created] = await db
      .insert(inventoryItems)
      .values({ organizationId: ctx.auth.organizationId, ...input })
      .returning();
    return created!;
  }),

  update: officeProcedure
    .input(z.object({ id: z.string().uuid(), data: createInventoryItemSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [updated] = await db
        .update(inventoryItems)
        .set({ ...input.data, updatedAt: new Date() })
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.organizationId, ctx.auth.organizationId),
          ),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return updated;
    }),
});

export const proposalsRouter = router({
  list: officeProcedure.input(paginationSchema.optional()).query(async ({ ctx, input }) => {
    const db = getDb();
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.organizationId, ctx.auth.organizationId))
      .orderBy(desc(proposals.createdAt))
      .limit(input?.pageSize ?? 50);
  }),

  getById: officeProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(
          and(eq(proposals.id, input.id), eq(proposals.organizationId, ctx.auth.organizationId)),
        );
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      return proposal;
    }),

  create: officeProcedure.input(createProposalSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const lineItems = input.lineItems.map((item) => ({
      ...item,
      id: nanoid(),
    }));
    const subtotalCents = calcSubtotal(lineItems);

    const [created] = await db
      .insert(proposals)
      .values({
        organizationId: ctx.auth.organizationId,
        customerId: input.customerId,
        propertyId: input.propertyId,
        title: input.title,
        agreementMode: input.agreementMode,
        agreementOptions: input.agreementOptions,
        lineItems,
        subtotalCents,
        notes: input.notes,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        publicToken: nanoid(32),
      })
      .returning();

    await db.insert(jobs).values({
      organizationId: ctx.auth.organizationId,
      customerId: input.customerId,
      propertyId: input.propertyId,
      proposalId: created!.id,
      title: input.title,
      stage: 'draft_proposal',
    });

    return created!;
  }),

  send: officeProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [updated] = await db
        .update(proposals)
        .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(proposals.id, input.id), eq(proposals.organizationId, ctx.auth.organizationId)),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });

      await db
        .update(jobs)
        .set({ stage: 'sent_proposal', updatedAt: new Date() })
        .where(eq(jobs.proposalId, updated.id));

      return updated;
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(eq(proposals.publicToken, input.token));
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });

      await db
        .update(proposals)
        .set({
          viewCount: sql`${proposals.viewCount} + 1`,
          lastViewedAt: new Date(),
          status: proposal.status === 'sent' ? 'viewed' : proposal.status,
        })
        .where(eq(proposals.id, proposal.id));

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, proposal.customerId));
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, proposal.propertyId));
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, proposal.organizationId));

      let proposalMockups: typeof mockups.$inferSelect[] = [];
      if (proposal.mockupIds.length > 0) {
        proposalMockups = await db.select().from(mockups).where(
          sql`${mockups.id} = ANY(${proposal.mockupIds})`,
        );
      }

      return { proposal, customer, property, organization: org, mockups: proposalMockups };
    }),

  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        agreementCode: z.string().optional(),
        customerName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(eq(proposals.publicToken, input.token));
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      if (proposal.status === 'accepted') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already accepted' });
      }

      const [updated] = await db
        .update(proposals)
        .set({
          status: 'accepted',
          selectedAgreementCode: input.agreementCode,
          acceptedAt: new Date(),
          acceptedByName: input.customerName,
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, proposal.id))
        .returning();

      await db
        .update(jobs)
        .set({ stage: 'accepted_proposal', updatedAt: new Date() })
        .where(eq(jobs.proposalId, proposal.id));

      return updated!;
    }),
});

export const invoicesRouter = router({
  list: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, ctx.auth.organizationId))
      .orderBy(desc(invoices.createdAt));
  }),

  createFromProposal: officeProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.proposalId),
            eq(proposals.organizationId, ctx.auth.organizationId),
          ),
        );
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });
      if (proposal.status !== 'accepted') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Proposal must be accepted first' });
      }

      const [{ count: invoiceCount }] = await db
        .select({ count: count() })
        .from(invoices)
        .where(eq(invoices.organizationId, ctx.auth.organizationId));

      const depositCents = Math.round(proposal.subtotalCents * (input.depositPercent / 100));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + input.dueDays);

      const [job] = await db.select().from(jobs).where(eq(jobs.proposalId, proposal.id));

      const [created] = await db
        .insert(invoices)
        .values({
          organizationId: ctx.auth.organizationId,
          customerId: proposal.customerId,
          proposalId: proposal.id,
          jobId: job?.id,
          invoiceNumber: `INV-${String(Number(invoiceCount) + 1).padStart(5, '0')}`,
          status: 'sent',
          subtotalCents: proposal.subtotalCents,
          depositPercent: input.depositPercent,
          depositCents,
          dueDate,
          publicToken: nanoid(32),
          sentAt: new Date(),
        })
        .returning();

      if (job) {
        await db
          .update(jobs)
          .set({ stage: 'invoiced', updatedAt: new Date() })
          .where(eq(jobs.id, job.id));
      }

      return created!;
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.publicToken, input.token));
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, invoice.customerId));
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, invoice.organizationId));

      return { invoice, customer, organization: org };
    }),
});

export const jobsRouter = router({
  list: officeProcedure
    .input(z.object({ stage: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(jobs.organizationId, ctx.auth.organizationId)];
      if (input?.stage) {
        conditions.push(eq(jobs.stage, input.stage as typeof jobs.$inferSelect.stage));
      }
      return db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(desc(jobs.updatedAt));
    }),

  pipeline: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const allJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.organizationId, ctx.auth.organizationId));

    const stages = [
      'draft_proposal',
      'sent_proposal',
      'accepted_proposal',
      'invoiced',
      'deposit_paid',
      'inventory_reserved',
      'scheduled',
      'installed',
      'removal_scheduled',
      'removed',
      'review_requested',
      'complete',
    ] as const;

    return stages.map((stage) => ({
      stage,
      jobs: allJobs.filter((j) => j.stage === stage),
    }));
  }),

  reserveInventory: officeProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await reserveJobMaterials(db, ctx.auth.organizationId, input.jobId);
      return { success: true };
    }),

  completeInstall: officeProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await consumeJobMaterials(db, ctx.auth.organizationId, input.jobId);
      return { success: true };
    }),

  cancelReservation: officeProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await releaseJobMaterials(db, ctx.auth.organizationId, input.jobId);
      return { success: true };
    }),

  addMaterials: officeProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        materials: z.array(
          z.object({ inventoryItemId: z.string().uuid(), quantity: z.number().positive() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = input.materials.map((m) => ({
        organizationId: ctx.auth.organizationId,
        jobId: input.jobId,
        inventoryItemId: m.inventoryItemId,
        quantity: m.quantity,
        status: 'planned' as const,
      }));
      await db.insert(jobMaterials).values(rows);
      return { success: true };
    }),

  getMaterials: officeProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select({
          material: jobMaterials,
          item: inventoryItems,
        })
        .from(jobMaterials)
        .innerJoin(inventoryItems, eq(jobMaterials.inventoryItemId, inventoryItems.id))
        .where(
          and(
            eq(jobMaterials.jobId, input.jobId),
            eq(jobMaterials.organizationId, ctx.auth.organizationId),
          ),
        );
    }),

  schedule: officeProcedure.input(scheduleJobSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const start = new Date(input.scheduledStart);
    const end = input.scheduledEnd
      ? new Date(input.scheduledEnd)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    await db
      .update(jobs)
      .set({
        assignedCrewUserId: input.crewUserId ?? null,
        scheduledStart: start,
        scheduledEnd: end,
        stage: 'scheduled',
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, input.jobId), eq(jobs.organizationId, ctx.auth.organizationId)));

    await db.insert(scheduleBlocks).values({
      organizationId: ctx.auth.organizationId,
      jobId: input.jobId,
      crewUserId: input.crewUserId,
      startAt: start,
      endAt: end,
    });

    return { success: true };
  }),

  markRemovalComplete: officeProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(jobs)
        .set({ stage: 'removed', removedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(jobs.id, input.jobId), eq(jobs.organizationId, ctx.auth.organizationId)));
      return { success: true };
    }),
});

export const messagesRouter = router({
  threads: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        thread: messageThreads,
        customer: customers,
      })
      .from(messageThreads)
      .innerJoin(customers, eq(messageThreads.customerId, customers.id))
      .where(eq(messageThreads.organizationId, ctx.auth.organizationId))
      .orderBy(desc(messageThreads.lastMessageAt));
  }),

  getThread: officeProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      let [thread] = await db
        .select()
        .from(messageThreads)
        .where(
          and(
            eq(messageThreads.customerId, input.customerId),
            eq(messageThreads.organizationId, ctx.auth.organizationId),
          ),
        );

      if (!thread) {
        [thread] = await db
          .insert(messageThreads)
          .values({
            organizationId: ctx.auth.organizationId,
            customerId: input.customerId,
          })
          .returning();
      }

      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, thread!.id))
        .orderBy(messages.createdAt);

      return { thread: thread!, messages: threadMessages };
    }),

  send: officeProcedure.input(sendMessageSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    let [thread] = await db
      .select()
      .from(messageThreads)
      .where(
        and(
          eq(messageThreads.customerId, input.customerId),
          eq(messageThreads.organizationId, ctx.auth.organizationId),
        ),
      );

    if (!thread) {
      [thread] = await db
        .insert(messageThreads)
        .values({
          organizationId: ctx.auth.organizationId,
          customerId: input.customerId,
        })
        .returning();
    }

    const [message] = await db
      .insert(messages)
      .values({
        organizationId: ctx.auth.organizationId,
        threadId: thread!.id,
        customerId: input.customerId,
        channel: input.channel,
        direction: 'outbound',
        subject: input.subject,
        body: input.body,
        sentByUserId: ctx.auth.userId,
      })
      .returning();

    await db
      .update(messageThreads)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(messageThreads.id, thread!.id));

    if (input.channel === 'sms') {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId));
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, ctx.auth.organizationId));

      if (customer?.phone && org?.twilioPhoneNumber && process.env.TWILIO_ACCOUNT_SID) {
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        ).toString('base64');
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: org.twilioPhoneNumber,
              To: customer.phone,
              Body: input.body,
            }),
          },
        );
      }
    }

    if (input.channel === 'email' && process.env.RESEND_API_KEY) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId));
      if (customer?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: customer.email,
            subject: input.subject ?? 'Message from your lighting installer',
            text: input.body,
          }),
        });
      }
    }

    return message!;
  }),

  templates: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.organizationId, ctx.auth.organizationId));
  }),

  createTemplate: officeProcedure
    .input(
      z.object({
        name: z.string(),
        channel: z.enum(['sms', 'email', 'portal']),
        subject: z.string().optional(),
        body: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [created] = await db
        .insert(messageTemplates)
        .values({ organizationId: ctx.auth.organizationId, ...input })
        .returning();
      return created!;
    }),

  automations: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(automations)
      .where(eq(automations.organizationId, ctx.auth.organizationId));
  }),
});

export const scheduleRouter = router({
  calendar: officeProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select({
          block: scheduleBlocks,
          job: jobs,
        })
        .from(scheduleBlocks)
        .innerJoin(jobs, eq(scheduleBlocks.jobId, jobs.id))
        .where(
          and(
            eq(scheduleBlocks.organizationId, ctx.auth.organizationId),
            gte(scheduleBlocks.startAt, new Date(input.start)),
            lte(scheduleBlocks.endAt, new Date(input.end)),
          ),
        )
        .orderBy(scheduleBlocks.startAt);
    }),

  optimizeRoute: officeProcedure
    .input(
      z.object({
        crewUserId: z.string().uuid().optional(),
        routeDate: z.string().datetime(),
        jobIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const jobList = await db
        .select({ job: jobs, property: properties })
        .from(jobs)
        .innerJoin(properties, eq(jobs.propertyId, properties.id))
        .where(
          and(
            eq(jobs.organizationId, ctx.auth.organizationId),
            sql`${jobs.id} = ANY(${input.jobIds})`,
          ),
        );

      const withCoords = jobList.filter((j) => j.property.latitude && j.property.longitude);
      const stops = nearestNeighborRoute(withCoords);

      const [created] = await db
        .insert(routes)
        .values({
          organizationId: ctx.auth.organizationId,
          crewUserId: input.crewUserId,
          routeDate: new Date(input.routeDate),
          stops,
        })
        .returning();

      return created!;
    }),

  getRoutes: officeProcedure
    .input(z.object({ date: z.string().datetime() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const dayStart = new Date(input.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(input.date);
      dayEnd.setHours(23, 59, 59, 999);

      return db
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.organizationId, ctx.auth.organizationId),
            gte(routes.routeDate, dayStart),
            lte(routes.routeDate, dayEnd),
          ),
        );
    }),
});

function nearestNeighborRoute(
  jobList: Array<{
    job: typeof jobs.$inferSelect;
    property: typeof properties.$inferSelect;
  }>,
) {
  if (jobList.length === 0) return [];

  const remaining = [...jobList];
  const ordered: typeof jobList = [];
  let current = remaining.shift()!;
  ordered.push(current);

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversine(
        current.property.latitude!,
        current.property.longitude!,
        remaining[i]!.property.latitude!,
        remaining[i]!.property.longitude!,
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    current = remaining.splice(nearestIdx, 1)[0]!;
    ordered.push(current);
  }

  return ordered.map((item, index) => ({
    jobId: item.job.id,
    propertyId: item.property.id,
    address: `${item.property.addressLine1}, ${item.property.city}`,
    latitude: item.property.latitude!,
    longitude: item.property.longitude!,
    order: index + 1,
  }));
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const mockupsRouter = router({
  list: officeProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(mockups)
        .where(
          and(
            eq(mockups.propertyId, input.propertyId),
            eq(mockups.organizationId, ctx.auth.organizationId),
          ),
        )
        .orderBy(desc(mockups.version));
    }),

  create: officeProcedure.input(createMockupSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const existing = await db
      .select()
      .from(mockups)
      .where(
        and(eq(mockups.propertyId, input.propertyId), eq(mockups.name, input.name)),
      );
    const version = existing.length > 0 ? Math.max(...existing.map((m) => m.version)) + 1 : 1;

    const [created] = await db
      .insert(mockups)
      .values({
        organizationId: ctx.auth.organizationId,
        propertyId: input.propertyId,
        name: input.name,
        version,
        imageUrl: input.imageUrl,
        data: input.data,
      })
      .returning();
    return created!;
  }),

  attachToProposal: officeProcedure
    .input(z.object({ proposalId: z.string().uuid(), mockupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [proposal] = await db
        .select()
        .from(proposals)
        .where(
          and(eq(proposals.id, input.proposalId), eq(proposals.organizationId, ctx.auth.organizationId)),
        );
      if (!proposal) throw new TRPCError({ code: 'NOT_FOUND' });

      const mockupIds = [...new Set([...proposal.mockupIds, input.mockupId])];
      const [updated] = await db
        .update(proposals)
        .set({ mockupIds, updatedAt: new Date() })
        .where(eq(proposals.id, input.proposalId))
        .returning();
      return updated!;
    }),
});

export const crewRouter = router({
  mySchedule: protectedProcedure
    .input(z.object({ date: z.string().datetime().optional() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const targetDate = input.date ? new Date(input.date) : new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      return db
        .select({ job: jobs, property: properties, customer: customers })
        .from(jobs)
        .innerJoin(properties, eq(jobs.propertyId, properties.id))
        .innerJoin(customers, eq(jobs.customerId, customers.id))
        .where(
          and(
            eq(jobs.organizationId, ctx.auth.organizationId),
            eq(jobs.assignedCrewUserId, ctx.auth.userId),
            gte(jobs.scheduledStart, dayStart),
            lte(jobs.scheduledStart, dayEnd),
          ),
        )
        .orderBy(jobs.scheduledStart);
    }),

  clockIn: protectedProcedure.input(timeEntrySchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [entry] = await db
      .insert(timeEntries)
      .values({
        organizationId: ctx.auth.organizationId,
        jobId: input.jobId,
        userId: ctx.auth.userId,
        clockIn: new Date(input.clockIn),
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .returning();
    return entry!;
  }),

  clockOut: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [updated] = await db
        .update(timeEntries)
        .set({ clockOut: new Date() })
        .where(
          and(
            eq(timeEntries.id, input.entryId),
            eq(timeEntries.userId, ctx.auth.userId),
            eq(timeEntries.organizationId, ctx.auth.organizationId),
          ),
        )
        .returning();
      return updated!;
    }),

  uploadPhoto: protectedProcedure
    .input(z.object({ jobId: z.string().uuid(), url: z.string().url(), caption: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [photo] = await db
        .insert(jobPhotos)
        .values({
          organizationId: ctx.auth.organizationId,
          jobId: input.jobId,
          uploadedByUserId: ctx.auth.userId,
          url: input.url,
          caption: input.caption,
        })
        .returning();
      return photo!;
    }),

  completeJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await consumeJobMaterials(db, ctx.auth.organizationId, input.jobId);
      return { success: true };
    }),

  updatePushToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({ pushToken: input.token, updatedAt: new Date() })
        .where(eq(users.id, ctx.auth.userId));
      return { success: true };
    }),
});

export const reportsRouter = router({
  dashboard: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const orgId = ctx.auth.organizationId;

    const [customerCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.organizationId, orgId));

    const [proposalCount] = await db
      .select({ count: count() })
      .from(proposals)
      .where(eq(proposals.organizationId, orgId));

    const [acceptedCount] = await db
      .select({ count: count() })
      .from(proposals)
      .where(and(eq(proposals.organizationId, orgId), eq(proposals.status, 'accepted')));

    const allInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, orgId));

    const revenueCents = allInvoices.reduce((sum, inv) => sum + inv.amountPaidCents, 0);
    const pendingCents = allInvoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'void')
      .reduce((sum, inv) => sum + (inv.subtotalCents - inv.amountPaidCents), 0);

    const activeJobs = await db
      .select({ count: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.organizationId, orgId),
          sql`${jobs.stage} NOT IN ('complete', 'lost')`,
        ),
      );

    const conversionRate =
      Number(proposalCount?.count) > 0
        ? (Number(acceptedCount?.count) / Number(proposalCount?.count)) * 100
        : 0;

    return {
      customers: Number(customerCount?.count ?? 0),
      proposals: Number(proposalCount?.count ?? 0),
      acceptedProposals: Number(acceptedCount?.count ?? 0),
      conversionRate: Math.round(conversionRate),
      revenueCents,
      pendingCents,
      activeJobs: Number(activeJobs[0]?.count ?? 0),
    };
  }),

  exportCsv: officeProcedure
    .input(z.object({ type: z.enum(['customers', 'invoices', 'jobs']) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const orgId = ctx.auth.organizationId;

      if (input.type === 'customers') {
        const rows = await db.select().from(customers).where(eq(customers.organizationId, orgId));
        const header = 'firstName,lastName,email,phone,tags\n';
        const body = rows
          .map(
            (r) =>
              `"${r.firstName}","${r.lastName}","${r.email ?? ''}","${r.phone ?? ''}","${(r.tags as string[]).join(';')}"`,
          )
          .join('\n');
        return header + body;
      }

      if (input.type === 'invoices') {
        const rows = await db.select().from(invoices).where(eq(invoices.organizationId, orgId));
        const header = 'invoiceNumber,status,subtotalCents,amountPaidCents,dueDate\n';
        const body = rows
          .map(
            (r) =>
              `"${r.invoiceNumber}","${r.status}",${r.subtotalCents},${r.amountPaidCents},"${r.dueDate?.toISOString() ?? ''}"`,
          )
          .join('\n');
        return header + body;
      }

      const rows = await db.select().from(jobs).where(eq(jobs.organizationId, orgId));
      const header = 'title,stage,scheduledStart,installedAt\n';
      const body = rows
        .map(
          (r) =>
            `"${r.title}","${r.stage}","${r.scheduledStart?.toISOString() ?? ''}","${r.installedAt?.toISOString() ?? ''}"`,
        )
        .join('\n');
      return header + body;
    }),
});

export const settingsRouter = router({
  get: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.auth.organizationId));
    return org!;
  }),

  update: adminProcedure.input(orgSettingsSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [updated] = await db
      .update(organizations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organizations.id, ctx.auth.organizationId))
      .returning();
    return updated!;
  }),

  team: officeProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(users).where(eq(users.organizationId, ctx.auth.organizationId));
  }),
});

export const reviewsRouter = router({
  send: officeProcedure
    .input(z.object({ jobId: z.string().uuid(), platform: z.enum(['google', 'facebook']) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [job] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, input.jobId), eq(jobs.organizationId, ctx.auth.organizationId)));
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, ctx.auth.organizationId));

      const reviewUrl =
        input.platform === 'google' ? org?.reviewGoogleUrl : org?.reviewFacebookUrl;
      if (!reviewUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Review URL not configured' });
      }

      const [created] = await db
        .insert(reviewRequests)
        .values({
          organizationId: ctx.auth.organizationId,
          customerId: job.customerId,
          jobId: job.id,
          platform: input.platform,
          reviewUrl,
          sentAt: new Date(),
        })
        .returning();

      await db
        .update(jobs)
        .set({ stage: 'review_requested', updatedAt: new Date() })
        .where(eq(jobs.id, job.id));

      return created!;
    }),
});

export const appRouter = router({
  customers: customersRouter,
  properties: propertiesRouter,
  inventory: inventoryRouter,
  proposals: proposalsRouter,
  invoices: invoicesRouter,
  jobs: jobsRouter,
  messages: messagesRouter,
  schedule: scheduleRouter,
  mockups: mockupsRouter,
  crew: crewRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
