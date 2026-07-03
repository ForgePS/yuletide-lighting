import type {
  StorageDashboard,
  StoragePullSheet,
  StorageRecord,
  StorageRecordWithCustomer,
  StoredItem,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { colCreate, colGet, colList, colUpdate } from './firestore';
import { getJob360 } from './jobs360';
import { updateCustomerPipelineStage, logCustomerActivity } from './customer360';
import { mapTimestampsFromData } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function recordPath(orgId: string, recordId: string) {
  return `organizations/${orgId}/storageRecords/${recordId}`;
}

function itemsPath(orgId: string, recordId: string) {
  return `${recordPath(orgId, recordId)}/items`;
}

function normalizeRecord(raw: Record<string, unknown>, orgId: string, recordId: string): StorageRecord {
  return {
    id: recordId,
    organizationId: orgId,
    customerId: String(raw.customerId ?? ''),
    propertyId: (raw.propertyId as string) ?? null,
    jobId: (raw.jobId as string) ?? null,
    storageType: (raw.storageType as StorageRecord['storageType']) ?? 'customer_owned',
    binNumber: String(raw.binNumber ?? ''),
    locationId: String(raw.locationId ?? ''),
    rack: (raw.rack as string) ?? null,
    shelf: (raw.shelf as string) ?? null,
    status: (raw.status as StorageRecord['status']) ?? 'stored',
    storedAt: raw.storedAt instanceof Date ? raw.storedAt : raw.storedAt ? new Date(String(raw.storedAt)) : new Date(),
    pulledAt: raw.pulledAt instanceof Date ? raw.pulledAt : raw.pulledAt ? new Date(String(raw.pulledAt)) : null,
    conditionNotes: (raw.conditionNotes as string) ?? null,
    photos: Array.isArray(raw.photos) ? (raw.photos as string[]) : [],
    storageFeeCents: raw.storageFeeCents != null ? Number(raw.storageFeeCents) : null,
    agreementSignedAt:
      raw.agreementSignedAt instanceof Date
        ? raw.agreementSignedAt
        : raw.agreementSignedAt
          ? new Date(String(raw.agreementSignedAt))
          : null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

function normalizeItem(raw: Record<string, unknown>, recordId: string, itemId: string): StoredItem {
  return {
    id: itemId,
    storageRecordId: recordId,
    name: String(raw.name ?? ''),
    quantity: Number(raw.quantity ?? 1),
    condition: (raw.condition as StoredItem['condition']) ?? 'good',
    notes: (raw.notes as string) ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

async function listItems(orgId: string, recordId: string): Promise<StoredItem[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(itemsPath(orgId, recordId)).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => normalizeItem({ ...d.data(), id: d.id }, recordId, d.id));
}

export async function listStorageRecords(orgId: string, customerId?: string): Promise<StorageRecordWithCustomer[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'storageRecords');
  const filtered = customerId ? rows.filter((r) => r.customerId === customerId) : rows;
  const customers = await colList<{ id: string; firstName: string; lastName: string; businessName?: string | null }>(
    orgId,
    'customers',
  );
  const properties = await colList<{ id: string; addressLine1: string; city: string; state: string }>(orgId, 'properties');

  const enriched = await Promise.all(
    filtered.map(async (raw) => {
      const record = normalizeRecord(raw, orgId, String(raw.id));
      const customer = customers.find((c) => c.id === record.customerId);
      const customerName = customer
        ? customer.businessName || `${customer.firstName} ${customer.lastName}`.trim()
        : 'Customer';
      const property = record.propertyId ? properties.find((p) => p.id === record.propertyId) : null;
      const items = await listItems(orgId, record.id);
      return {
        ...record,
        customerName,
        propertyAddress: property ? `${property.addressLine1}, ${property.city} ${property.state}` : null,
        itemCount: items.length,
      };
    }),
  );

  return enriched.sort((a, b) => b.storedAt.getTime() - a.storedAt.getTime());
}

export async function getStorageRecord(orgId: string, recordId: string) {
  const raw = await colGet<Record<string, unknown>>(orgId, 'storageRecords', recordId);
  if (!raw) return null;
  const record = normalizeRecord({ ...raw, id: recordId }, orgId, recordId);
  const items = await listItems(orgId, recordId);
  const customer = record.customerId
    ? await colGet<{ firstName: string; lastName: string; businessName?: string | null }>(orgId, 'customers', record.customerId)
    : null;
  const property = record.propertyId
    ? await colGet<{ addressLine1: string; city: string; state: string }>(orgId, 'properties', record.propertyId)
    : null;
  return {
    record,
    items,
    customerName: customer ? customer.businessName || `${customer.firstName} ${customer.lastName}`.trim() : 'Customer',
    propertyAddress: property ? `${property.addressLine1}, ${property.city} ${property.state}` : null,
  };
}

export async function createStorageRecord(
  orgId: string,
  input: {
    customerId: string;
    propertyId?: string | null;
    jobId?: string | null;
    storageType?: StorageRecord['storageType'];
    binNumber?: string;
    locationId?: string;
    rack?: string | null;
    shelf?: string | null;
    conditionNotes?: string | null;
    photos?: string[];
    storageFeeCents?: number | null;
    agreementSignedAt?: Date | null;
  },
  userId?: string | null,
) {
  const created = await colCreate(orgId, 'storageRecords', {
    customerId: input.customerId,
    propertyId: input.propertyId ?? null,
    jobId: input.jobId ?? null,
    storageType: input.storageType ?? 'customer_owned',
    binNumber: input.binNumber ?? '',
    locationId: input.locationId ?? 'Main warehouse',
    rack: input.rack ?? null,
    shelf: input.shelf ?? null,
    status: 'stored',
    storedAt: new Date(),
    pulledAt: null,
    conditionNotes: input.conditionNotes ?? null,
    photos: input.photos ?? [],
    storageFeeCents: input.storageFeeCents ?? null,
    agreementSignedAt: input.agreementSignedAt ?? null,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  return normalizeRecord({ ...created, id: created.id }, orgId, created.id);
}

export async function updateStorageRecord(
  orgId: string,
  recordId: string,
  data: Partial<
    Pick<
      StorageRecord,
      | 'storageType'
      | 'binNumber'
      | 'locationId'
      | 'rack'
      | 'shelf'
      | 'status'
      | 'conditionNotes'
      | 'photos'
      | 'storageFeeCents'
      | 'agreementSignedAt'
      | 'pulledAt'
    >
  >,
  userId?: string | null,
) {
  const patch: Record<string, unknown> = { ...data, updatedBy: userId ?? null };
  if (data.status === 'pulled' && !data.pulledAt) {
    patch.pulledAt = new Date();
  }
  await colUpdate(orgId, 'storageRecords', recordId, patch);
  const detail = await getStorageRecord(orgId, recordId);
  return detail?.record ?? null;
}

export async function createStoredItem(
  orgId: string,
  recordId: string,
  input: { name: string; quantity: number; condition: StoredItem['condition']; notes?: string | null },
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.collection(itemsPath(orgId, recordId)).doc();
  const now = ts();
  await ref.set({
    storageRecordId: recordId,
    name: input.name,
    quantity: input.quantity,
    condition: input.condition,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  const snap = await ref.get();
  return normalizeItem(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), recordId, snap.id);
}

export async function updateStoredItem(
  orgId: string,
  recordId: string,
  itemId: string,
  data: Partial<Pick<StoredItem, 'name' | 'quantity' | 'condition' | 'notes'>>,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  await db.doc(`${itemsPath(orgId, recordId)}/${itemId}`).update({
    ...data,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  const snap = await db.doc(`${itemsPath(orgId, recordId)}/${itemId}`).get();
  return normalizeItem(mapTimestampsFromData({ id: snap.id, ...snap.data()! }), recordId, itemId);
}

export async function generateStoragePullSheet(
  orgId: string,
  filters: { customerId?: string; jobId?: string; date?: string },
): Promise<StoragePullSheet> {
  let records = await listStorageRecords(orgId, filters.customerId);
  records = records.filter((r) => r.status === 'stored');

  if (filters.jobId) {
    records = records.filter((r) => r.jobId === filters.jobId);
  }
  if (filters.date) {
    const target = new Date(filters.date);
    const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    records = records.filter((r) => r.storedAt >= dayStart && r.storedAt < dayEnd);
  }

  const lines = await Promise.all(
    records.map(async (record) => {
      const items = await listItems(orgId, record.id);
      return {
        storageRecordId: record.id,
        customerId: record.customerId,
        customerName: record.customerName,
        jobId: record.jobId,
        propertyAddress: record.propertyAddress,
        binNumber: record.binNumber || '—',
        locationId: record.locationId || '—',
        rack: record.rack,
        shelf: record.shelf,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, condition: i.condition })),
      };
    }),
  );

  return {
    generatedAt: new Date(),
    filters: {
      customerId: filters.customerId ?? null,
      jobId: filters.jobId ?? null,
      date: filters.date ?? null,
    },
    lines: lines.sort((a, b) => a.binNumber.localeCompare(b.binNumber)),
  };
}

export async function createStorageFromRemoval(
  orgId: string,
  jobId: string,
  input: { binNumber?: string; locationId?: string } = {},
  userId?: string | null,
) {
  const detail = await getJob360(orgId, jobId);
  if (!detail?.job.customerId) {
    throw new Error('Job not found or missing customer');
  }

  const existing = (await listStorageRecords(orgId, detail.job.customerId)).find((r) => r.jobId === jobId);
  if (existing) return existing;

  const record = await createStorageRecord(
    orgId,
    {
      customerId: detail.job.customerId,
      propertyId: detail.job.propertyId ?? null,
      jobId,
      storageType: 'mixed',
      binNumber: input.binNumber ?? '',
      locationId: input.locationId ?? 'Main warehouse',
      conditionNotes: detail.job.installNotes ?? null,
    },
    userId,
  );

  for (const material of detail.materials) {
    await createStoredItem(
      orgId,
      record.id,
      {
        name: material.name ?? 'Lighting material',
        quantity: material.quantity,
        condition: 'good',
        notes: `From job ${jobId}`,
      },
      userId,
    );
  }

  if (!detail.materials.length) {
    await createStoredItem(
      orgId,
      record.id,
      { name: 'Season lighting display', quantity: 1, condition: 'good', notes: 'Created from takedown job' },
      userId,
    );
  }

  await updateCustomerPipelineStage(orgId, detail.job.customerId, 'stored', userId, 'System');
  await logCustomerActivity(
    orgId,
    detail.job.customerId,
    'note_added',
    `Storage record created from takedown job`,
    userId,
    'System',
    { relatedRecordType: 'job', relatedRecordId: jobId },
  );

  try {
    const { fireAutomationTrigger } = await import('./automation360');
    const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', detail.job.customerId);
    const ctx = {
      customerId: detail.job.customerId,
      customerName: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Customer',
      jobId,
    };
    await fireAutomationTrigger(orgId, 'removal_completed', ctx, userId);
    await fireAutomationTrigger(orgId, 'storage_completed', ctx, userId);
  } catch {
    // Best-effort
  }

  return record;
}

export async function getStorageDashboard(orgId: string): Promise<StorageDashboard> {
  const records = await listStorageRecords(orgId);
  return {
    totalRecords: records.length,
    stored: records.filter((r) => r.status === 'stored').length,
    pulled: records.filter((r) => r.status === 'pulled').length,
    awaitingBin: records.filter((r) => r.status === 'stored' && !r.binNumber).length,
    totalStorageFeesCents: records.reduce((sum, r) => sum + (r.storageFeeCents ?? 0), 0),
  };
}
