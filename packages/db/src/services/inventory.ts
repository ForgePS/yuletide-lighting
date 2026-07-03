import { eq, and, sql, desc, asc, ilike, or, gte, lte } from 'drizzle-orm';
import {
  getDb,
  inventoryItems,
  jobMaterials,
  jobs,
  organizations,
  users,
  type DbClient,
} from '@clcrm/db';

export async function reserveJobMaterials(
  db: DbClient,
  organizationId: string,
  jobId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const materials = await tx
      .select()
      .from(jobMaterials)
      .where(
        and(
          eq(jobMaterials.organizationId, organizationId),
          eq(jobMaterials.jobId, jobId),
          eq(jobMaterials.status, 'planned'),
        ),
      );

    for (const material of materials) {
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, material.inventoryItemId),
            eq(inventoryItems.organizationId, organizationId),
          ),
        );

      if (!item) throw new Error(`Inventory item ${material.inventoryItemId} not found`);

      const available = item.quantityOnHand - item.quantityReserved;
      if (available < material.quantity) {
        throw new Error(`Insufficient stock for ${item.name}. Need ${material.quantity}, have ${available}`);
      }

      await tx
        .update(inventoryItems)
        .set({
          quantityReserved: sql`${inventoryItems.quantityReserved} + ${material.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));

      await tx
        .update(jobMaterials)
        .set({ status: 'reserved', updatedAt: new Date() })
        .where(eq(jobMaterials.id, material.id));
    }

    await tx
      .update(jobs)
      .set({ stage: 'inventory_reserved', updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));
  });
}

export async function consumeJobMaterials(
  db: DbClient,
  organizationId: string,
  jobId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const materials = await tx
      .select()
      .from(jobMaterials)
      .where(
        and(
          eq(jobMaterials.organizationId, organizationId),
          eq(jobMaterials.jobId, jobId),
          eq(jobMaterials.status, 'reserved'),
        ),
      );

    for (const material of materials) {
      await tx
        .update(inventoryItems)
        .set({
          quantityOnHand: sql`${inventoryItems.quantityOnHand} - ${material.quantity}`,
          quantityReserved: sql`${inventoryItems.quantityReserved} - ${material.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryItems.id, material.inventoryItemId),
            eq(inventoryItems.organizationId, organizationId),
          ),
        );

      await tx
        .update(jobMaterials)
        .set({ status: 'consumed', updatedAt: new Date() })
        .where(eq(jobMaterials.id, material.id));
    }

    await tx
      .update(jobs)
      .set({ stage: 'installed', installedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));
  });
}

export async function releaseJobMaterials(
  db: DbClient,
  organizationId: string,
  jobId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const materials = await tx
      .select()
      .from(jobMaterials)
      .where(
        and(
          eq(jobMaterials.organizationId, organizationId),
          eq(jobMaterials.jobId, jobId),
          eq(jobMaterials.status, 'reserved'),
        ),
      );

    for (const material of materials) {
      await tx
        .update(inventoryItems)
        .set({
          quantityReserved: sql`${inventoryItems.quantityReserved} - ${material.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, material.inventoryItemId));

      await tx
        .update(jobMaterials)
        .set({ status: 'released', updatedAt: new Date() })
        .where(eq(jobMaterials.id, material.id));
    }
  });
}

export async function getLowStockItems(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.organizationId, organizationId),
        sql`${inventoryItems.quantityOnHand} - ${inventoryItems.quantityReserved} <= ${inventoryItems.reorderThreshold}`,
      ),
    );
}

export async function ensureOrganization(
  clerkOrgId: string,
  companyName: string,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId));

  if (existing) return existing;

  const [created] = await db
    .insert(organizations)
    .values({
      clerkOrgId,
      companyName,
      agreementOptions: [
        { code: '1YR', label: '1 Year', active: true },
        { code: '3YR', label: '3 Year', active: true },
        { code: '5YR', label: '5 Year', active: true },
      ],
    })
    .returning();

  return created!;
}

export async function ensureUser(
  organizationId: string,
  clerkUserId: string,
  email: string,
  firstName?: string | null,
  lastName?: string | null,
  role: 'owner' | 'admin' | 'office' | 'crew' = 'office',
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.clerkUserId, clerkUserId)));

  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ organizationId, clerkUserId, email, firstName, lastName, role })
    .returning();

  return created!;
}

export { eq, and, sql, desc, asc, ilike, or, gte, lte };
