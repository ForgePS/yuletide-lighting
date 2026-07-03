import { nanoid } from 'nanoid';
import type { CustomerPortalSettings } from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colGet, colList, colUpdate, getOrganization, type CustomerRecord } from './firestore';
import { getBrandingForCustomerFacing, getPortalSettings } from './settings360';
import { createServiceIssue360 } from './service-issues';
import { listCalendarEvents } from './schedule360';
import { logCustomerActivity, createCommunication } from './customer360';
import { processPortalRebook, getPortalRebookContext } from './rebooking360';

export type PortalCustomerContext = {
  organizationId: string;
  customer: CustomerRecord;
  organization: Awaited<ReturnType<typeof getOrganization>>;
  settings: CustomerPortalSettings;
};

export type PortalDashboard = PortalCustomerContext & {
  proposals: Array<{
    id: string;
    title: string;
    status: string;
    subtotalCents: number;
    publicToken?: string | null;
    installDate?: Date | null;
    removalDate?: Date | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    subtotalCents: number;
    amountPaidCents: number;
    publicToken?: string | null;
    dueDate?: Date | null;
  }>;
  schedule: Array<{
    id: string;
    title: string;
    appointmentType: string;
    startAt: Date;
    endAt: Date;
    propertyAddress?: string | null;
    dispatchStatus: string;
  }>;
  mockups: Array<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null; status?: string; approvalToken?: string | null }>;
  jobs: Array<{
    id: string;
    title: string;
    stage: string;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
  }>;
  properties: Array<{ id: string; label: string; addressLine1: string; city: string; state: string }>;
};

function portalAccessUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
  return `${base.replace(/\/$/, '')}/portal/${token}`;
}

export function buildPortalAccessUrl(token: string) {
  return portalAccessUrl(token);
}

export async function getCustomerByPortalToken(token: string): Promise<PortalCustomerContext | null> {
  const db = getAdminFirestore();
  const snap = await db.collectionGroup('customers').where('portalToken', '==', token).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0]!;
  const customer = mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as CustomerRecord;
  const orgId = String(customer.organizationId ?? doc.ref.parent.parent?.id ?? '');
  if (!orgId || !customer.portalEnabled) return null;

  const [organization, settings, branding] = await Promise.all([
    getOrganization(orgId),
    getPortalSettings(orgId),
    getBrandingForCustomerFacing(orgId),
  ]);
  if (!settings.enabled) return null;

  return {
    organizationId: orgId,
    customer,
    organization: organization
      ? { ...organization, companyName: branding.companyName, brandColor: branding.brandColor, logoUrl: branding.logoUrl }
      : null,
    settings,
  };
}

export async function ensureCustomerPortalToken(orgId: string, customerId: string): Promise<string> {
  const customer = await colGet<CustomerRecord>(orgId, 'customers', customerId);
  if (!customer) throw new Error('Customer not found');
  if (customer.portalToken) return customer.portalToken;
  const token = nanoid(32);
  await colUpdate(orgId, 'customers', customerId, { portalToken: token });
  return token;
}

export async function enableCustomerPortal(
  orgId: string,
  customerId: string,
  userId?: string | null,
): Promise<{ token: string; accessUrl: string }> {
  const token = await ensureCustomerPortalToken(orgId, customerId);
  const now = new Date();
  await colUpdate(orgId, 'customers', customerId, {
    portalEnabled: true,
    portalInviteSentAt: now,
  });
  await logCustomerActivity(orgId, customerId, 'email_sent', 'Customer portal access enabled', userId, 'System');
  return { token, accessUrl: portalAccessUrl(token) };
}

export async function recordPortalLogin(orgId: string, customerId: string) {
  await colUpdate(orgId, 'customers', customerId, { portalLastLoginAt: new Date() });
}

export async function getPortalDashboard(token: string): Promise<PortalDashboard | null> {
  const ctx = await getCustomerByPortalToken(token);
  if (!ctx) return null;

  const { organizationId, customer, organization, settings } = ctx;
  await recordPortalLogin(organizationId, customer.id);

  const [allProposals, allInvoices, events, allJobs, allMockups, properties] = await Promise.all([
    colList<Record<string, unknown>>(organizationId, 'proposals'),
    colList<Record<string, unknown>>(organizationId, 'invoices'),
    listCalendarEvents(organizationId),
    colList<Record<string, unknown>>(organizationId, 'jobs'),
    colList<{ id: string; name: string; imageUrl: string; renderedImageUrl?: string | null; customerId?: string; status?: string; approvalToken?: string | null }>(organizationId, 'mockups'),
    colList<{ id: string; customerId?: string; label?: string; addressLine1?: string; city?: string; state?: string }>(organizationId, 'properties'),
  ]);

  const proposals = allProposals
    .filter((p) => p.customerId === customer.id)
    .map((p) => ({
      id: String(p.id),
      title: String(p.title ?? 'Proposal'),
      status: String(p.status ?? 'draft'),
      subtotalCents: Number(p.subtotalCents ?? 0),
      publicToken: (p.publicToken as string) ?? null,
      installDate: p.installDate instanceof Date ? p.installDate : p.installDate ? new Date(String(p.installDate)) : null,
      removalDate: p.removalDate instanceof Date ? p.removalDate : p.removalDate ? new Date(String(p.removalDate)) : null,
    }))
    .sort((a, b) => b.subtotalCents - a.subtotalCents);

  const invoices = allInvoices
    .filter((i) => i.customerId === customer.id)
    .map((i) => ({
      id: String(i.id),
      invoiceNumber: String(i.invoiceNumber ?? i.id),
      status: String(i.status ?? 'draft'),
      subtotalCents: Number(i.subtotalCents ?? 0),
      amountPaidCents: Number(i.amountPaidCents ?? 0),
      publicToken: (i.publicToken as string) ?? null,
      dueDate: i.dueDate instanceof Date ? i.dueDate : i.dueDate ? new Date(String(i.dueDate)) : null,
    }));

  const schedule = events
    .filter((e) => e.customerId === customer.id && e.startAt >= new Date(Date.now() - 86400000))
    .map((e) => ({
      id: e.id,
      title: e.title,
      appointmentType: e.appointmentType,
      startAt: e.startAt,
      endAt: e.endAt,
      propertyAddress: e.propertyAddress,
      dispatchStatus: e.dispatchStatus,
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const jobs = allJobs
    .filter((j) => j.customerId === customer.id)
    .map((j) => ({
      id: String(j.id),
      title: String(j.title ?? 'Job'),
      stage: String(j.stage ?? 'draft_proposal'),
      scheduledStart: j.scheduledStart instanceof Date ? j.scheduledStart : j.scheduledStart ? new Date(String(j.scheduledStart)) : null,
      scheduledEnd: j.scheduledEnd instanceof Date ? j.scheduledEnd : j.scheduledEnd ? new Date(String(j.scheduledEnd)) : null,
    }));

  const customerProposalIds = new Set(proposals.map((p) => p.id));
  const proposalMockupIds = new Set(
    allProposals
      .filter((p) => customerProposalIds.has(String(p.id)))
      .flatMap((p) => (Array.isArray(p.mockupIds) ? p.mockupIds : []) as string[]),
  );

  const mockups = allMockups
    .filter((m) => m.customerId === customer.id || proposalMockupIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.name,
      imageUrl: m.imageUrl,
      renderedImageUrl: m.renderedImageUrl ?? null,
      status: m.status,
      approvalToken: m.approvalToken ?? null,
    }));

  return {
    organizationId,
    customer,
    organization,
    settings,
    proposals: settings.permissions.viewProposals ? proposals : [],
    invoices: settings.permissions.viewInvoices ? invoices : [],
    schedule,
    mockups: settings.permissions.approveDesigns ? mockups : [],
    jobs,
    properties: properties
      .filter((p) => p.customerId === customer.id)
      .map((p) => ({
        id: p.id,
        label: String(p.label ?? p.addressLine1 ?? 'Property'),
        addressLine1: String(p.addressLine1 ?? ''),
        city: String(p.city ?? ''),
        state: String(p.state ?? ''),
      })),
  };
}

export async function submitPortalServiceRequest(
  token: string,
  input: { title: string; description?: string; category?: string; propertyId?: string },
) {
  const ctx = await getCustomerByPortalToken(token);
  if (!ctx) throw new Error('Invalid portal access');
  if (!ctx.settings.allowServiceRequests || !ctx.settings.permissions.requestService) {
    throw new Error('Service requests are not enabled');
  }

  const customerName = ctx.customer.businessName
    || `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim()
    || 'Customer';

  let propertyLabel: string | undefined;
  if (input.propertyId) {
    const prop = await colGet<{ label?: string; addressLine1?: string }>(ctx.organizationId, 'properties', input.propertyId);
    propertyLabel = prop?.label ?? prop?.addressLine1 ?? undefined;
  }

  const issue = await createServiceIssue360(ctx.organizationId, {
    customerId: ctx.customer.id,
    customerName,
    propertyId: input.propertyId ?? '',
    propertyLabel: propertyLabel ?? '',
    title: input.title,
    description: input.description ?? '',
    category: (input.category as import('@clcrm/types').ServiceIssueCategory) ?? 'customer_request',
    priority: 'normal',
    status: 'reported',
    warranty: false,
    photoUrls: [],
    source: 'portal',
  });

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: input.title,
    body: input.description ?? input.title,
    employeeId: null,
    employeeName: null,
    occurredAt: new Date(),
    followUpRequired: true,
    followUpDate: null,
    relatedPropertyId: input.propertyId ?? null,
    relatedJobId: null,
    relatedQuoteId: null,
  });

  return issue;
}

export async function submitPortalRebookRequest(
  token: string,
  input: { notes?: string; preferredMonth?: string; sameDesign?: boolean; upgradeRequested?: boolean },
) {
  const ctx = await getCustomerByPortalToken(token);
  if (!ctx) throw new Error('Invalid portal access');

  const result = await processPortalRebook(ctx.organizationId, ctx.customer.id, {
    sameDesign: input.sameDesign ?? true,
    upgradeRequested: input.upgradeRequested ?? false,
    preferredMonth: input.preferredMonth,
    notes: input.notes,
  });

  const body = [
    input.upgradeRequested ? 'Customer requested upgrade for next season.' : 'Customer rebooked same design for next season.',
    input.preferredMonth ? `Preferred month: ${input.preferredMonth}` : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter(Boolean).join('\n');

  await createCommunication(ctx.organizationId, ctx.customer.id, {
    type: 'portal_message',
    direction: 'inbound',
    subject: input.upgradeRequested ? 'Upgrade request — next season' : 'Rebook request — next season',
    body,
    employeeId: null,
    employeeName: null,
    occurredAt: new Date(),
    followUpRequired: true,
    followUpDate: null,
    relatedPropertyId: null,
    relatedJobId: null,
    relatedQuoteId: result.newProposalId,
  });
  await logCustomerActivity(ctx.organizationId, ctx.customer.id, 'note_added', 'Rebook submitted via portal', null, 'Portal');

  return { success: true, ...result };
}

export async function getPortalRebookInfo(token: string) {
  const ctx = await getCustomerByPortalToken(token);
  if (!ctx) return null;
  const rebook = await getPortalRebookContext(ctx.organizationId, ctx.customer.id);
  return { ...rebook, customerName: ctx.customer.businessName || `${ctx.customer.firstName ?? ''} ${ctx.customer.lastName ?? ''}`.trim() };
}
