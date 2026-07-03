import type { ProjectPrepItem, ProjectPrepStatus } from '@clcrm/types';
import type { ProjectPrepItemInput, UpdateProjectPrepItemInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function prepPath(orgId: string) {
  return `organizations/${orgId}/projectPrepItems`;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function mapDoc(data: Record<string, unknown>) {
  return mapTimestampsFromData(data) as ProjectPrepItem;
}

function normalizePrepInput(input: ProjectPrepItemInput | UpdateProjectPrepItemInput) {
  return stripUndefined({
    customerId: emptyToNull(input.customerId),
    customerName: emptyToNull(input.customerName),
    jobId: emptyToNull(input.jobId),
    jobTitle: input.jobTitle?.trim(),
    proposalId: emptyToNull(input.proposalId),
    inventoryItemId: emptyToNull(input.inventoryItemId),
    sku: emptyToNull(input.sku),
    itemName: input.itemName?.trim(),
    category: emptyToNull(input.category),
    status: input.status,
    quantityNeeded: input.quantityNeeded,
    quantityPulled: input.quantityPulled,
    quantityOrdered: input.quantityOrdered,
    quantityCheckedIn: input.quantityCheckedIn,
    storageLocation: emptyToNull(input.storageLocation),
    truckId: emptyToNull(input.truckId),
    truckName: emptyToNull(input.truckName),
    vendorName: emptyToNull(input.vendorName),
    dueDate: input.dueDate ?? undefined,
    notes: emptyToNull(input.notes),
    source: emptyToNull(input.source),
  });
}

function inferStatus(item: {
  status?: ProjectPrepStatus;
  quantityNeeded?: number;
  quantityPulled?: number;
  quantityOrdered?: number;
  quantityCheckedIn?: number;
}) {
  if (item.status === 'cancelled') return 'cancelled';
  const needed = item.quantityNeeded ?? 0;
  const pulled = item.quantityPulled ?? 0;
  const ordered = item.quantityOrdered ?? 0;
  const checkedIn = item.quantityCheckedIn ?? 0;
  if (needed > 0 && pulled >= needed) return 'ready';
  if (checkedIn > 0 && pulled + checkedIn >= needed) return 'checked_in';
  if (ordered > 0) return 'ordered';
  if (pulled > 0) return 'partially_pulled';
  return item.status ?? 'pending';
}

export async function listProjectPrepItems360(
  orgId: string,
  opts: { page?: number; pageSize?: number; search?: string; status?: ProjectPrepStatus; customerId?: string; jobId?: string } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(prepPath(orgId)).orderBy('updatedAt', 'desc').get();
  } catch {
    snap = await db.collection(prepPath(orgId)).get();
  }

  let items = snap.docs.map((doc) => mapDoc({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  if (opts.status) items = items.filter((item) => item.status === opts.status);
  if (opts.customerId) items = items.filter((item) => item.customerId === opts.customerId);
  if (opts.jobId) items = items.filter((item) => item.jobId === opts.jobId);

  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((item) =>
      [
        item.customerName,
        item.jobTitle,
        item.itemName,
        item.sku,
        item.category,
        item.storageLocation,
        item.truckName,
        item.vendorName,
        item.status,
        item.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const summary = {
    totalItems: items.length,
    readyItems: items.filter((item) => item.status === 'ready' || item.status === 'packed').length,
    orderNeededItems: items.filter((item) => item.status === 'to_be_ordered' || item.status === 'ordered').length,
    blockedItems: items.filter((item) => item.status === 'pending' && item.quantityPulled === 0).length,
  };

  return { items: items.slice(start, start + pageSize), total, page, pageSize, summary };
}

export async function getProjectPrepItem360(orgId: string, prepItemId: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`${prepPath(orgId)}/${prepItemId}`).get();
  if (!snap.exists) return null;
  return mapDoc({ id: snap.id, ...snap.data()! });
}

export async function createProjectPrepItem360(orgId: string, input: ProjectPrepItemInput, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(prepPath(orgId)).doc();
  const now = ts();
  const data = {
    organizationId: orgId,
    ...normalizePrepInput({
      ...input,
      status: input.status ?? 'pending',
      quantityNeeded: input.quantityNeeded ?? 1,
      quantityPulled: input.quantityPulled ?? 0,
      quantityOrdered: input.quantityOrdered ?? 0,
      quantityCheckedIn: input.quantityCheckedIn ?? 0,
      source: input.source || 'manual',
    }),
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  };
  await ref.set(data);
  return mapDoc({ id: ref.id, ...data });
}

export async function updateProjectPrepItem360(
  orgId: string,
  prepItemId: string,
  input: UpdateProjectPrepItemInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.doc(`${prepPath(orgId)}/${prepItemId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = mapDoc({ id: snap.id, ...snap.data()! });
  const merged = {
    ...input,
    quantityNeeded: input.quantityNeeded ?? current.quantityNeeded,
    quantityPulled: input.quantityPulled ?? current.quantityPulled,
    quantityOrdered: input.quantityOrdered ?? current.quantityOrdered,
    quantityCheckedIn: input.quantityCheckedIn ?? current.quantityCheckedIn,
    status: input.status ?? current.status,
  };
  const patch = {
    ...normalizePrepInput({ ...merged, status: inferStatus(merged) }),
    updatedAt: ts(),
    updatedBy: userId ?? null,
  };
  await ref.update(patch);
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}

export async function updateProjectPrepStatus360(
  orgId: string,
  prepItemId: string,
  input: {
    status: ProjectPrepStatus;
    quantityPulled?: number;
    quantityOrdered?: number;
    quantityCheckedIn?: number;
    notes?: string | null;
  },
  userId?: string | null,
) {
  return updateProjectPrepItem360(
    orgId,
    prepItemId,
    {
      ...input,
      notes: input.notes ?? undefined,
    },
    userId,
  );
}

export async function deleteProjectPrepItem360(orgId: string, prepItemId: string) {
  const db = getAdminFirestore();
  await db.doc(`${prepPath(orgId)}/${prepItemId}`).delete();
  return { success: true };
}
