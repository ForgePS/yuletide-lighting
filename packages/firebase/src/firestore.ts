import { nanoid } from 'nanoid';
import type { UserRole } from '@clcrm/validators';
import {
  getAdminFirestore,
  getAdminAuth,
  FieldValue,
  Timestamp,
  docToData,
} from './admin';
import { stripUndefined } from './firestore-utils';

export type UserRecord = {
  id: string;
  firebaseUid: string;
  organizationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  settingsRole?: string | null;
  pushToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationRecord = {
  id: string;
  companyName: string;
  brandColor: string;
  logoUrl?: string | null;
  agreementMode: 'single' | 'multi';
  agreementOptions: Array<{ code: string; label: string; active: boolean }>;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeConnectAccountId?: string | null;
  subscriptionStatus?: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'locked' | null;
  subscriptionPlan?: 'monthly' | 'yearly' | null;
  subscriptionInterval?: 'month' | 'year' | null;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean | null;
  lockedAt?: Date | null;
  enabledModules?: string[] | null;
  twilioPhoneNumber?: string | null;
  reviewGoogleUrl?: string | null;
  reviewFacebookUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerRecord = {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  customerType?: 'residential' | 'commercial' | 'hoa' | 'municipal' | 'church' | 'school';
  status?: 'lead' | 'active' | 'scheduled' | 'installed' | 'takedown_pending' | 'storage' | 'at_risk' | 'archived';
  referralSource?: string | null;
  assignedSalespersonId?: string | null;
  assignedSalespersonName?: string | null;
  email?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  preferredContactMethod?: 'phone' | 'email' | 'sms';
  tags: string[];
  notes?: string | null;
  smsOptIn: boolean;
  emailOptIn: boolean;
  billingSameAsPhysical: boolean;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  mailingSameAsBilling?: boolean;
  mailingAddressLine1?: string | null;
  mailingAddressLine2?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingPostalCode?: string | null;
  portalEnabled?: boolean;
  portalToken?: string | null;
  portalInviteSentAt?: Date | null;
  portalLastLoginAt?: Date | null;
  archivedAt?: Date | null;
  pipelineStage?: 'new_lead' | 'contacted' | 'needs_estimate' | 'mockup_needed' | 'proposal_sent' | 'proposal_viewed' | 'approved' | 'deposit_paid' | 'scheduled' | 'installed' | 'balance_due' | 'paid' | 'removal_scheduled' | 'removed' | 'stored' | 'rebook_next_season' | 'lost' | null;
  previousPipelineStage?: 'new_lead' | 'contacted' | 'needs_estimate' | 'mockup_needed' | 'proposal_sent' | 'proposal_viewed' | 'approved' | 'deposit_paid' | 'scheduled' | 'installed' | 'balance_due' | 'paid' | 'removal_scheduled' | 'removed' | 'stored' | 'rebook_next_season' | 'lost' | null;
  stageUpdatedAt?: Date | null;
  pipelineAssignedTo?: string | null;
  pipelineEstimatedValueCents?: number | null;
  nextAction?: string | null;
  nextActionDue?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PropertyRecord = {
  id: string;
  organizationId: string;
  customerId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  installNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function ts() {
  return Timestamp.now();
}

function mapTimestamps<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key of ['createdAt', 'updatedAt', 'sentAt', 'acceptedAt', 'dueDate', 'scheduledStart', 'scheduledEnd', 'installedAt', 'removedAt', 'lastViewedAt', 'paidAt', 'clockIn', 'clockOut', 'lastMessageAt', 'occurredAt', 'scheduledDate', 'completionDate', 'followUpDate', 'purchaseDate', 'portalInviteSentAt', 'portalLastLoginAt', 'archivedAt', 'stageUpdatedAt', 'nextActionDue', 'validUntil', 'openDate', 'installDate', 'removalDate', 'contractGeneratedAt']) {
    const val = result[key];
    if (val && typeof val === 'object' && 'toDate' in (val as object)) {
      (result as Record<string, unknown>)[key] = (val as FirebaseFirestore.Timestamp).toDate();
    }
  }
  return result;
}

export async function ensureOrganization(companyName: string, ownerUid: string): Promise<OrganizationRecord> {
  const db = getAdminFirestore();
  const userSnap = await db.collection('users').doc(ownerUid).get();
  if (userSnap.exists) {
    const user = userSnap.data()!;
    const org = await db.collection('organizations').doc(user.organizationId).get();
    return mapTimestamps(docToData<OrganizationRecord>(org)!)!;
  }

  const orgRef = db.collection('organizations').doc();
  const now = ts();
  const orgData = {
    companyName,
    brandColor: '#DC2626',
    logoUrl: null,
    agreementMode: 'multi',
    agreementOptions: [
      { code: '1YR', label: '1 Year', active: true },
      { code: '3YR', label: '3 Year', active: true },
      { code: '5YR', label: '5 Year', active: true },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await orgRef.set(orgData);

  await db.collection('users').doc(ownerUid).set({
    firebaseUid: ownerUid,
    organizationId: orgRef.id,
    email: '',
    role: 'owner',
    createdAt: now,
    updatedAt: now,
  });

  const org = await orgRef.get();
  return mapTimestamps({ id: org.id, ...org.data()! }) as OrganizationRecord;
}

export async function ensureUser(
  firebaseUid: string,
  email: string,
  organizationId: string,
  firstName?: string | null,
  lastName?: string | null,
  role: UserRole = 'office',
): Promise<UserRecord> {
  const db = getAdminFirestore();
  const ref = db.collection('users').doc(firebaseUid);
  const snap = await ref.get();
  const now = ts();

  if (snap.exists) {
    await ref.update({ email, firstName, lastName, updatedAt: now });
    return mapTimestamps({ id: snap.id, ...snap.data(), email, firstName, lastName }) as UserRecord;
  }

  await ref.set({
    firebaseUid,
    organizationId,
    email,
    firstName,
    lastName,
    role,
    createdAt: now,
    updatedAt: now,
  });

  const updated = await ref.get();
  return mapTimestamps({ id: updated.id, ...updated.data()! }) as UserRecord;
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<UserRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.collection('users').doc(firebaseUid).get();
  if (!snap.exists) return null;
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as UserRecord;
}

export async function getOrganization(orgId: string): Promise<OrganizationRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.collection('organizations').doc(orgId).get();
  if (!snap.exists) return null;
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as OrganizationRecord;
}

export async function updateOrganization(orgId: string, data: Partial<OrganizationRecord>) {
  const db = getAdminFirestore();
  await db.collection('organizations').doc(orgId).update(stripUndefined({ ...data, updatedAt: ts() }));
  return getOrganization(orgId);
}

export async function listCustomers(orgId: string, search?: string, page = 1, pageSize = 20) {
  const db = getAdminFirestore();
  let query = db
    .collection(`organizations/${orgId}/customers`)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  const snap = await query.get();
  let items = snap.docs.map((d) => mapTimestamps({ id: d.id, ...d.data() }) as CustomerRecord);

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(
      (c) =>
        c.firstName.toLowerCase().includes(s) ||
        c.lastName.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s),
    );
  }

  const countSnap = await db.collection(`organizations/${orgId}/customers`).count().get();
  const itemsWithAddress = await Promise.all(
    items.map(async (customer) => {
      const props = await db
        .collection(`organizations/${orgId}/properties`)
        .where('customerId', '==', customer.id)
        .limit(1)
        .get();
      const primary = props.docs[0]
        ? (mapTimestamps({ id: props.docs[0].id, ...props.docs[0].data()! }) as PropertyRecord)
        : null;
      return { ...customer, primaryProperty: primary };
    }),
  );
  return { items: itemsWithAddress, total: countSnap.data().count, page, pageSize };
}

export async function getCustomer(orgId: string, id: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`organizations/${orgId}/customers/${id}`).get();
  if (!snap.exists) return null;
  const customer = mapTimestamps({ id: snap.id, ...snap.data()! }) as CustomerRecord;
  const props = await db.collection(`organizations/${orgId}/properties`).where('customerId', '==', id).get();
  const properties = props.docs.map((d) => mapTimestamps({ id: d.id, ...d.data() }) as PropertyRecord);
  return { ...customer, properties };
}

export async function createCustomer(orgId: string, data: Omit<CustomerRecord, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) {
  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/customers`).doc();
  const now = ts();
  await ref.set({ organizationId: orgId, ...data, createdAt: now, updatedAt: now });
  const snap = await ref.get();
  const customer = mapTimestamps({ id: snap.id, ...snap.data()! }) as CustomerRecord;
  try {
    const { fireAutomationTrigger } = await import('./automation360');
    await fireAutomationTrigger(
      orgId,
      'new_lead_created',
      {
        customerId: customer.id,
        customerName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer',
      },
    );
  } catch {
    // Automation should not block customer creation
  }
  return customer;
}

export async function updateCustomer(orgId: string, id: string, data: Partial<CustomerRecord>) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/customers/${id}`).update({ ...data, updatedAt: ts() });
  const snap = await db.doc(`organizations/${orgId}/customers/${id}`).get();
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as CustomerRecord;
}

export async function deleteCustomer(orgId: string, id: string) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/customers/${id}`).delete();
}

export async function createProperty(orgId: string, data: Omit<PropertyRecord, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) {
  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/properties`).doc();
  const now = ts();
  await ref.set({ organizationId: orgId, ...data, createdAt: now, updatedAt: now });
  const snap = await ref.get();
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as PropertyRecord;
}

export async function updateProperty(orgId: string, id: string, data: Partial<PropertyRecord>) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/properties/${id}`).update({ ...data, updatedAt: ts() });
  const snap = await db.doc(`organizations/${orgId}/properties/${id}`).get();
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as PropertyRecord;
}

export async function colList<T>(orgId: string, collection: string, orderField = 'createdAt'): Promise<T[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/${collection}`)
    .orderBy(orderField, 'desc')
    .get();
  return snap.docs.map((d) => mapTimestamps({ id: d.id, ...d.data() }) as T);
}

export async function colGet<T>(orgId: string, collection: string, id: string): Promise<T | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`organizations/${orgId}/${collection}/${id}`).get();
  if (!snap.exists) return null;
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as T;
}

export async function colCreate<T extends Record<string, unknown>>(
  orgId: string,
  collection: string,
  data: T,
): Promise<T & { id: string }> {
  const db = getAdminFirestore();
  const ref = db.collection(`organizations/${orgId}/${collection}`).doc();
  const now = ts();
  await ref.set({ organizationId: orgId, ...data, createdAt: now, updatedAt: now });
  const snap = await ref.get();
  return mapTimestamps({ id: snap.id, ...snap.data()! }) as T & { id: string };
}

export async function colUpdate(orgId: string, collection: string, id: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/${collection}/${id}`).update({ ...data, updatedAt: ts() });
  return colGet(orgId, collection, id);
}

export async function colDelete(orgId: string, collection: string, id: string) {
  const db = getAdminFirestore();
  await db.doc(`organizations/${orgId}/${collection}/${id}`).delete();
}

export async function getByPublicToken<T>(
  collection: 'proposals' | 'invoices',
  token: string,
): Promise<T | null> {
  const db = getAdminFirestore();
  const groupSnap = await db.collectionGroup(collection).where('publicToken', '==', token).limit(1).get();
  if (groupSnap.empty) return null;
  const doc = groupSnap.docs[0]!;
  return mapTimestamps({ id: doc.id, ...doc.data()! }) as T;
}

export async function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken);
}

export { nanoid, FieldValue, Timestamp };
