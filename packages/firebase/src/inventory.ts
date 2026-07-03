import { getAdminFirestore, Timestamp, colList, colGet, colCreate, colUpdate, getByPublicToken, nanoid } from '@yuletide/firebase';
import type { CustomerRecord, PropertyRecord } from './firestore';
import { syncCustomerPipelineFromJob } from './jobs360';

function ts() {
  return Timestamp.now();
}

function mapDoc<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  const result = { id, ...data };
  for (const key of Object.keys(result)) {
    const val = (result as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && 'toDate' in val) {
      (result as Record<string, unknown>)[key] = (val as FirebaseFirestore.Timestamp).toDate();
    }
  }
  return result as T;
}

export async function reserveJobMaterials(orgId: string, jobId: string) {
  const db = getAdminFirestore();
  const materials = await db
    .collection(`organizations/${orgId}/jobMaterials`)
    .where('jobId', '==', jobId)
    .where('status', '==', 'planned')
    .get();

  const batch = db.batch();
  for (const matDoc of materials.docs) {
    const mat = matDoc.data();
    const itemRef = db.doc(`organizations/${orgId}/inventoryItems/${mat.inventoryItemId}`);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) throw new Error('Inventory item not found');
    const item = itemSnap.data()!;
    const available = item.quantityOnHand - item.quantityReserved;
    if (available < mat.quantity) throw new Error(`Insufficient stock for ${item.name}`);
    batch.update(itemRef, {
      quantityReserved: item.quantityReserved + mat.quantity,
      updatedAt: ts(),
    });
    batch.update(matDoc.ref, { status: 'reserved', updatedAt: ts() });
  }
  batch.update(db.doc(`organizations/${orgId}/jobs/${jobId}`), {
    stage: 'inventory_reserved',
    updatedAt: ts(),
  });
  await batch.commit();
}

export async function consumeJobMaterials(orgId: string, jobId: string) {
  const db = getAdminFirestore();
  const materials = await db
    .collection(`organizations/${orgId}/jobMaterials`)
    .where('jobId', '==', jobId)
    .where('status', '==', 'reserved')
    .get();

  const batch = db.batch();
  for (const matDoc of materials.docs) {
    const mat = matDoc.data();
    const itemRef = db.doc(`organizations/${orgId}/inventoryItems/${mat.inventoryItemId}`);
    const itemSnap = await itemRef.get();
    const item = itemSnap.data()!;
    batch.update(itemRef, {
      quantityOnHand: item.quantityOnHand - mat.quantity,
      quantityReserved: item.quantityReserved - mat.quantity,
      updatedAt: ts(),
    });
    batch.update(matDoc.ref, { status: 'consumed', updatedAt: ts() });
  }
  batch.update(db.doc(`organizations/${orgId}/jobs/${jobId}`), {
    stage: 'installed',
    installedAt: ts(),
    updatedAt: ts(),
  });
  await batch.commit();

  const job = await colGet<{ customerId?: string }>(orgId, 'jobs', jobId);
  if (job?.customerId) {
    await syncCustomerPipelineFromJob(orgId, job.customerId, 'installed');
  }
}

export async function getLowStockItems(orgId: string) {
  const items = await colList<Record<string, number>>(orgId, 'inventoryItems');
  return items.filter(
    (item) => (item.quantityOnHand as number) - (item.quantityReserved as number) <= (item.reorderThreshold as number),
  );
}
