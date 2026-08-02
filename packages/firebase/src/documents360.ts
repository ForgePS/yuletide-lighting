import { getAdminFirestore } from './admin';
import { colCreate, colDelete } from './firestore';
import { mapTimestampsFromData } from './firestore-utils';

export type CustomerDocumentCategory =
  | 'proposal'
  | 'agreement'
  | 'invoice'
  | 'photo'
  | 'permit'
  | 'other';

export type CustomerDocument360 = {
  id: string;
  organizationId: string;
  customerId: string;
  title: string;
  category: CustomerDocumentCategory;
  url: string | null;
  notes: string | null;
  relatedRecordType: string | null;
  relatedRecordId: string | null;
  /** Portal visibility classification (P2-S5). Unknown/missing treated as customer_visible for legacy. */
  visibility?: 'customer_visible' | 'staff_only' | 'internal' | 'system' | string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
};

function normalizeDocument(
  raw: Record<string, unknown>,
  orgId: string,
  id: string,
): CustomerDocument360 {
  const mapped = mapTimestampsFromData({ id, ...raw }) as Record<string, unknown>;
  return {
    id,
    organizationId: String(mapped.organizationId ?? orgId),
    customerId: String(mapped.customerId ?? ''),
    title: String(mapped.title ?? ''),
    category: (mapped.category as CustomerDocumentCategory) ?? 'other',
    url: (mapped.url as string) ?? null,
    notes: (mapped.notes as string) ?? null,
    relatedRecordType: (mapped.relatedRecordType as string) ?? null,
    relatedRecordId: (mapped.relatedRecordId as string) ?? null,
    visibility: (mapped.visibility as string) ?? null,
    createdAt: mapped.createdAt instanceof Date ? mapped.createdAt : new Date(),
    updatedAt: mapped.updatedAt instanceof Date ? mapped.updatedAt : new Date(),
    createdBy: (mapped.createdBy as string) ?? null,
  };
}

export async function listCustomerDocuments360(
  orgId: string,
  customerId: string,
): Promise<CustomerDocument360[]> {
  if (!orgId || !customerId) return [];
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/customerDocuments`)
    .where('customerId', '==', customerId)
    .get();
  return snap.docs
    .map((d) => normalizeDocument({ id: d.id, ...d.data() }, orgId, d.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createCustomerDocument360(
  orgId: string,
  input: {
    customerId: string;
    title: string;
    category?: CustomerDocumentCategory;
    url?: string | null;
    notes?: string | null;
    relatedRecordType?: string | null;
    relatedRecordId?: string | null;
  },
  userId?: string | null,
): Promise<CustomerDocument360> {
  const created = await colCreate(orgId, 'customerDocuments', {
    customerId: input.customerId,
    title: input.title.trim(),
    category: input.category ?? 'other',
    url: input.url?.trim() || null,
    notes: input.notes?.trim() || null,
    relatedRecordType: input.relatedRecordType?.trim() || null,
    relatedRecordId: input.relatedRecordId?.trim() || null,
    createdBy: userId ?? null,
  });
  return normalizeDocument(created as Record<string, unknown>, orgId, created.id);
}

export async function deleteCustomerDocument360(orgId: string, documentId: string): Promise<void> {
  await colDelete(orgId, 'customerDocuments', documentId);
}
