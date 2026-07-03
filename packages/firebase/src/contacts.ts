import type { ContactRecord } from '@clcrm/types';
import type { ContactInput, UpdateContactInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function contactsPath(orgId: string) {
  return `organizations/${orgId}/contacts`;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function normalizeKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim();
}

function mapDoc(data: Record<string, unknown>) {
  return mapTimestampsFromData(data) as ContactRecord;
}

function normalizeContactInput(input: ContactInput | UpdateContactInput) {
  return stripUndefined({
    customerId: emptyToNull(input.customerId),
    customerName: emptyToNull(input.customerName),
    firstName: input.firstName?.trim(),
    lastName: input.lastName?.trim(),
    role: input.role,
    title: emptyToNull(input.title),
    phone: emptyToNull(input.phone),
    phoneExtension: emptyToNull(input.phoneExtension),
    email: emptyToNull(input.email)?.toLowerCase() ?? null,
    notes: emptyToNull(input.notes),
    isPrimary: input.isPrimary,
    smsOptIn: input.smsOptIn,
    emailOptIn: input.emailOptIn,
    tags: input.tags,
    source: emptyToNull(input.source),
  });
}

export async function listContacts360(
  orgId: string,
  opts: { page?: number; pageSize?: number; search?: string; customerId?: string | null } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(contactsPath(orgId)).orderBy('updatedAt', 'desc').get();
  } catch {
    snap = await db.collection(contactsPath(orgId)).get();
  }

  let items = snap.docs.map((doc) => mapDoc({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  if (opts.customerId) {
    items = items.filter((contact) => contact.customerId === opts.customerId);
  }

  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((contact) => {
      const haystack = [
        contact.firstName,
        contact.lastName,
        contact.customerName,
        contact.email,
        contact.phone,
        contact.title,
        contact.role,
        ...(contact.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export async function getContact360(orgId: string, contactId: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`${contactsPath(orgId)}/${contactId}`).get();
  if (!snap.exists) return null;
  return mapDoc({ id: snap.id, ...snap.data()! });
}

export async function createContact360(orgId: string, input: ContactInput, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(contactsPath(orgId)).doc();
  const now = ts();
  const data = {
    organizationId: orgId,
    ...normalizeContactInput({
      ...input,
      role: input.role ?? 'primary',
      isPrimary: input.isPrimary ?? false,
      smsOptIn: input.smsOptIn ?? true,
      emailOptIn: input.emailOptIn ?? true,
      tags: input.tags ?? [],
    }),
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  };
  await ref.set(data);
  return mapDoc({ id: ref.id, ...data });
}

export async function updateContact360(
  orgId: string,
  contactId: string,
  input: UpdateContactInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.doc(`${contactsPath(orgId)}/${contactId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const patch = {
    ...normalizeContactInput(input),
    updatedAt: ts(),
    updatedBy: userId ?? null,
  };
  await ref.update(patch);
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}

export async function deleteContact360(orgId: string, contactId: string) {
  const db = getAdminFirestore();
  await db.doc(`${contactsPath(orgId)}/${contactId}`).delete();
  return { success: true };
}

export async function upsertContact360(orgId: string, input: ContactInput, userId?: string | null) {
  const db = getAdminFirestore();
  const contacts = await db.collection(contactsPath(orgId)).get();
  const targetEmail = normalizeKey(input.email);
  const targetName = normalizeKey(fullName(input.firstName, input.lastName));
  const targetCustomerId = normalizeKey(input.customerId);
  const targetCustomerName = normalizeKey(input.customerName);

  const match = contacts.docs.find((doc) => {
    const data = doc.data() as ContactRecord;
    const sameCustomer =
      (targetCustomerId && normalizeKey(data.customerId) === targetCustomerId) ||
      (targetCustomerName && normalizeKey(data.customerName) === targetCustomerName);
    if (targetEmail && normalizeKey(data.email) === targetEmail) return sameCustomer || !data.customerId;
    return targetName && normalizeKey(fullName(data.firstName, data.lastName)) === targetName && sameCustomer;
  });

  if (!match) {
    const created = await createContact360(orgId, input, userId);
    return { contact: created, created: true };
  }

  const updated = await updateContact360(orgId, match.id, input, userId);
  return { contact: updated!, created: false };
}
