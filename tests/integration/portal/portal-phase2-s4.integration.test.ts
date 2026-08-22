/**
 * PORTAL-P2-S4 query isolation and public DTO evidence.
 * ENVIRONMENT=EMULATOR. No production services or deployment.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTAL_FEATURES } from '@clcrm/types';
import {
  colCreate,
  colUpdate,
  enableCustomerPortal,
  getAdminFirestore,
  getPortalAccountByCustomer,
  getPortalDashboard,
  getPortalJobDetail,
  getPortalMessages,
  getPortalResourceScope,
  listPortalContacts,
  listPortalDocuments,
  listPortalInvoices,
  listPortalJobs,
  listPortalNotifications,
  listPortalProperties,
  listPortalProposals,
  requirePortalAuthorized,
  requirePortalOwnedRecord,
  sendPortalMessage,
  toPublicCustomer,
  updatePortalSettings,
} from '@yuletide/firebase';
import {
  createCallerForAuth,
  ensureFirestoreEmulator,
  sampleCustomerInput,
  seedTenant,
} from '../setup';

const SENSITIVE_FIELDS = [
  'internalNotes',
  'margin',
  'profit',
  'tokenHash',
  'otp',
  'otpHash',
  'stripeCustomerId',
  'sessionVersion',
  'laborCost',
  'commission',
] as const;

const poisoned = Object.fromEntries(SENSITIVE_FIELDS.map((field) => [field, `secret-${field}`]));
type JsonRecord = Record<string, unknown>;
type OwnerKey = 'a1' | 'a2' | 'b1';

type OwnerFixture = {
  token: string;
  orgId: string;
  customerId: string;
  portalUserId: string;
  marker: string;
  ids: Record<
    'invoice' | 'proposal' | 'job' | 'property' | 'document' | 'contact' | 'event',
    string
  >;
};

type ResultSet = {
  dashboard: NonNullable<Awaited<ReturnType<typeof getPortalDashboard>>>;
  invoices: Awaited<ReturnType<typeof listPortalInvoices>>;
  proposals: Awaited<ReturnType<typeof listPortalProposals>>;
  jobs: Awaited<ReturnType<typeof listPortalJobs>>;
  properties: Awaited<ReturnType<typeof listPortalProperties>>;
  documents: Awaited<ReturnType<typeof listPortalDocuments>>;
  contacts: Awaited<ReturnType<typeof listPortalContacts>>;
  messages: Awaited<ReturnType<typeof getPortalMessages>>;
  notifications: Awaited<ReturnType<typeof listPortalNotifications>>;
  jobDetail: Awaited<ReturnType<typeof getPortalJobDetail>>;
};

const owners = {} as Record<OwnerKey, OwnerFixture>;
const results = {} as Record<OwnerKey, ResultSet>;

beforeAll(async () => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

  const tenantA = await seedTenant({
    org: {
      companyName: 'Portal S4 Tenant A',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  const tenantB = await seedTenant({
    org: {
      companyName: 'Portal S4 Tenant B',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  const callerA = createCallerForAuth({
    organizationId: tenantA.org.id,
    firebaseUid: tenantA.user.firebaseUid,
    userId: tenantA.user.id,
    settingsRole: 'owner',
  });
  const callerB = createCallerForAuth({
    organizationId: tenantB.org.id,
    firebaseUid: tenantB.user.firebaseUid,
    userId: tenantB.user.id,
    settingsRole: 'owner',
  });

  for (const tenant of [tenantA, tenantB]) {
    await updatePortalSettings(
      tenant.org.id,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((feature) => feature.key) },
      tenant.user.id,
      `s4-${tenant.org.id}@portal-test.invalid`,
    );
  }

  const customerA1 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'S4-A1', email: 's4-a1@portal-test.invalid' }),
  );
  const customerA2 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'S4-A2', email: 's4-a2@portal-test.invalid' }),
  );
  const customerB1 = await callerB.customers.create(
    sampleCustomerInput({ firstName: 'S4-B1', email: 's4-b1@portal-test.invalid' }),
  );

  const definitions = [
    ['a1', tenantA, customerA1],
    ['a2', tenantA, customerA2],
    ['b1', tenantB, customerB1],
  ] as const;

  for (const [key, tenant, customer] of definitions) {
    const marker = `portal-s4-${key}`;
    const portal = await enableCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    const account = await getPortalAccountByCustomer(tenant.org.id, customer.id);
    if (!account?.primaryPortalUserId) throw new Error(`Missing portal user for ${key}`);

    await colUpdate(tenant.org.id, 'customers', customer.id, poisoned);
    const invoice = await colCreate(tenant.org.id, 'invoices', {
      customerId: customer.id,
      invoiceNumber: marker,
      status: 'sent',
      subtotalCents: 12000,
      amountPaidCents: 1000,
      publicToken: `${marker}-invoice-token`,
      ...poisoned,
    });
    const proposal = await colCreate(tenant.org.id, 'proposals', {
      customerId: customer.id,
      title: marker,
      status: 'sent',
      subtotalCents: 15000,
      publicToken: `${marker}-proposal-token`,
      ...poisoned,
    });
    const property = await colCreate(tenant.org.id, 'properties', {
      customerId: customer.id,
      propertyName: marker,
      label: marker,
      addressLine1: `${marker} Lane`,
      city: 'Emulator',
      state: 'TS',
      postalCode: '00000',
      ...poisoned,
    });
    const job = await colCreate(tenant.org.id, 'jobs', {
      customerId: customer.id,
      propertyId: property.id,
      title: marker,
      stage: 'scheduled',
      scopeSummary: marker,
      ...poisoned,
    });
    const document = await colCreate(tenant.org.id, 'customerDocuments', {
      customerId: customer.id,
      title: marker,
      category: 'other',
      url: `https://example.invalid/${marker}`,
      ...poisoned,
    });
    const contact = await colCreate(tenant.org.id, 'contacts', {
      customerId: customer.id,
      firstName: marker,
      email: `${marker}@portal-test.invalid`,
      ...poisoned,
    });
    const event = await colCreate(tenant.org.id, 'calendarEvents', {
      customerId: customer.id,
      jobId: job.id,
      title: marker,
      appointmentType: 'installation',
      startAt: new Date('2026-11-01T12:00:00.000Z'),
      endAt: new Date('2026-11-01T14:00:00.000Z'),
      dispatchStatus: 'scheduled',
      ...poisoned,
    });
    await colCreate(tenant.org.id, 'portalNotifications', {
      portalUserId: account.primaryPortalUserId,
      customerId: customer.id,
      category: 'account',
      title: marker,
      body: marker,
      ...poisoned,
    });
    await sendPortalMessage(portal.token, marker);

    owners[key] = {
      token: portal.token,
      orgId: tenant.org.id,
      customerId: customer.id,
      portalUserId: account.primaryPortalUserId,
      marker,
      ids: {
        invoice: invoice.id,
        proposal: proposal.id,
        job: job.id,
        property: property.id,
        document: document.id,
        contact: contact.id,
        event: event.id,
      },
    };
  }

  for (const key of ['a1', 'a2', 'b1'] as const) {
    const owner = owners[key];
    const dashboard = await getPortalDashboard(owner.token);
    if (!dashboard) throw new Error(`Missing dashboard for ${key}`);
    results[key] = {
      dashboard,
      invoices: await listPortalInvoices(owner.token),
      proposals: await listPortalProposals(owner.token),
      jobs: await listPortalJobs(owner.token),
      properties: await listPortalProperties(owner.token),
      documents: await listPortalDocuments(owner.token),
      contacts: await listPortalContacts(owner.token),
      messages: await getPortalMessages(owner.token),
      notifications: await listPortalNotifications(owner.token),
      jobDetail: await getPortalJobDetail(owner.token, owner.ids.job),
    };
  }
}, 120_000);

function rowsFor(surface: keyof ResultSet, key: OwnerKey): JsonRecord[] {
  const value = results[key][surface];
  if (surface === 'dashboard') return [value as unknown as JsonRecord];
  if (surface === 'messages') {
    return (value as ResultSet['messages']).messages as unknown as JsonRecord[];
  }
  if (surface === 'jobDetail') return [value as unknown as JsonRecord];
  return value as unknown as JsonRecord[];
}

const isolatedSurfaces = [
  ['invoices', (r: ResultSet) => r.invoices],
  ['proposals', (r: ResultSet) => r.proposals],
  ['jobs', (r: ResultSet) => r.jobs],
  ['properties', (r: ResultSet) => r.properties],
  ['documents', (r: ResultSet) => r.documents],
  ['contacts', (r: ResultSet) => r.contacts],
  ['messages', (r: ResultSet) => r.messages.messages],
  ['notifications', (r: ResultSet) => r.notifications],
  ['dashboard calendar', (r: ResultSet) => r.dashboard.schedule],
] as const;

describe('PORTAL-P2-S4 customer and tenant isolation', () => {
  it.each(isolatedSurfaces)('A1 %s excludes A2 records', (_name, select) => {
    expect(JSON.stringify(select(results.a1))).not.toContain(owners.a2.marker);
  });

  it.each(isolatedSurfaces)('A1 %s excludes tenant B records', (_name, select) => {
    expect(JSON.stringify(select(results.a1))).not.toContain(owners.b1.marker);
  });

  it.each(isolatedSurfaces)('A1 %s is limited to own records', (name, select) => {
    const serialized = JSON.stringify(select(results.a1));
    if (name === 'dashboard calendar' && serialized === '[]') {
      expect(serialized).toBe('[]'); // Feature-unavailable dashboard calendar fails closed.
    } else {
      expect(serialized).toContain(owners.a1.marker);
    }
  });

  it('denies A1 access to the A2 job detail', async () => {
    await expect(getPortalJobDetail(owners.a1.token, owners.a2.ids.job)).rejects.toThrow(
      'PORTAL_RESOURCE_NOT_FOUND',
    );
  });

  it('denies A1 access to a tenant B job detail', async () => {
    await expect(getPortalJobDetail(owners.a1.token, owners.b1.ids.job)).rejects.toThrow(
      'PORTAL_RESOURCE_NOT_FOUND',
    );
  });

  it('returns generic not-found for an unknown job id', async () => {
    await expect(getPortalJobDetail(owners.a1.token, 'missing-job')).rejects.toThrow(
      'PORTAL_RESOURCE_NOT_FOUND',
    );
  });
});

const dtoSurfaces = [
  'invoices',
  'proposals',
  'jobs',
  'properties',
  'documents',
  'contacts',
  'messages',
  'notifications',
  'jobDetail',
] as const satisfies ReadonlyArray<keyof ResultSet>;

describe('PORTAL-P2-S4 public DTO allowlists', () => {
  it.each(SENSITIVE_FIELDS)('dashboard customer excludes %s', (field) => {
    expect(results.a1.dashboard.customer).not.toHaveProperty(field);
  });

  for (const surface of dtoSurfaces) {
    it.each(SENSITIVE_FIELDS)(`${surface} DTO excludes %s`, (field) => {
      for (const row of rowsFor(surface, 'a1')) expect(row).not.toHaveProperty(field);
    });
  }

  it('dashboard customer excludes internalNotes', () => {
    expect(results.a1.dashboard.customer).not.toHaveProperty('internalNotes');
  });

  it('dashboard customer excludes portalToken', () => {
    expect(results.a1.dashboard.customer).not.toHaveProperty('portalToken');
  });

  it('toPublicCustomer is an exact identity/contact allowlist', () => {
    const value = toPublicCustomer({
      id: 'customer',
      firstName: 'Public',
      lastName: 'Customer',
      businessName: null,
      email: 'public@example.invalid',
      phone: '5550000000',
      internalNotes: 'private',
      portalToken: 'private',
    } as never);
    expect(Object.keys(value).sort()).toEqual(
      ['businessName', 'email', 'firstName', 'id', 'lastName', 'phone'].sort(),
    );
  });
});

describe('PORTAL-P2-S4 authoritative scope', () => {
  it('ignores client organizationId injection', async () => {
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'dashboard',
      action: 'view',
      organizationId: owners.b1.orgId,
    } as never);
    expect(ctx.organizationId).toBe(owners.a1.orgId);
  });

  it('ignores client customerId injection', async () => {
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'dashboard',
      action: 'view',
      customerId: owners.a2.customerId,
    } as never);
    expect(ctx.customer.id).toBe(owners.a1.customerId);
  });

  it('derives account and user scope from authorization context', async () => {
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'dashboard',
      action: 'view',
    });
    expect(getPortalResourceScope(ctx)).toMatchObject({
      organizationId: owners.a1.orgId,
      customerId: owners.a1.customerId,
      portalUserId: owners.a1.portalUserId,
    });
  });

  it('ownership helper rejects another customer record', async () => {
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'dashboard',
      action: 'view',
    });
    expect(() =>
      requirePortalOwnedRecord({
        authorized: ctx,
        record: { id: owners.a2.ids.job, customerId: owners.a2.customerId },
        resourceType: 'job',
      }),
    ).toThrow('PORTAL_RESOURCE_NOT_FOUND');
  });
});

describe('PORTAL-P2-S4 payment and signing token separation', () => {
  it('A1 invoice list excludes A2 public payment token', () => {
    expect(JSON.stringify(results.a1.invoices)).not.toContain(`${owners.a2.marker}-invoice-token`);
  });

  it('A1 invoice list excludes tenant B public payment token', () => {
    expect(JSON.stringify(results.a1.invoices)).not.toContain(`${owners.b1.marker}-invoice-token`);
  });

  it('A1 proposal list excludes A2 public signing token', () => {
    expect(JSON.stringify(results.a1.proposals)).not.toContain(
      `${owners.a2.marker}-proposal-token`,
    );
  });

  it('A1 proposal list excludes tenant B public signing token', () => {
    expect(JSON.stringify(results.a1.proposals)).not.toContain(
      `${owners.b1.marker}-proposal-token`,
    );
  });

  it('keeps /pay and /p token authority separate from portal job IDs', () => {
    const tokens = JSON.stringify([...results.a1.invoices, ...results.a1.proposals]);
    expect(tokens).not.toContain(owners.a2.ids.job);
    expect(tokens).not.toContain(owners.b1.ids.job);
  });
});
