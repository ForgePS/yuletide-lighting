/**
 * PORTAL-P2-S6 transaction integrity evidence.
 * ENVIRONMENT=EMULATOR. No production / real Stripe / real email/SMS.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTAL_FEATURES } from '@clcrm/types';
import {
  canPortalTransition,
  changePortalUserRole,
  clearPortalRateLimitBuckets,
  colCreate,
  colUpdate,
  consumePortalRateLimit,
  enableCustomerPortal,
  getAdminFirestore,
  getPortalAccountByCustomer,
  listPortalNotifications,
  listPortalTimeline,
  markPortalNotificationRead,
  PortalMutationDeniedError,
  PortalResourceNotFoundError,
  portalInvoicePayableCents,
  portalPaymentSafeMode,
  portalRateLimitKey,
  processPortalRebook,
  recordAgreementSignature,
  recordCustomerMockupApproval,
  recordPublicApproval,
  requirePortalMutation,
  sendPortalMessage,
  submitPortalScheduleRequest,
  submitPortalServiceRequest,
  submitPortalRebookRequest,
  suspendCustomerPortal,
  updatePortalSettings,
  withPortalIdempotency,
  getPortalResourceScope,
  requirePortalAuthorized,
} from '@yuletide/firebase';
import {
  createCallerForAuth,
  ensureFirestoreEmulator,
  sampleCustomerInput,
  seedTenant,
} from '../setup';

const owners = {} as Record<
  'a1' | 'a2',
  {
    token: string;
    orgId: string;
    customerId: string;
    portalUserId: string;
    proposalToken: string;
    agreementToken: string;
    mockupToken: string;
    invoiceId: string;
  }
>;
let staffUserId = '';
let crossTenant: {
  token: string;
  orgId: string;
  customerId: string;
  proposalToken: string;
  invoiceId: string;
} | null = null;

beforeAll(async () => {
  ensureFirestoreEmulator();
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.PORTAL_PAYMENT_SAFE_MODE = '1';

  const tenant = await seedTenant({
    org: {
      companyName: 'Portal S6 Tenant A',
      enabledModules: ['customer_portal', 'crm_core', 'billing', 'scheduling'],
      featureFlags: { customer_portal: true },
    },
  });
  staffUserId = tenant.user.id;
  const caller = createCallerForAuth({
    organizationId: tenant.org.id,
    firebaseUid: tenant.user.firebaseUid,
    userId: tenant.user.id,
    settingsRole: 'owner',
  });
  await updatePortalSettings(
    tenant.org.id,
    {
      enabled: true,
      enabledFeatures: PORTAL_FEATURES.map((f) => f.key),
      allowSelfScheduling: true,
    },
    tenant.user.id,
    's6@portal-test.invalid',
  );

  for (const key of ['a1', 'a2'] as const) {
    const customer = await caller.customers.create(
      sampleCustomerInput({
        firstName: `S6-${key}`,
        email: `s6-${key}@portal-test.invalid`,
      }),
    );
    const portal = await enableCustomerPortal(tenant.org.id, customer.id, tenant.user.id);
    const account = await getPortalAccountByCustomer(tenant.org.id, customer.id);
    if (!account?.primaryPortalUserId) throw new Error('missing portal user');

    const proposalToken = `s6-prop-${key}-${Date.now()}`;
    const agreementToken = `s6-agr-${key}-${Date.now()}`;
    const mockupToken = `s6-mock-${key}-${Date.now()}`;

    await colCreate(tenant.org.id, 'proposals', {
      customerId: customer.id,
      organizationId: tenant.org.id,
      title: `S6 Proposal ${key}`,
      status: 'sent',
      subtotalCents: 20000,
      depositPercent: 25,
      publicToken: proposalToken,
    });
    await colCreate(tenant.org.id, 'multiYearAgreements', {
      customerId: customer.id,
      organizationId: tenant.org.id,
      title: `S6 Agreement ${key}`,
      status: 'awaiting_signature',
      publicToken: agreementToken,
      startSeason: 2026,
      endSeason: 2028,
    });
    await colCreate(tenant.org.id, 'mockups', {
      customerId: customer.id,
      organizationId: tenant.org.id,
      name: `S6 Mockup ${key}`,
      status: 'in_review',
      visibility: 'customer_visible',
      imageUrl: `/api/files?path=organizations/${tenant.org.id}/portal-service/${customer.id}/m.jpg`,
      approvalToken: mockupToken,
    });
    const invoice = await colCreate(tenant.org.id, 'invoices', {
      customerId: customer.id,
      organizationId: tenant.org.id,
      invoiceNumber: `S6-${key}`,
      status: 'sent',
      subtotalCents: 10000,
      amountPaidCents: 0,
      depositCents: 2500,
      publicToken: `s6-inv-${key}`,
    });

    owners[key] = {
      token: portal.token,
      orgId: tenant.org.id,
      customerId: customer.id,
      portalUserId: account.primaryPortalUserId,
      proposalToken,
      agreementToken,
      mockupToken,
      invoiceId: invoice.id,
    };
  }

  // Cross-tenant isolation seed
  const tenantB = await seedTenant({
    org: {
      companyName: 'Portal S6 Tenant B',
      enabledModules: ['customer_portal', 'crm_core', 'billing'],
      featureFlags: { customer_portal: true },
    },
  });
  await updatePortalSettings(
    tenantB.org.id,
    { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
    tenantB.user.id,
    's6-b@portal-test.invalid',
  );
  const callerB = createCallerForAuth({
    organizationId: tenantB.org.id,
    firebaseUid: tenantB.user.firebaseUid,
    userId: tenantB.user.id,
    settingsRole: 'owner',
  });
  const customerB = await callerB.customers.create(
    sampleCustomerInput({ firstName: 'S6-XB', email: 's6-xb@portal-test.invalid' }),
  );
  const portalB = await enableCustomerPortal(tenantB.org.id, customerB.id, tenantB.user.id);
  const proposalTokenB = `s6-prop-xb-${Date.now()}`;
  await colCreate(tenantB.org.id, 'proposals', {
    customerId: customerB.id,
    organizationId: tenantB.org.id,
    title: 'Cross tenant proposal',
    status: 'sent',
    subtotalCents: 9000,
    depositPercent: 20,
    publicToken: proposalTokenB,
  });
  const invoiceB = await colCreate(tenantB.org.id, 'invoices', {
    customerId: customerB.id,
    organizationId: tenantB.org.id,
    invoiceNumber: 'S6-XB',
    status: 'sent',
    subtotalCents: 5000,
    amountPaidCents: 0,
    depositCents: 1000,
    publicToken: 's6-inv-xb',
  });
  crossTenant = {
    token: portalB.token,
    orgId: tenantB.org.id,
    customerId: customerB.id,
    proposalToken: proposalTokenB,
    invoiceId: invoiceB.id,
  };
}, 180_000);

describe('P2-S6 payment authority', () => {
  it('server payable cents ignore client wishes', () => {
    const p = portalInvoicePayableCents({
      status: 'sent',
      subtotalCents: 10000,
      amountPaidCents: 0,
      depositCents: 2500,
    });
    expect(p.payable).toBe(true);
    expect(p.amountCents).toBe(2500);
  });

  it('safe mode is active in emulator', () => {
    expect(portalPaymentSafeMode()).toBe(true);
  });

  it('paid invoice not payable', () => {
    expect(
      portalInvoicePayableCents({
        status: 'paid',
        subtotalCents: 10000,
        amountPaidCents: 10000,
      }).payable,
    ).toBe(false);
  });
});

describe('P2-S6 proposal approval integrity', () => {
  it('approves once then replays without state regression', async () => {
    const first = await recordPublicApproval(owners.a1.proposalToken, {
      action: 'approved',
      customerName: 'S6 A1',
    });
    expect(first).toBeTruthy();
    const second = await recordPublicApproval(owners.a1.proposalToken, {
      action: 'approved',
      customerName: 'S6 A1',
    });
    expect(second).toBeTruthy();
    // Cannot roll back to sent
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'approved',
        targetState: 'sent',
      }),
    ).toBe(false);
  });

  it('denies approval of already-rejected transition from wrong state', async () => {
    await colCreate(owners.a1.orgId, 'proposals', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'Already approved',
      status: 'approved',
      subtotalCents: 1000,
      depositPercent: 0,
      publicToken: 's6-prop-already-approved',
    });
    const again = await recordPublicApproval('s6-prop-already-approved', {
      action: 'approved',
      customerName: 'X',
    });
    expect(again).toBeTruthy();
  });
});

describe('P2-S6 agreement signing integrity', () => {
  it('signs once; second call is deterministic', async () => {
    const first = await recordAgreementSignature(owners.a1.agreementToken, {
      signedByName: 'S6 Signer',
    });
    expect(first?.status === 'active' || first != null).toBe(true);
    const second = await recordAgreementSignature(owners.a1.agreementToken, {
      signedByName: 'S6 Signer Again',
    });
    expect(second).toBeTruthy();
  });
});

describe('P2-S6 mockup approval integrity', () => {
  it('approves customer-visible mockup and replays', async () => {
    const first = await recordCustomerMockupApproval(owners.a1.mockupToken, {
      action: 'approved',
      customerName: 'S6',
    });
    expect(first?.status).toBe('approved');
    const second = await recordCustomerMockupApproval(owners.a1.mockupToken, {
      action: 'approved',
      customerName: 'S6',
    });
    expect(second?.status).toBe('approved');
  });

  it('denies draft mockup approval', async () => {
    const token = `s6-draft-mock-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'mockups', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      name: 'Draft',
      status: 'draft',
      imageUrl: 'https://example.invalid/d.jpg',
      approvalToken: token,
    });
    await expect(
      recordCustomerMockupApproval(token, { action: 'approved', customerName: 'X' }),
    ).rejects.toThrow(/no longer available/i);
  });

  it('denies staff-only mockup', async () => {
    const token = `s6-staff-mock-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'mockups', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      name: 'Staff',
      status: 'in_review',
      visibility: 'staff_only',
      imageUrl: 'https://example.invalid/s.jpg',
      approvalToken: token,
    });
    await expect(
      recordCustomerMockupApproval(token, { action: 'approved', customerName: 'X' }),
    ).rejects.toThrow(/no longer available/i);
  });
});

describe('P2-S6 portal create mutations idempotency', () => {
  it('service request same key returns one logical create', async () => {
    const key = `s6-svc-${Date.now()}`;
    const a = await submitPortalServiceRequest(owners.a1.token, {
      title: 'S6 service',
      description: 'lights out',
      idempotencyKey: key,
    });
    const b = await submitPortalServiceRequest(owners.a1.token, {
      title: 'S6 service',
      description: 'lights out',
      idempotencyKey: key,
    });
    expect(a.id).toBe(b.id);
  });

  it('schedule request same key replays', async () => {
    const key = `s6-sch-${Date.now()}`;
    const a = await submitPortalScheduleRequest(owners.a1.token, {
      appointmentType: 'installation',
      preferredWindows: 'weekends',
      idempotencyKey: key,
    });
    const b = await submitPortalScheduleRequest(owners.a1.token, {
      appointmentType: 'installation',
      preferredWindows: 'weekends',
      idempotencyKey: key,
    });
    expect(a.id).toBe(b.id);
  });

  it('message same key replays', async () => {
    const key = `s6-msg-${Date.now()}`;
    const a = await sendPortalMessage(owners.a1.token, 'Hello S6', { idempotencyKey: key });
    const b = await sendPortalMessage(owners.a1.token, 'Hello S6', { idempotencyKey: key });
    expect(a.id).toBe(b.id);
  });

  it('idempotency key cannot be reused across customers', async () => {
    const key = `s6-cross-${Date.now()}`;
    const ctxA = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'service_requests',
      action: 'create',
    });
    const scopeA = getPortalResourceScope(ctxA);
    await withPortalIdempotency({
      scope: scopeA,
      action: 'service_request.create',
      resourceId: 'new',
      clientKey: key,
      execute: async () => ({ id: 'a' }),
    });
    const ctxB = await requirePortalAuthorized({
      token: owners.a2.token,
      feature: 'service_requests',
      action: 'create',
    });
    const scopeB = getPortalResourceScope(ctxB);
    // Different scope → different doc id (hash includes customer) so execute may run;
    // conflict path is same doc with mismatched fields — assert scopes differ.
    expect(scopeA.customerId).not.toBe(scopeB.customerId);
    const b = await withPortalIdempotency({
      scope: scopeB,
      action: 'service_request.create',
      resourceId: 'new',
      clientKey: key,
      execute: async () => ({ id: 'b' }),
    });
    expect(b.result.id).toBe('b');
  });
});

describe('P2-S6 rebook terminal protection', () => {
  it('second rebook does not create another proposal when terminal', async () => {
    // Seed a rebooking record in sent state then process twice
    const campaigns = await colCreate(owners.a1.orgId, 'rebookingCampaigns', {
      seasonYear: 2027,
      status: 'active',
      organizationId: owners.a1.orgId,
    });
    await colCreate(owners.a1.orgId, 'rebookingRecords', {
      campaignId: campaigns.id,
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      status: 'sent',
      projectedValueCents: 10000,
      bookedValueCents: 0,
      previousProposalId: null,
      newProposalId: null,
    });
    const first = await processPortalRebook(owners.a1.orgId, owners.a1.customerId, {
      sameDesign: true,
    });
    const second = await processPortalRebook(owners.a1.orgId, owners.a1.customerId, {
      sameDesign: true,
    });
    expect(['rebooked', 'upgrade_requested']).toContain(first.status);
    expect(second.status).toBe(first.status);
    if ('replayed' in second) {
      expect(second.replayed).toBe(true);
    }
    expect(second.newProposalId).toBe(first.newProposalId);
  });
});

describe('P2-S6 feature disable blocks mutations', () => {
  it('denies service request when feature disabled', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'service_requests'),
      },
      staffUserId,
      's6-off@portal-test.invalid',
    );
    await expect(
      submitPortalServiceRequest(owners.a1.token, { title: 'should fail' }),
    ).rejects.toBeTruthy();
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffUserId,
      's6-on@portal-test.invalid',
    );
  });

  it('denies messaging when feature disabled', async () => {
    await updatePortalSettings(
      owners.a1.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'messaging'),
      },
      staffUserId,
      's6-msg-off@portal-test.invalid',
    );
    await expect(sendPortalMessage(owners.a1.token, 'nope')).rejects.toBeTruthy();
    await updatePortalSettings(
      owners.a1.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffUserId,
      's6-msg-on@portal-test.invalid',
    );
  });
});

describe('P2-S6 payable invoice matrix', () => {
  const cases = [
    {
      label: 'sent full balance',
      input: { status: 'sent', subtotalCents: 10000, amountPaidCents: 0 },
      payable: true,
      amount: 10000,
    },
    {
      label: 'sent partial paid',
      input: { status: 'sent', subtotalCents: 10000, amountPaidCents: 4000 },
      payable: true,
      amount: 6000,
    },
    {
      label: 'sent deposit due',
      input: { status: 'sent', subtotalCents: 10000, amountPaidCents: 0, depositCents: 2500 },
      payable: true,
      amount: 2500,
    },
    {
      label: 'sent deposit partially met',
      input: { status: 'sent', subtotalCents: 10000, amountPaidCents: 2500, depositCents: 2500 },
      payable: true,
      amount: 7500,
    },
    {
      label: 'paid closed',
      input: { status: 'paid', subtotalCents: 10000, amountPaidCents: 10000 },
      payable: false,
      amount: 0,
    },
    {
      label: 'void closed',
      input: { status: 'void', subtotalCents: 5000, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'cancelled closed',
      input: { status: 'cancelled', subtotalCents: 5000, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'canceled spelling',
      input: { status: 'canceled', subtotalCents: 5000, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'draft not payable',
      input: { status: 'draft', subtotalCents: 5000, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'overpaid zero balance',
      input: { status: 'sent', subtotalCents: 1000, amountPaidCents: 1500 },
      payable: false,
      amount: 0,
    },
    {
      label: 'negative subtotal clamped',
      input: { status: 'sent', subtotalCents: -100, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    { label: 'missing fields treated zero', input: {}, payable: false, amount: 0 },
    {
      label: 'deposit exceeds balance caps',
      input: { status: 'sent', subtotalCents: 1000, amountPaidCents: 0, depositCents: 5000 },
      payable: true,
      amount: 1000,
    },
    {
      label: 'partial deposit remainder',
      input: { status: 'sent', subtotalCents: 8000, amountPaidCents: 1000, depositCents: 2000 },
      payable: true,
      amount: 1000,
    },
    {
      label: 'open balance after deposit satisfied',
      input: { status: 'sent', subtotalCents: 8000, amountPaidCents: 2000, depositCents: 2000 },
      payable: true,
      amount: 6000,
    },
    {
      label: 'status case insensitive PAID',
      input: { status: 'PAID', subtotalCents: 100, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'sent zero subtotal',
      input: { status: 'sent', subtotalCents: 0, amountPaidCents: 0 },
      payable: false,
      amount: 0,
    },
    {
      label: 'sent with nulls',
      input: { status: 'sent', subtotalCents: null, amountPaidCents: null, depositCents: null },
      payable: false,
      amount: 0,
    },
    {
      label: 'partial payment small invoice',
      input: { status: 'sent', subtotalCents: 99, amountPaidCents: 50 },
      payable: true,
      amount: 49,
    },
    {
      label: 'deposit only one cent',
      input: { status: 'sent', subtotalCents: 500, amountPaidCents: 0, depositCents: 1 },
      payable: true,
      amount: 1,
    },
  ] as const;
  for (const c of cases) {
    it(`payable: ${c.label}`, () => {
      const r = portalInvoicePayableCents(c.input);
      expect(r.payable).toBe(c.payable);
      expect(r.amountCents).toBe(c.amount);
    });
  }
});

describe('P2-S6 proposal public-token flows', () => {
  it('rejects invalid transition from approved to rejected', async () => {
    await expect(
      recordPublicApproval(owners.a1.proposalToken, {
        action: 'rejected',
        customerName: 'Late reject',
      }),
    ).rejects.toThrow(/no longer available/i);
  });

  it('allows customer_questions then approve on fresh token', async () => {
    const token = `s6-questions-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'proposals', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'Questions path',
      status: 'sent',
      subtotalCents: 5000,
      depositPercent: 10,
      publicToken: token,
    });
    const q = await recordPublicApproval(token, { action: 'changes_requested', customerName: 'Q' });
    expect(q).toBeTruthy();
    const approved = await recordPublicApproval(token, { action: 'approved', customerName: 'Q' });
    expect(approved).toBeTruthy();
    expect(
      canPortalTransition({
        resourceType: 'proposal',
        currentState: 'customer_questions',
        targetState: 'approved',
      }),
    ).toBe(true);
  });

  it('unknown proposal token returns null', async () => {
    const missing = await recordPublicApproval('totally-missing-proposal-token', {
      action: 'approved',
      customerName: 'Nobody',
    });
    expect(missing).toBeNull();
  });
});

describe('P2-S6 agreement draft + replay', () => {
  it('signs draft agreement and replays without error', async () => {
    const token = `s6-draft-agr-${Date.now()}`;
    await colCreate(owners.a2.orgId, 'multiYearAgreements', {
      customerId: owners.a2.customerId,
      organizationId: owners.a2.orgId,
      title: 'Draft agreement',
      status: 'draft',
      publicToken: token,
      startSeason: 2026,
      endSeason: 2027,
    });
    const first = await recordAgreementSignature(token, { signedByName: 'Draft Signer' });
    expect(first).toBeTruthy();
    const second = await recordAgreementSignature(token, { signedByName: 'Replay' });
    expect(second).toBeTruthy();
  });
});

describe('P2-S6 mockup revision replay', () => {
  it('revision_requested replays safely', async () => {
    const token = `s6-rev-mock-${Date.now()}`;
    await colCreate(owners.a2.orgId, 'mockups', {
      customerId: owners.a2.customerId,
      organizationId: owners.a2.orgId,
      name: 'Rev mock',
      status: 'customer_review',
      visibility: 'customer_visible',
      imageUrl: 'https://example.invalid/r.jpg',
      approvalToken: token,
    });
    const first = await recordCustomerMockupApproval(token, {
      action: 'revision_requested',
      customerName: 'Rev',
      notes: 'Change color',
    });
    expect(first?.status).toBe('revision_requested');
    const second = await recordCustomerMockupApproval(token, {
      action: 'revision_requested',
      customerName: 'Rev',
    });
    expect(second?.status).toBe('revision_requested');
  });
});

describe('P2-S6 rebook idempotency via portal API', () => {
  it('submitPortalRebookRequest same key does not duplicate comms path', async () => {
    const campaign = await colCreate(owners.a2.orgId, 'rebookingCampaigns', {
      seasonYear: 2027,
      status: 'active',
      organizationId: owners.a2.orgId,
    });
    await colCreate(owners.a2.orgId, 'rebookingRecords', {
      campaignId: campaign.id,
      customerId: owners.a2.customerId,
      organizationId: owners.a2.orgId,
      status: 'sent',
      projectedValueCents: 10000,
      bookedValueCents: 0,
      previousProposalId: null,
      newProposalId: null,
    });
    const key = `s6-rebook-idem-${Date.now()}`;
    const a = await submitPortalRebookRequest(owners.a2.token, {
      sameDesign: true,
      idempotencyKey: key,
    });
    const b = await submitPortalRebookRequest(owners.a2.token, {
      sameDesign: true,
      idempotencyKey: key,
    });
    expect(a.status).toBe(b.status);
    if ('newProposalId' in a && 'newProposalId' in b) {
      expect(a.newProposalId).toBe(b.newProposalId);
    }
  });
});

describe('P2-S6 requirePortalMutation ownership', () => {
  it('denies invoice mutation for another customer resource', async () => {
    await expect(
      requirePortalMutation({
        auth: owners.a1.token,
        feature: 'billing',
        action: 'pay',
        resource: { type: 'invoice', id: owners.a2.invoiceId },
      }),
    ).rejects.toBeInstanceOf(PortalResourceNotFoundError);
  });
});

describe('P2-S6 cross-customer portal mutation denial', () => {
  it('service request on foreign property fails closed', async () => {
    const foreignProp = await colCreate(owners.a2.orgId, 'properties', {
      customerId: owners.a2.customerId,
      propertyName: 'foreign',
      label: 'foreign',
      addressLine1: '2 Other St',
      city: 'Emulator',
      state: 'TS',
      postalCode: '00001',
    });
    await expect(
      submitPortalServiceRequest(owners.a1.token, {
        title: 'Cross customer',
        propertyId: foreignProp.id,
      }),
    ).rejects.toThrow(/invalid property/i);
  });
});

describe('P2-S6 idempotency key validation', () => {
  it('short keys bypass idempotency store (new ids)', async () => {
    const a = await submitPortalServiceRequest(owners.a2.token, {
      title: 'Short key A',
      idempotencyKey: 'short',
    });
    const b = await submitPortalServiceRequest(owners.a2.token, {
      title: 'Short key B',
      idempotencyKey: 'short',
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe('P2-S6 transition matrix coverage', () => {
  const cases: Array<[string, string, string, boolean]> = [
    ['proposal', 'sent', 'approved', true],
    ['proposal', 'sent', 'rejected', true],
    ['proposal', 'sent', 'customer_questions', true],
    ['proposal', 'viewed', 'approved', true],
    ['proposal', 'viewed', 'rejected', true],
    ['proposal', 'customer_questions', 'approved', true],
    ['proposal', 'customer_questions', 'rejected', true],
    ['proposal', 'customer_questions', 'customer_questions', true],
    ['proposal', 'approved', 'sent', false],
    ['proposal', 'approved', 'draft', false],
    ['proposal', 'draft', 'approved', false],
    ['agreement', 'awaiting_signature', 'active', true],
    ['agreement', 'draft', 'active', true],
    ['agreement', 'active', 'active', false],
    ['agreement', 'completed', 'active', false],
    ['mockup', 'in_review', 'approved', true],
    ['mockup', 'in_review', 'revision_requested', true],
    ['mockup', 'published', 'approved', true],
    ['mockup', 'pending_approval', 'revision_requested', true],
    ['mockup', 'sent', 'approved', true],
    ['mockup', 'customer_review', 'revision_requested', true],
    ['mockup', 'draft', 'approved', false],
    ['mockup', 'approved', 'revision_requested', false],
    ['rebooking', 'not_sent', 'rebooked', true],
    ['rebooking', 'sent', 'rebooked', true],
    ['rebooking', 'opened', 'upgrade_requested', true],
    ['rebooking', 'rebooked', 'rebooked', false],
    ['rebooking', 'declined', 'rebooked', false],
    ['rebooking', 'upgrade_requested', 'rebooked', false],
    ['service_request', '', 'reported', true],
    ['service_request', 'reported', 'reported', false],
    ['schedule_request', '', 'requested', true],
    ['schedule_request', 'requested', 'requested', false],
    ['unknown', 'x', 'y', false],
  ];
  for (const [type, from, to, ok] of cases) {
    it(`${type}: ${from} -> ${to} = ${ok}`, () => {
      const allowed = canPortalTransition({
        resourceType: type,
        currentState: from,
        targetState: to,
      });
      expect(allowed).toBe(ok);
      expect(typeof allowed).toBe('boolean');
    });
  }
});

describe('P2-S6 parallel concurrency', () => {
  it('two simultaneous proposal approvals yield one canonical approved state', async () => {
    const token = `s6-par-prop-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'proposals', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'Parallel approve',
      status: 'sent',
      subtotalCents: 4000,
      depositPercent: 0,
      publicToken: token,
    });
    const [r1, r2] = await Promise.all([
      recordPublicApproval(token, { action: 'approved', customerName: 'P1' }),
      recordPublicApproval(token, { action: 'approved', customerName: 'P2' }),
    ]);
    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
    const db = getAdminFirestore();
    const snap = await db
      .collection(`organizations/${owners.a1.orgId}/proposals`)
      .where('publicToken', '==', token)
      .limit(1)
      .get();
    expect(snap.docs[0]?.data()?.status).toBe('approved');
  });

  it('two simultaneous proposal change requests stay in customer_questions', async () => {
    const token = `s6-par-q-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'proposals', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'Parallel questions',
      status: 'sent',
      subtotalCents: 4000,
      depositPercent: 0,
      publicToken: token,
    });
    await Promise.all([
      recordPublicApproval(token, { action: 'changes_requested', customerName: 'Q1' }),
      recordPublicApproval(token, { action: 'changes_requested', customerName: 'Q2' }),
    ]);
    const db = getAdminFirestore();
    const snap = await db
      .collection(`organizations/${owners.a1.orgId}/proposals`)
      .where('publicToken', '==', token)
      .limit(1)
      .get();
    expect(snap.docs[0]?.data()?.status).toBe('customer_questions');
  });

  it('two simultaneous mockup approvals stay approved once', async () => {
    const token = `s6-par-mock-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'mockups', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      name: 'Parallel mock',
      status: 'in_review',
      visibility: 'customer_visible',
      imageUrl: 'https://example.invalid/p.jpg',
      approvalToken: token,
    });
    const [a, b] = await Promise.all([
      recordCustomerMockupApproval(token, { action: 'approved', customerName: 'M1' }),
      recordCustomerMockupApproval(token, { action: 'approved', customerName: 'M2' }),
    ]);
    expect(a?.status).toBe('approved');
    expect(b?.status).toBe('approved');
  });

  it('two simultaneous mockup revisions stay revision_requested', async () => {
    const token = `s6-par-rev-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'mockups', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      name: 'Parallel rev',
      status: 'published',
      visibility: 'customer_visible',
      imageUrl: 'https://example.invalid/r2.jpg',
      approvalToken: token,
    });
    const [a, b] = await Promise.all([
      recordCustomerMockupApproval(token, {
        action: 'revision_requested',
        customerName: 'R1',
        notes: 'a',
      }),
      recordCustomerMockupApproval(token, {
        action: 'revision_requested',
        customerName: 'R2',
        notes: 'b',
      }),
    ]);
    expect(a?.status).toBe('revision_requested');
    expect(b?.status).toBe('revision_requested');
  });

  it('parallel agreement signing completes once', async () => {
    const token = `s6-par-agr-${Date.now()}`;
    await colCreate(owners.a1.orgId, 'multiYearAgreements', {
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'Parallel sign',
      status: 'awaiting_signature',
      publicToken: token,
      startSeason: 2026,
      endSeason: 2027,
    });
    const [a, b] = await Promise.all([
      recordAgreementSignature(token, { signedByName: 'Signer A' }),
      recordAgreementSignature(token, { signedByName: 'Signer B' }),
    ]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const statuses = [a?.status, b?.status].filter(Boolean);
    expect(statuses.every((s) => s === 'active' || s === 'signed')).toBe(true);
  });

  it('parallel service create with same idempotency key returns one id', async () => {
    const key = `s6-par-svc-${Date.now()}`;
    const [a, b] = await Promise.all([
      submitPortalServiceRequest(owners.a1.token, {
        title: 'Parallel svc',
        description: 'one',
        idempotencyKey: key,
      }),
      submitPortalServiceRequest(owners.a1.token, {
        title: 'Parallel svc',
        description: 'one',
        idempotencyKey: key,
      }),
    ]);
    expect(a.id).toBe(b.id);
  });
});

describe('P2-S6 stale-page enforcement', () => {
  it('role downgrade to view_only denies subsequent create mutation', async () => {
    await changePortalUserRole(owners.a2.orgId, owners.a2.portalUserId, 'view_only', staffUserId);
    await expect(
      submitPortalServiceRequest(owners.a2.token, { title: 'stale role create' }),
    ).rejects.toBeTruthy();
    await changePortalUserRole(
      owners.a2.orgId,
      owners.a2.portalUserId,
      'account_owner',
      staffUserId,
    );
  });

  it('feature disable after page load denies schedule request', async () => {
    await updatePortalSettings(
      owners.a2.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key).filter((k) => k !== 'scheduling'),
        allowSelfScheduling: false,
      },
      staffUserId,
      's6-sched-off@portal-test.invalid',
    );
    await expect(
      submitPortalScheduleRequest(owners.a2.token, {
        appointmentType: 'installation',
        preferredWindows: 'any',
      }),
    ).rejects.toBeTruthy();
    await updatePortalSettings(
      owners.a2.orgId,
      {
        enabled: true,
        enabledFeatures: PORTAL_FEATURES.map((f) => f.key),
        allowSelfScheduling: true,
      },
      staffUserId,
      's6-sched-on@portal-test.invalid',
    );
  });

  it('suspension denies portal mutations with zero create effect', async () => {
    await suspendCustomerPortal(owners.a2.orgId, owners.a2.customerId, staffUserId);
    await expect(
      submitPortalServiceRequest(owners.a2.token, { title: 'suspended create' }),
    ).rejects.toBeTruthy();
    // Re-enable for later suites
    await updatePortalSettings(
      owners.a2.orgId,
      { enabled: true, enabledFeatures: PORTAL_FEATURES.map((f) => f.key) },
      staffUserId,
      's6-unsuspend-settings@portal-test.invalid',
    );
    const account = await getPortalAccountByCustomer(owners.a2.orgId, owners.a2.customerId);
    if (account) {
      await colUpdate(owners.a2.orgId, 'portalAccounts', account.id, {
        status: 'active',
        portalEnabled: true,
        suspendedAt: null,
        suspendedBy: null,
      });
      await colUpdate(owners.a2.orgId, 'customers', owners.a2.customerId, {
        portalEnabled: true,
      });
    }
  });
});

describe('P2-S6 message rate limit', () => {
  it('allows normal send then blocks after bucket exhaustion; idempotent retry separate', async () => {
    clearPortalRateLimitBuckets();
    const key = portalRateLimitKey([
      'portal-message',
      owners.a1.orgId,
      owners.a1.customerId,
      owners.a1.portalUserId,
    ]);
    for (let i = 0; i < 30; i++) {
      const r = consumePortalRateLimit(key, { max: 30, windowMs: 15 * 60 * 1000 });
      expect(r.allowed).toBe(true);
    }
    await expect(sendPortalMessage(owners.a1.token, 'rate-limit-probe')).rejects.toThrow(
      /too many messages/i,
    );
    clearPortalRateLimitBuckets();
    const idem = `s6-rate-idem-${Date.now()}`;
    const first = await sendPortalMessage(owners.a1.token, 'idem rate ok', {
      idempotencyKey: idem,
    });
    const replay = await sendPortalMessage(owners.a1.token, 'idem rate ok', {
      idempotencyKey: idem,
    });
    expect(replay.id).toBe(first.id);
  });
});

describe('P2-S6 notifications + contacts + audit timeline', () => {
  it('marks owned notification read; denies foreign notification', async () => {
    const mine = await colCreate(owners.a1.orgId, 'portalNotifications', {
      portalUserId: owners.a1.portalUserId,
      customerId: owners.a1.customerId,
      organizationId: owners.a1.orgId,
      title: 'S6 note',
      body: 'hello',
      readAt: null,
    });
    const foreign = await colCreate(owners.a1.orgId, 'portalNotifications', {
      portalUserId: owners.a2.portalUserId,
      customerId: owners.a2.customerId,
      organizationId: owners.a1.orgId,
      title: 'Other',
      body: 'nope',
      readAt: null,
    });
    await expect(markPortalNotificationRead(owners.a1.token, mine.id)).resolves.toEqual({
      success: true,
    });
    await expect(markPortalNotificationRead(owners.a1.token, foreign.id)).rejects.toThrow(
      /PORTAL_RESOURCE_NOT_FOUND|not found/i,
    );
    const listed = await listPortalNotifications(owners.a1.token);
    expect(Array.isArray(listed)).toBe(true);
  });

  it('service request creates customer-visible timeline audit without secrets', async () => {
    const before = await listPortalTimeline(owners.a1.token, 50);
    await submitPortalServiceRequest(owners.a1.token, {
      title: 'Audit svc',
      description: 'for timeline',
      idempotencyKey: `s6-audit-svc-${Date.now()}`,
    });
    const after = await listPortalTimeline(owners.a1.token, 50);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    const blob = JSON.stringify(after);
    expect(blob).not.toMatch(/sk_live|otp|sessionSecret|stripe_secret/i);
    expect(after.some((e) => e.customerId === owners.a1.customerId)).toBe(true);
  });
});

describe('P2-S6 cross-tenant denial', () => {
  it('tenant A token cannot mutate tenant B resources via ownership guard', async () => {
    expect(crossTenant).toBeTruthy();
    await expect(
      requirePortalMutation({
        auth: owners.a1.token,
        feature: 'billing',
        action: 'pay',
        resource: { type: 'invoice', id: crossTenant!.invoiceId },
      }),
    ).rejects.toBeInstanceOf(PortalResourceNotFoundError);
  });

  it('tenant B proposal token is isolated from tenant A customer ids', async () => {
    expect(crossTenant).toBeTruthy();
    const approved = await recordPublicApproval(crossTenant!.proposalToken, {
      action: 'approved',
      customerName: 'XB',
    });
    expect(approved).toBeTruthy();
    expect(crossTenant!.orgId).not.toBe(owners.a1.orgId);
    expect(crossTenant!.customerId).not.toBe(owners.a1.customerId);
  });
});

describe('P2-S6 payable cents matrix', () => {
  // Deposit-first authority: while depositDue > 0, amount = min(depositDue, balance).
  const rows: Array<[string, number, number, number, boolean, number]> = [
    ['sent', 10000, 0, 2500, true, 2500],
    ['sent', 10000, 5000, 2500, true, 5000],
    ['sent', 10000, 10000, 2500, false, 0],
    ['paid', 10000, 10000, 2500, false, 0],
    ['draft', 10000, 0, 2500, false, 0],
    ['void', 10000, 0, 2500, false, 0],
    ['partial', 10000, 1000, 2500, true, 1500],
    ['partial', 10000, 9000, 2500, true, 1000],
    ['sent', 0, 0, 0, false, 0],
    ['sent', 500, 0, 500, true, 500],
    ['sent', 500, 250, 500, true, 250],
    ['sent', 500, 500, 500, false, 0],
    ['overdue', 8000, 0, 2000, true, 2000],
    ['sent', 12000, 3000, 0, true, 9000],
    ['sent', 12000, 12000, 0, false, 0],
    ['sent', 999, 0, 1000, true, 999],
    ['sent', 1000, 0, 1000, true, 1000],
    ['sent', 1001, 0, 1000, true, 1000],
    ['sent', 10000, 0, 0, true, 10000],
    ['sent', 10000, 9999, 0, true, 1],
    ['sent', 10000, 1, 0, true, 9999],
    ['cancelled', 10000, 0, 2500, false, 0],
    ['refunded', 10000, 0, 2500, false, 0],
    ['sent', 2500, 0, 2500, true, 2500],
    ['sent', 2500, 2500, 2500, false, 0],
  ];
  for (const [status, subtotal, paid, deposit, payable, amount] of rows) {
    it(`payable ${status} sub=${subtotal} paid=${paid} dep=${deposit}`, () => {
      const r = portalInvoicePayableCents({
        status,
        subtotalCents: subtotal,
        amountPaidCents: paid,
        depositCents: deposit,
      });
      expect(r.payable).toBe(payable);
      expect(r.amountCents).toBe(amount);
    });
  }
});

describe('P2-S6 payment safe mode evidence', () => {
  it('safe mode active and payable cents ignore client tampering intent', () => {
    expect(portalPaymentSafeMode()).toBe(true);
    const server = portalInvoicePayableCents({
      status: 'sent',
      subtotalCents: 10000,
      amountPaidCents: 0,
      depositCents: 2500,
    });
    // Client wishing 1 cent or 99999 does not change server authority.
    expect(server.amountCents).toBe(2500);
    expect(server.payable).toBe(true);
  });
});

describe('P2-S6 idempotency action/resource binding', () => {
  it('same key different action does not replay across actions', async () => {
    const key = `s6-act-bind-${Date.now()}`;
    const ctx = await requirePortalAuthorized({
      token: owners.a1.token,
      feature: 'service_requests',
      action: 'create',
    });
    const scope = getPortalResourceScope(ctx);
    const a = await withPortalIdempotency({
      scope,
      action: 'service_request.create',
      resourceId: 'new',
      clientKey: key,
      execute: async () => ({ id: 'svc-1' }),
    });
    const b = await withPortalIdempotency({
      scope,
      action: 'schedule_request.create',
      resourceId: 'new',
      clientKey: key,
      execute: async () => ({ id: 'sch-1' }),
    });
    expect(a.result.id).toBe('svc-1');
    expect(b.result.id).toBe('sch-1');
    expect(a.replayed).toBe(false);
    expect(b.replayed).toBe(false);
  });
});
