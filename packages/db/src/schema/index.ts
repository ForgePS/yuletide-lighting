import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'office', 'crew']);
export const jobStageEnum = pgEnum('job_stage', [
  'draft_proposal',
  'sent_proposal',
  'accepted_proposal',
  'lost',
  'invoiced',
  'deposit_paid',
  'inventory_reserved',
  'scheduled',
  'installed',
  'removal_scheduled',
  'removed',
  'review_requested',
  'complete',
]);
export const proposalStatusEnum = pgEnum('proposal_status', [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
  'void',
]);
export const messageChannelEnum = pgEnum('message_channel', ['sms', 'email', 'portal']);
export const agreementModeEnum = pgEnum('agreement_mode', ['single', 'multi']);
export const jobMaterialStatusEnum = pgEnum('job_material_status', [
  'planned',
  'reserved',
  'consumed',
  'released',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
]);
export const automationTriggerEnum = pgEnum('automation_trigger', [
  'proposal_viewed_no_accept',
  'invoice_overdue',
  'job_complete',
  'removal_complete',
]);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  companyName: text('company_name').notNull(),
  brandColor: text('brand_color').notNull().default('#DC2626'),
  logoUrl: text('logo_url'),
  agreementMode: agreementModeEnum('agreement_mode').notNull().default('multi'),
  agreementOptions: jsonb('agreement_options')
    .$type<Array<{ code: string; label: string; active: boolean }>>()
    .notNull()
    .default([]),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeConnectAccountId: text('stripe_connect_account_id'),
  twilioPhoneNumber: text('twilio_phone_number'),
  reviewGoogleUrl: text('review_google_url'),
  reviewFacebookUrl: text('review_facebook_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: userRoleEnum('role').notNull().default('office'),
    pushToken: text('push_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_org_clerk_idx').on(table.organizationId, table.clerkUserId),
    index('users_org_idx').on(table.organizationId),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    notes: text('notes'),
    smsOptIn: boolean('sms_opt_in').notNull().default(true),
    emailOptIn: boolean('email_opt_in').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('customers_org_idx').on(table.organizationId),
    index('customers_name_idx').on(table.organizationId, table.lastName, table.firstName),
  ],
);

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default('Primary'),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    postalCode: text('postal_code').notNull(),
    country: text('country').notNull().default('US'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    installNotes: text('install_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('properties_org_idx').on(table.organizationId),
    index('properties_customer_idx').on(table.customerId),
  ],
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    unit: text('unit').notNull().default('each'),
    quantityOnHand: real('quantity_on_hand').notNull().default(0),
    quantityReserved: real('quantity_reserved').notNull().default(0),
    reorderThreshold: real('reorder_threshold').notNull().default(0),
    prices: jsonb('prices')
      .$type<Array<{ agreementCode: string; unitPriceCents: number }>>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('inventory_org_sku_idx').on(table.organizationId, table.sku),
    index('inventory_org_idx').on(table.organizationId),
  ],
);

export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: proposalStatusEnum('status').notNull().default('draft'),
    agreementMode: agreementModeEnum('agreement_mode').notNull().default('single'),
    agreementOptions: jsonb('agreement_options')
      .$type<Array<{ code: string; label: string; active: boolean }>>()
      .notNull()
      .default([]),
    selectedAgreementCode: text('selected_agreement_code'),
    lineItems: jsonb('line_items')
      .$type<
        Array<{
          id: string;
          inventoryItemId?: string;
          description: string;
          quantity: number;
          unitPriceCents: number;
          agreementCode?: string;
        }>
      >()
      .notNull()
      .default([]),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    notes: text('notes'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    publicToken: text('public_token').notNull().unique(),
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByName: text('accepted_by_name'),
    mockupIds: jsonb('mockup_ids').$type<string[]>().notNull().default([]),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('proposals_org_idx').on(table.organizationId),
    index('proposals_customer_idx').on(table.customerId),
    index('proposals_token_idx').on(table.publicToken),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    stage: jobStageEnum('stage').notNull().default('draft_proposal'),
    assignedCrewUserId: uuid('assigned_crew_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
    installedAt: timestamp('installed_at', { withTimezone: true }),
    removedAt: timestamp('removed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('jobs_org_idx').on(table.organizationId),
    index('jobs_stage_idx').on(table.organizationId, table.stage),
    index('jobs_crew_idx').on(table.assignedCrewUserId),
  ],
);

export const jobMaterials = pgTable(
  'job_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    quantity: real('quantity').notNull(),
    status: jobMaterialStatusEnum('status').notNull().default('planned'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('job_materials_job_idx').on(table.jobId),
    index('job_materials_org_idx').on(table.organizationId),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'set null' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    invoiceNumber: text('invoice_number').notNull(),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    depositPercent: integer('deposit_percent').notNull().default(50),
    depositCents: integer('deposit_cents').notNull().default(0),
    amountPaidCents: integer('amount_paid_cents').notNull().default(0),
    dueDate: timestamp('due_date', { withTimezone: true }),
    publicToken: text('public_token').notNull().unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invoices_org_idx').on(table.organizationId),
    uniqueIndex('invoices_org_number_idx').on(table.organizationId, table.invoiceNumber),
    index('invoices_token_idx').on(table.publicToken),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    stripeChargeId: text('stripe_charge_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('payments_invoice_idx').on(table.invoiceId)],
);

export const messageThreads = pgTable(
  'message_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    unreadCount: integer('unread_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('threads_org_customer_idx').on(table.organizationId, table.customerId),
    index('threads_org_idx').on(table.organizationId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => messageThreads.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    channel: messageChannelEnum('channel').notNull(),
    direction: text('direction').notNull().default('outbound'),
    subject: text('subject'),
    body: text('body').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    externalId: text('external_id'),
    sentByUserId: uuid('sent_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_thread_idx').on(table.threadId),
    index('messages_org_idx').on(table.organizationId),
  ],
);

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    channel: messageChannelEnum('channel').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('templates_org_idx').on(table.organizationId)],
);

export const automations = pgTable(
  'automations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    trigger: automationTriggerEnum('trigger').notNull(),
    delayHours: integer('delay_hours').notNull().default(48),
    templateId: uuid('template_id').references(() => messageTemplates.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('automations_org_idx').on(table.organizationId)],
);

export const scheduleBlocks = pgTable(
  'schedule_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    crewUserId: uuid('crew_user_id').references(() => users.id, { onDelete: 'set null' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('schedule_org_idx').on(table.organizationId),
    index('schedule_crew_idx').on(table.crewUserId, table.startAt),
  ],
);

export const routes = pgTable(
  'routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    crewUserId: uuid('crew_user_id').references(() => users.id, { onDelete: 'set null' }),
    routeDate: timestamp('route_date', { withTimezone: true }).notNull(),
    stops: jsonb('stops')
      .$type<
        Array<{
          jobId: string;
          propertyId: string;
          address: string;
          latitude: number;
          longitude: number;
          order: number;
        }>
      >()
      .notNull()
      .default([]),
    totalDistanceMeters: real('total_distance_meters'),
    totalDurationSeconds: integer('total_duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('routes_org_date_idx').on(table.organizationId, table.routeDate),
    index('routes_crew_idx').on(table.crewUserId),
  ],
);

export const mockups = pgTable(
  'mockups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    imageUrl: text('image_url').notNull(),
    renderedImageUrl: text('rendered_image_url'),
    data: jsonb('data')
      .$type<{
        backgroundBrightness: number;
        strands: Array<{
          id: string;
          points: Array<{ x: number; y: number }>;
          color: string;
          pattern?: string[];
          bulbSize: number;
          spacing: number;
        }>;
      }>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('mockups_property_idx').on(table.propertyId)],
);

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clockIn: timestamp('clock_in', { withTimezone: true }).notNull(),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    latitude: real('latitude'),
    longitude: real('longitude'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('time_entries_job_idx').on(table.jobId),
    index('time_entries_user_idx').on(table.userId),
  ],
);

export const reviewRequests = pgTable(
  'review_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    reviewUrl: text('review_url').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('review_requests_org_idx').on(table.organizationId)],
);

export const jobPhotos = pgTable(
  'job_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    url: text('url').notNull(),
    caption: text('caption'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('job_photos_job_idx').on(table.jobId)],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  inventoryItems: many(inventoryItems),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  properties: many(properties),
  proposals: many(proposals),
  messageThreads: many(messageThreads),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  customer: one(customers, {
    fields: [properties.customerId],
    references: [customers.id],
  }),
  mockups: many(mockups),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  customer: one(customers, {
    fields: [proposals.customerId],
    references: [customers.id],
  }),
  property: one(properties, {
    fields: [proposals.propertyId],
    references: [properties.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  property: one(properties, {
    fields: [jobs.propertyId],
    references: [properties.id],
  }),
  materials: many(jobMaterials),
  timeEntries: many(timeEntries),
  photos: many(jobPhotos),
}));

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  customer: one(customers, {
    fields: [messageThreads.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));
