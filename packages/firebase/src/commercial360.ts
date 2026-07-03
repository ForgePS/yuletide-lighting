import { nanoid } from 'nanoid';
import type {
  CommercialAccount,
  CommercialAccountDetail,
  CommercialAccountListItem,
  CommercialContract,
  CommercialDashboard,
  CommercialLocation,
  ProposalLineItem,
  ProposalRecord,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { colCreate, colGet, colList, colUpdate } from './firestore';
import { createProperty, createCustomer } from './firestore';
import { createProposal360, getProposal360 } from './proposals';
import { mapTimestampsFromData } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function accountPath(orgId: string, accountId: string) {
  return `organizations/${orgId}/commercialAccounts/${accountId}`;
}

function locationsPath(orgId: string, accountId: string) {
  return `${accountPath(orgId, accountId)}/locations`;
}

function contractsPath(orgId: string, accountId: string) {
  return `${accountPath(orgId, accountId)}/contracts`;
}

const COMMERCIAL_CUSTOMER_TYPES = new Set(['commercial', 'hoa', 'municipal', 'church', 'school']);

function normalizeAccount(raw: Record<string, unknown>, orgId: string, accountId: string): CommercialAccount {
  return {
    id: accountId,
    organizationId: orgId,
    name: String(raw.name ?? ''),
    customerId: (raw.customerId as string) ?? null,
    billingContactId: (raw.billingContactId as string) ?? null,
    accountManagerId: (raw.accountManagerId as string) ?? null,
    accountManagerName: (raw.accountManagerName as string) ?? null,
    billingAddress: (raw.billingAddress as string) ?? null,
    notes: (raw.notes as string) ?? null,
    status: (raw.status as CommercialAccount['status']) ?? 'prospect',
    siteMapUrl: (raw.siteMapUrl as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

function normalizeLocation(raw: Record<string, unknown>, accountId: string, locationId: string): CommercialLocation {
  return {
    id: locationId,
    commercialAccountId: accountId,
    name: String(raw.name ?? ''),
    addressLine1: String(raw.addressLine1 ?? ''),
    addressLine2: (raw.addressLine2 as string) ?? null,
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    postalCode: String(raw.postalCode ?? ''),
    siteContactName: (raw.siteContactName as string) ?? null,
    siteContactPhone: (raw.siteContactPhone as string) ?? null,
    siteNotes: (raw.siteNotes as string) ?? null,
    propertyId: (raw.propertyId as string) ?? null,
    mockupIds: Array.isArray(raw.mockupIds) ? (raw.mockupIds as string[]) : [],
    photoUrls: Array.isArray(raw.photoUrls) ? (raw.photoUrls as string[]) : [],
    maintenanceScheduleNotes: (raw.maintenanceScheduleNotes as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

function normalizeContract(raw: Record<string, unknown>, accountId: string, contractId: string): CommercialContract {
  return {
    id: contractId,
    commercialAccountId: accountId,
    name: String(raw.name ?? ''),
    startDate: raw.startDate instanceof Date ? raw.startDate : new Date(String(raw.startDate)),
    endDate: raw.endDate instanceof Date ? raw.endDate : new Date(String(raw.endDate)),
    renewalDate:
      raw.renewalDate instanceof Date ? raw.renewalDate : raw.renewalDate ? new Date(String(raw.renewalDate)) : null,
    amountCents: Number(raw.amountCents ?? 0),
    status: (raw.status as CommercialContract['status']) ?? 'draft',
    maintenanceNotes: (raw.maintenanceNotes as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

async function listLocations(orgId: string, accountId: string): Promise<CommercialLocation[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(locationsPath(orgId, accountId)).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => normalizeLocation({ ...d.data(), id: d.id }, accountId, d.id));
}

async function listContracts(orgId: string, accountId: string): Promise<CommercialContract[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(contractsPath(orgId, accountId)).orderBy('endDate', 'desc').get();
  return snap.docs.map((d) => normalizeContract({ ...d.data(), id: d.id }, accountId, d.id));
}

function isBookedProposal(status: string) {
  return ['approved', 'accepted', 'deposit_paid', 'scheduled'].includes(status);
}

async function getAccountRevenue(orgId: string, accountId: string) {
  const proposals = await colList<ProposalRecord>(orgId, 'proposals');
  return proposals
    .filter((p) => p.commercialAccountId === accountId && isBookedProposal(p.status))
    .reduce((sum, p) => sum + (p.subtotalCents ?? 0), 0);
}

export async function listCommercialAccounts(orgId: string): Promise<CommercialAccountListItem[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'commercialAccounts');
  const customers = await colList<{ id: string; firstName: string; lastName: string; businessName?: string | null }>(
    orgId,
    'customers',
  );

  return Promise.all(
    rows.map(async (raw) => {
      const account = normalizeAccount(raw, orgId, String(raw.id));
      const locations = await listLocations(orgId, account.id);
      const contracts = await listContracts(orgId, account.id);
      const customer = account.customerId ? customers.find((c) => c.id === account.customerId) : null;
      return {
        ...account,
        locationCount: locations.length,
        activeContractCount: contracts.filter((c) => c.status === 'active').length,
        customerName: customer ? customer.businessName || `${customer.firstName} ${customer.lastName}`.trim() : null,
      };
    }),
  );
}

export async function getCommercialAccount(orgId: string, accountId: string): Promise<CommercialAccountDetail | null> {
  const raw = await colGet<Record<string, unknown>>(orgId, 'commercialAccounts', accountId);
  if (!raw) return null;

  const account = normalizeAccount(raw, orgId, accountId);
  const [locations, contracts, revenue] = await Promise.all([
    listLocations(orgId, accountId),
    listContracts(orgId, accountId),
    getAccountRevenue(orgId, accountId),
  ]);
  const customer = account.customerId
    ? await colGet<{ firstName: string; lastName: string; businessName?: string | null }>(orgId, 'customers', account.customerId)
    : null;

  return {
    ...account,
    locations,
    contracts,
    locationCount: locations.length,
    activeContractCount: contracts.filter((c) => c.status === 'active').length,
    totalRevenueCents: revenue,
    customerName: customer ? customer.businessName || `${customer.firstName} ${customer.lastName}`.trim() : null,
  };
}

export async function createCommercialAccount(
  orgId: string,
  input: {
    name: string;
    customerId?: string | null;
    billingContactId?: string | null;
    accountManagerId?: string | null;
    accountManagerName?: string | null;
    billingAddress?: string | null;
    notes?: string | null;
    status?: CommercialAccount['status'];
    siteMapUrl?: string | null;
  },
  userId?: string | null,
) {
  const created = await colCreate(orgId, 'commercialAccounts', {
    name: input.name,
    customerId: input.customerId ?? null,
    billingContactId: input.billingContactId ?? null,
    accountManagerId: input.accountManagerId ?? null,
    accountManagerName: input.accountManagerName ?? null,
    billingAddress: input.billingAddress ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'prospect',
    siteMapUrl: input.siteMapUrl ?? null,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  return normalizeAccount({ ...created, id: created.id }, orgId, created.id);
}

export async function updateCommercialAccount(
  orgId: string,
  accountId: string,
  data: Partial<
    Pick<
      CommercialAccount,
      | 'name'
      | 'customerId'
      | 'billingContactId'
      | 'accountManagerId'
      | 'accountManagerName'
      | 'billingAddress'
      | 'notes'
      | 'status'
      | 'siteMapUrl'
    >
  >,
  userId?: string | null,
) {
  await colUpdate(orgId, 'commercialAccounts', accountId, { ...data, updatedBy: userId ?? null });
  return getCommercialAccount(orgId, accountId);
}

async function ensureCustomerForAccount(orgId: string, account: CommercialAccount) {
  if (account.customerId) return account.customerId;
  const customer = await createCustomer(orgId, {
    firstName: account.name.split(' ')[0] ?? 'Commercial',
    lastName: account.name.split(' ').slice(1).join(' ') || 'Account',
    businessName: account.name,
    customerType: 'commercial',
    tags: ['commercial-account'],
    notes: account.notes ?? null,
    smsOptIn: false,
    emailOptIn: true,
    billingSameAsPhysical: true,
    referralSource: null,
    assignedSalespersonId: account.accountManagerId ?? null,
    assignedSalespersonName: account.accountManagerName ?? null,
  });
  await colUpdate(orgId, 'commercialAccounts', account.id, { customerId: customer.id });
  return customer.id;
}

export async function addCommercialLocation(
  orgId: string,
  accountId: string,
  input: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    siteContactName?: string | null;
    siteContactPhone?: string | null;
    siteNotes?: string | null;
    propertyId?: string | null;
    maintenanceScheduleNotes?: string | null;
  },
  userId?: string | null,
) {
  const account = await getCommercialAccount(orgId, accountId);
  if (!account) throw new Error('Commercial account not found');

  let propertyId = input.propertyId ?? null;
  if (!propertyId) {
    const customerId = await ensureCustomerForAccount(orgId, account);
    const property = await createProperty(orgId, {
      customerId,
      label: input.name,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: 'US',
      latitude: null,
      longitude: null,
      installNotes: input.siteNotes ?? null,
    });
    propertyId = property.id;
  }

  const db = getAdminFirestore();
  const ref = db.collection(locationsPath(orgId, accountId)).doc();
  const now = ts();
  await ref.set({
    commercialAccountId: accountId,
    name: input.name,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    siteContactName: input.siteContactName ?? null,
    siteContactPhone: input.siteContactPhone ?? null,
    siteNotes: input.siteNotes ?? null,
    propertyId,
    mockupIds: [],
    photoUrls: [],
    maintenanceScheduleNotes: input.maintenanceScheduleNotes ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  const snap = await ref.get();
  return normalizeLocation(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), accountId, snap.id);
}

export async function updateCommercialLocation(
  orgId: string,
  accountId: string,
  locationId: string,
  data: Partial<
    Pick<
      CommercialLocation,
      | 'name'
      | 'addressLine1'
      | 'addressLine2'
      | 'city'
      | 'state'
      | 'postalCode'
      | 'siteContactName'
      | 'siteContactPhone'
      | 'siteNotes'
      | 'propertyId'
      | 'mockupIds'
      | 'photoUrls'
      | 'maintenanceScheduleNotes'
    >
  >,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`${locationsPath(orgId, accountId)}/${locationId}`).update({
    ...data,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  const snap = await db.doc(`${locationsPath(orgId, accountId)}/${locationId}`).get();
  return normalizeLocation(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), accountId, locationId);
}

export async function createCommercialContract(
  orgId: string,
  accountId: string,
  input: {
    name: string;
    startDate: Date;
    endDate: Date;
    renewalDate?: Date | null;
    amountCents: number;
    status?: CommercialContract['status'];
    maintenanceNotes?: string | null;
  },
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.collection(contractsPath(orgId, accountId)).doc();
  const now = ts();
  await ref.set({
    commercialAccountId: accountId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    renewalDate: input.renewalDate ?? input.endDate,
    amountCents: input.amountCents,
    status: input.status ?? 'draft',
    maintenanceNotes: input.maintenanceNotes ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  const snap = await ref.get();
  return normalizeContract(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), accountId, snap.id);
}

export async function updateCommercialContract(
  orgId: string,
  accountId: string,
  contractId: string,
  data: Partial<
    Pick<
      CommercialContract,
      'name' | 'startDate' | 'endDate' | 'renewalDate' | 'amountCents' | 'status' | 'maintenanceNotes'
    >
  >,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`${contractsPath(orgId, accountId)}/${contractId}`).update({
    ...data,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  const snap = await db.doc(`${contractsPath(orgId, accountId)}/${contractId}`).get();
  return normalizeContract(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), accountId, contractId);
}

export async function createMultiLocationCommercialProposal(
  orgId: string,
  input: {
    accountId: string;
    locationIds: string[];
    title: string;
    scopeOfWork?: string | null;
    lineItemsPerLocation?: Array<{ locationId: string; description: string; quantity: number; unitPriceCents: number }>;
    defaultUnitPriceCents?: number;
  },
  userId?: string | null,
) {
  const account = await getCommercialAccount(orgId, input.accountId);
  if (!account) throw new Error('Commercial account not found');

  const locations = account.locations.filter((l) => input.locationIds.includes(l.id));
  if (!locations.length) throw new Error('No valid locations selected');

  const customerId = await ensureCustomerForAccount(orgId, account);
  const primaryLocation = locations[0]!;
  const primaryPropertyId = primaryLocation.propertyId;
  if (!primaryPropertyId) throw new Error('Location missing linked property');

  const lineItems: ProposalLineItem[] = locations.map((loc) => {
    const custom = input.lineItemsPerLocation?.find((li) => li.locationId === loc.id);
    return {
      id: nanoid(),
      description: custom?.description ?? `${loc.name} — commercial lighting display`,
      quantity: custom?.quantity ?? 1,
      unitPriceCents: custom?.unitPriceCents ?? input.defaultUnitPriceCents ?? 250000,
      category: loc.name,
    };
  });

  const mockupIds = [...new Set(locations.flatMap((l) => l.mockupIds))];
  const scope =
    input.scopeOfWork ??
    `Multi-location commercial proposal covering ${locations.length} site(s): ${locations.map((l) => l.name).join(', ')}.`;

  const proposal = await createProposal360(
    orgId,
    {
      customerId,
      propertyId: primaryPropertyId,
      title: input.title,
      installType: 'commercial_display',
      scopeOfWork: scope,
      lineItems,
      mockupIds,
      agreementMode: 'single',
      notes: `Commercial account: ${account.name}`,
    },
    userId,
  );

  if (proposal?.id) {
    await colUpdate(orgId, 'proposals', proposal.id, {
      commercialAccountId: input.accountId,
      commercialLocationIds: input.locationIds,
      isMultiLocation: input.locationIds.length > 1,
    });
    return getProposal360(orgId, proposal.id);
  }

  return proposal;
}

export async function getCommercialDashboard(orgId: string): Promise<CommercialDashboard> {
  const [accounts, proposals, customers] = await Promise.all([
    listCommercialAccounts(orgId),
    colList<ProposalRecord>(orgId, 'proposals'),
    colList<{ id: string; customerType?: string | null }>(orgId, 'customers'),
  ]);

  const commercialCustomerIds = new Set(
    customers.filter((c) => c.customerType && COMMERCIAL_CUSTOMER_TYPES.has(c.customerType)).map((c) => c.id),
  );

  const commercialProposals = proposals.filter(
    (p) => p.commercialAccountId || commercialCustomerIds.has(p.customerId),
  );
  const booked = commercialProposals.filter((p) => isBookedProposal(p.status));
  const projected = commercialProposals.filter((p) => !['rejected', 'declined', 'expired', 'lost'].includes(p.status));

  const allContracts = await Promise.all(accounts.map((a) => listContracts(orgId, a.id)));
  const flatContracts = allContracts.flat();
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    totalAccounts: accounts.length,
    totalLocations: accounts.reduce((s, a) => s + a.locationCount, 0),
    activeContracts: flatContracts.filter((c) => c.status === 'active').length,
    pendingRenewals: flatContracts.filter(
      (c) => c.renewalDate && c.renewalDate <= in30Days && c.status !== 'expired' && c.status !== 'cancelled',
    ).length,
    commercialRevenueCents: booked.reduce((s, p) => s + (p.subtotalCents ?? 0), 0),
    projectedRevenueCents: projected.reduce((s, p) => s + (p.subtotalCents ?? 0), 0),
  };
}
