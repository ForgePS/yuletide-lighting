/**
 * PORTAL-P2-S5 route entitlement + file security integration evidence.
 * ENVIRONMENT=EMULATOR. No production services or deployment.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTAL_FEATURES, type PortalFeatureKey } from '@clcrm/types';
import {
  authorizePortalPath,
  colCreate,
  createPortalFileAccess,
  enableCustomerPortal,
  getPortalAccountByCustomer,
  getPortalJobDetail,
  listPortalDocuments,
  listPortalInvoices,
  listPortalJobs,
  getPortalMessages,
  listPortalMockups,
  requirePortalAuthorized,
  requirePortalRouteAccess,
  resolvePortalStoragePath,
  sanitizePortalFilename,
  suspendCustomerPortal,
  updatePortalSettings,
  verifyPortalFileTicket,
  PortalFeatureNotEnabledError,
  PortalAccessDeniedError,
} from '@yuletide/firebase';
import {
  createCallerForAuth,
  ensureFirestoreEmulator,
  sampleCustomerInput,
  seedTenant,
} from '../setup';

type OwnerKey = 'a1' | 'a2' | 'b1';

type Owner = {
  token: string;
  orgId: string;
  customerId: string;
  portalUserId: string;
  jobId: string;
  documentId: string;
  staffDocId: string;
};

const owners = {} as Record<OwnerKey, Owner>;
let staffOrgAUserId = '';

const FEATURE_ROUTES: Array<{ feature: PortalFeatureKey; path: string }> = [
  { feature: 'dashboard', path: '/portal/{t}' },
  { feature: 'scheduling', path: '/portal/{t}/schedule' },
  { feature: 'service_requests', path: '/portal/{t}/service-request' },
  { feature: 'messaging', path: '/portal/{t}/messages' },
  { feature: 'e_sign', path: '/portal/{t}/sign' },
  { feature: 'billing', path: '/portal/{t}/billing' },
  { feature: 'proposals', path: '/portal/{t}/proposals' },
  { feature: 'agreements', path: '/portal/{t}/agreements' },
  { feature: 'properties', path: '/portal/{t}/properties' },
  { feature: 'mockups', path: '/portal/{t}/mockups' },
  { feature: 'documents', path: '/portal/{t}/documents' },
  { feature: 'install_tracking', path: '/portal/{t}/jobs' },
  { feature: 'takedowns', path: '/portal/{t}/takedowns' },
  { feature: 'storage', path: '/portal/{t}/storage' },
  { feature: 'consultations', path: '/portal/{t}/consultations' },
  { feature: 'reviews', path: '/portal/{t}/reviews' },
  { feature: 'rebooking', path: '/portal/{t}/rebook' },
];

beforeAll(async () => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

  const tenantA = await seedTenant({
    org: {
      companyName: 'Portal S5 Tenant A',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  const tenantB = await seedTenant({
    org: {
      companyName: 'Portal S5 Tenant B',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  staffOrgAUserId = tenantA.user.id;

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
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      tenant.user.id,
      `s5-${tenant.org.id}@portal-test.invalid`,
    );
  }

  const customerA1 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'S5-A1', email: 's5-a1@portal-test.invalid' }),
  );
  const customerA2 = await callerA.customers.create(
    sampleCustomerInput({ firstName: 'S5-A2', email: 's5-a2@portal-test.invalid' }),
  );
  const customerB1 = await callerB.customers.create(
    sampleCustomerInput({ firstName: 'S5-B1', email: 's5-b1@portal-test.invalid' }),
  );

  const defs = [
    ['a1', tenantA, customerA1],
    ['a2', tenantA, customerA2],
    ['b1', tenantB, customerB1],
  ] as const;

  for (const [key, tenant, customer] of defs) {
    const portal = await enableCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    const account = await getPortalAccountByCustomer(tenant.org.id, customer.id);
    if (!account?.primaryPortalUserId) throw new Error(`Missing portal user ${key}`);

    const property = await colCreate(tenant.org.id, 'properties', {
      customerId: customer.id,
      propertyName: `s5-${key}`,
      label: `s5-${key}`,
      addressLine1: `${key} St`,
      city: 'Emulator',
      state: 'TS',
      postalCode: '00000',
    });
    const job = await colCreate(tenant.org.id, 'jobs', {
      customerId: customer.id,
      propertyId: property.id,
      title: `s5-job-${key}`,
      stage: 'scheduled',
    });
    const document = await colCreate(tenant.org.id, 'customerDocuments', {
      customerId: customer.id,
      title: `s5-doc-${key}`,
      category: 'other',
      url: `/api/files?path=organizations/${tenant.org.id}/portal-service/${customer.id}/doc.pdf`,
      visibility: 'customer_visible',
    });
    const staffDoc = await colCreate(tenant.org.id, 'customerDocuments', {
      customerId: customer.id,
      title: `s5-staff-${key}`,
      category: 'internal',
      url: `/api/files?path=organizations/${tenant.org.id}/staff-only/${customer.id}/secret.pdf`,
      visibility: 'staff_only',
    });
    await colCreate(tenant.org.id, 'mockups', {
      customerId: customer.id,
      name: `s5-mock-${key}`,
      imageUrl: `/api/files?path=organizations/${tenant.org.id}/portal-service/${customer.id}/mock.jpg`,
      status: 'approved',
      visibility: 'customer_visible',
    });
    await colCreate(tenant.org.id, 'mockups', {
      customerId: customer.id,
      name: `s5-draft-${key}`,
      imageUrl: `/api/files?path=organizations/${tenant.org.id}/portal-service/${customer.id}/draft.jpg`,
      status: 'draft',
    });
    await colCreate(tenant.org.id, 'invoices', {
      customerId: customer.id,
      invoiceNumber: `S5-${key}`,
      status: 'sent',
      subtotalCents: 5000,
      amountPaidCents: 0,
    });

    owners[key] = {
      token: portal.token,
      orgId: tenant.org.id,
      customerId: customer.id,
      portalUserId: account.primaryPortalUserId,
      jobId: job.id,
      documentId: document.id,
      staffDocId: staffDoc.id,
    };
  }
}, 120_000);

describe('P2-S5 route authorization matrix', () => {
  for (const { feature, path } of FEATURE_ROUTES) {
    it(`allows enabled feature route: ${feature}`, async () => {
      const pathname = path.replace('{t}', owners.a1.token);
      const result = await authorizePortalPath({ pathname, auth: owners.a1.token });
      expect(result.allowed).toBe(true);
    });

    it(`denies disabled feature route: ${feature}`, async () => {
      const all = PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== feature);
      try {
        await updatePortalSettings(
          owners.a1.orgId,
          { enabled: true, enabledFeatures: all },
          staffOrgAUserId,
          's5-disable@portal-test.invalid',
        );
        const pathname = path.replace('{t}', owners.a1.token);
        const result = await authorizePortalPath({ pathname, auth: owners.a1.token });
        const direct = await requirePortalRouteAccess({
          auth: owners.a1.token,
          feature,
          action: 'view',
        });
        expect(direct.allowed).toBe(false);
        if (!direct.allowed) {
          expect(['FEATURE_DISABLED', 'ACTION_DENIED', 'PORTAL_UNAVAILABLE']).toContain(
            direct.reason,
          );
        }
        if (!('public' in result)) {
          expect(result.allowed).toBe(false);
        }
      } finally {
        await updatePortalSettings(
          owners.a1.orgId,
          { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
          staffOrgAUserId,
          's5-restore@portal-test.invalid',
        );
      }
    });
  }

  it('denies wrong-customer job resource', async () => {
    const result = await requirePortalRouteAccess({
      auth: owners.a1.token,
      feature: 'install_tracking',
      action: 'view',
      resource: { type: 'job', id: owners.a2.jobId },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('RESOURCE_NOT_FOUND');
  });

  it('denies cross-tenant job resource', async () => {
    const result = await requirePortalRouteAccess({
      auth: owners.a1.token,
      feature: 'install_tracking',
      action: 'view',
      resource: { type: 'job', id: owners.b1.jobId },
    });
    expect(result.allowed).toBe(false);
  });

  it('allows own job resource deep link', async () => {
    const result = await requirePortalRouteAccess({
      auth: owners.a1.token,
      feature: 'install_tracking',
      action: 'view',
      resource: { type: 'job', id: owners.a1.jobId },
    });
    expect(result.allowed).toBe(true);
    const detail = await getPortalJobDetail(owners.a1.token, owners.a1.jobId);
    expect(detail.id).toBe(owners.a1.jobId);
  });

  it('denies suspended account on protected routes', async () => {
    await suspendCustomerPortal(owners.a2.orgId, owners.a2.customerId, staffOrgAUserId);
    const result = await authorizePortalPath({
      pathname: `/portal/${owners.a2.token}/billing`,
      auth: owners.a2.token,
    });
    expect(result.allowed).toBe(false);
  });
});

describe('P2-S5 file access authorization', () => {
  it('tickets own customer file and rejects staff-only / cross-customer', async () => {
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'documents',
      action: 'view',
    });

    const own = await createPortalFileAccess({
      authorized: ctx,
      fileId: owners.a1.documentId,
      name: 'own.pdf',
      contentType: 'application/pdf',
      sourceUrlOrPath: `/api/files?path=organizations/${owners.a1.orgId}/portal-service/${owners.a1.customerId}/doc.pdf`,
      visibility: 'customer_visible',
    });
    expect(own.canDownload).toBe(true);
    expect(own.accessUrl).toMatch(/^\/api\/portal\/files\?ticket=/);
    expect(own.accessUrl).not.toContain('organizations/');

    const ticket = new URL(own.accessUrl!, 'http://portal.local').searchParams.get('ticket')!;
    const payload = verifyPortalFileTicket(ticket);
    expect(payload?.customerId).toBe(owners.a1.customerId);
    expect(payload?.organizationId).toBe(owners.a1.orgId);

    const staff = await createPortalFileAccess({
      authorized: ctx,
      fileId: owners.a1.staffDocId,
      name: 'staff.pdf',
      contentType: 'application/pdf',
      sourceUrlOrPath: `/api/files?path=organizations/${owners.a1.orgId}/staff-only/x.pdf`,
      visibility: 'staff_only',
    });
    expect(staff.canDownload).toBe(false);
    expect(staff.accessUrl).toBeNull();

    const otherCustomer = await createPortalFileAccess({
      authorized: ctx,
      fileId: 'x',
      name: 'other.pdf',
      sourceUrlOrPath: `/api/files?path=organizations/${owners.a1.orgId}/portal-service/${owners.a2.customerId}/doc.pdf`,
      visibility: 'customer_visible',
    });
    expect(otherCustomer.accessUrl).toBeNull();

    const crossTenant = await createPortalFileAccess({
      authorized: ctx,
      fileId: 'y',
      name: 'b.pdf',
      sourceUrlOrPath: `/api/files?path=organizations/${owners.b1.orgId}/portal-service/${owners.b1.customerId}/doc.pdf`,
      visibility: 'customer_visible',
    });
    expect(crossTenant.accessUrl).toBeNull();

    const unknownVis = await createPortalFileAccess({
      authorized: ctx,
      fileId: 'z',
      name: 'z.pdf',
      sourceUrlOrPath: `/api/files?path=organizations/${owners.a1.orgId}/portal-service/${owners.a1.customerId}/doc.pdf`,
      visibility: 'internal',
    });
    expect(unknownVis.accessUrl).toBeNull();
  });

  it('listPortalDocuments does not expose raw storage paths', async () => {
    const docs = await listPortalDocuments(owners.a1.token);
    for (const d of docs) {
      if (d.url) {
        expect(d.url.startsWith('/api/portal/files?ticket=')).toBe(true);
        expect(d.url).not.toMatch(/organizations\//);
      }
    }
  });

  it('hides draft mockups and tickets approved ones', async () => {
    const mockups = await listPortalMockups(owners.a1.token);
    expect(mockups.every((m) => m.status !== 'draft')).toBe(true);
    for (const m of mockups) {
      if (m.imageUrl) expect(m.imageUrl.startsWith('/api/portal/files?ticket=')).toBe(true);
    }
  });

  it('path helpers reject traversal and arbitrary client paths', () => {
    expect(sanitizePortalFilename('../x')).not.toContain('..');
    expect(resolvePortalStoragePath(owners.a1.orgId, '../../../etc/passwd')).toBeNull();
    expect(
      resolvePortalStoragePath(
        owners.a1.orgId,
        `/api/files?path=organizations/${owners.b1.orgId}/x`,
      ),
    ).toBeNull();
  });

  it('billing disable denies invoice list', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'billing'),
      },
      staffOrgAUserId,
      's5-bill-off@portal-test.invalid',
    );
    await expect(listPortalInvoices(owners.a1.token)).rejects.toBeInstanceOf(
      PortalFeatureNotEnabledError,
    );
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffOrgAUserId,
      's5-bill-on@portal-test.invalid',
    );
  });

  it('messages disable denies message API', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'messaging'),
      },
      staffOrgAUserId,
      's5-msg-off@portal-test.invalid',
    );
    await expect(getPortalMessages(owners.a1.token)).rejects.toBeInstanceOf(
      PortalFeatureNotEnabledError,
    );
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffOrgAUserId,
      's5-msg-on@portal-test.invalid',
    );
  });

  it('jobs disable denies jobs list', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'install_tracking'),
      },
      staffOrgAUserId,
      's5-jobs-off@portal-test.invalid',
    );
    await expect(listPortalJobs(owners.a1.token)).rejects.toBeInstanceOf(
      PortalFeatureNotEnabledError,
    );
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffOrgAUserId,
      's5-jobs-on@portal-test.invalid',
    );
  });

  it('documents disable denies documents list', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'documents'),
      },
      staffOrgAUserId,
      's5-docs-off@portal-test.invalid',
    );
    await expect(listPortalDocuments(owners.a1.token)).rejects.toBeInstanceOf(
      PortalFeatureNotEnabledError,
    );
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffOrgAUserId,
      's5-docs-on@portal-test.invalid',
    );
  });

  it('suspended account cannot authorize file tickets', async () => {
    await expect(
      requirePortalAuthorized({
        token: owners.a2.token,
        feature: 'documents',
        action: 'view',
      }),
    ).rejects.toBeInstanceOf(PortalAccessDeniedError);
  });
});

describe('P2-S5 role and notification route coverage', () => {
  const viewRoutes = [
    '/portal/{t}/notifications',
    '/portal/{t}/contacts',
    '/portal/{t}/schedule-request',
    '/portal/{t}/jobs/job-missing',
  ] as const;

  for (const path of viewRoutes) {
    it(`authorizes or safely denies path ${path}`, async () => {
      const pathname = path.replace('{t}', owners.a1.token).replace('job-missing', owners.a1.jobId);
      const result = await authorizePortalPath({
        pathname,
        auth: owners.a1.token,
        resourceId: path.includes('jobs/') ? owners.a1.jobId : undefined,
      });
      expect(result.allowed).toBe(true);
    });
  }

  it('unknown protected segment fails closed', async () => {
    const result = await authorizePortalPath({
      pathname: `/portal/${owners.a1.token}/not-a-portal-feature`,
      auth: owners.a1.token,
    });
    expect(result.allowed).toBe(false);
  });

  it('public entry paths remain public', async () => {
    for (const pathname of ['/portal', '/portal/login', '/portal/access/x', '/portal/invite/y']) {
      const result = await authorizePortalPath({ pathname, auth: owners.a1.token });
      expect(result).toMatchObject({ allowed: true, public: true });
    }
  });

  it('view_only cannot create service requests after role change', async () => {
    const { changePortalUserRole, getPortalAccountByCustomer } = await import('@yuletide/firebase');
    const account = await getPortalAccountByCustomer(owners.a1.orgId, owners.a1.customerId);
    if (!account?.primaryPortalUserId) throw new Error('missing user');
    try {
      await changePortalUserRole(
        owners.a1.orgId,
        account.primaryPortalUserId,
        'view_only',
        staffOrgAUserId,
      );
      await expect(
        requirePortalAuthorized({
          token: owners.a1.token,
          feature: 'service_requests',
          action: 'create',
        }),
      ).rejects.toBeTruthy();
      const route = await requirePortalRouteAccess({
        auth: owners.a1.token,
        feature: 'billing',
        action: 'pay',
      });
      expect(route.allowed).toBe(false);
    } finally {
      await changePortalUserRole(
        owners.a1.orgId,
        account.primaryPortalUserId,
        'account_owner',
        staffOrgAUserId,
      );
    }
  });
});
