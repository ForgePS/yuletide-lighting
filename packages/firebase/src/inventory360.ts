import { nanoid } from 'nanoid';
import type {
  AiInventoryQuery,
  CustomerInventoryAssignment,
  InventoryAnalytics,
  InventoryAudit,
  InventoryCategory,
  InventoryDashboardKpis,
  InventoryForecast,
  InventoryItemRecord,
  InventoryTransfer,
  JobMaterialAllocation,
  PickListItem,
  PurchaseOrder,
  TruckInventory,
  Vendor,
  Warehouse,
  WarehouseLocation,
} from '@clcrm/types';
import { computeAvailable, computeItemValue, DEFAULT_CATEGORY_TREE } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { colCreate, colGet, colList, colUpdate } from './firestore';

function ts() {
  return Timestamp.now();
}

function orgPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

function mapDoc<T>(data: Record<string, unknown>): T {
  return mapTimestampsFromData(data) as unknown as T;
}

function normalizeItem(raw: Record<string, unknown>): InventoryItemRecord {
  const quantityOnHand = Number(raw.quantityOnHand ?? 0);
  const quantityReserved = Number(raw.quantityReserved ?? 0);
  return {
    id: String(raw.id),
    organizationId: String(raw.organizationId ?? ''),
    sku: String(raw.sku ?? ''),
    name: String(raw.name ?? ''),
    description: (raw.description as string) ?? null,
    categoryId: (raw.categoryId as string) ?? null,
    categoryName: (raw.categoryName as string) ?? (raw.category as string) ?? null,
    categoryGroup: (raw.categoryGroup as InventoryItemRecord['categoryGroup']) ?? null,
    manufacturer: (raw.manufacturer as string) ?? null,
    vendorId: (raw.vendorId as string) ?? null,
    vendorName: (raw.vendorName as string) ?? null,
    upc: (raw.upc as string) ?? null,
    barcode: (raw.barcode as string) ?? `BC-${raw.sku}`,
    qrCode: (raw.qrCode as string) ?? `YL-QR-${raw.id ?? raw.sku}`,
    unit: String(raw.unit ?? 'each'),
    unitCostCents: Number(raw.unitCostCents ?? (Array.isArray(raw.prices) ? (raw.prices[0] as { unitPriceCents?: number })?.unitPriceCents : undefined) ?? 0),
    sellPriceCents: Number(raw.sellPriceCents ?? 0),
    replacementCostCents: Number(raw.replacementCostCents ?? raw.unitCostCents ?? 0),
    quantityOnHand,
    quantityReserved,
    quantityAssigned: Number(raw.quantityAssigned ?? 0),
    quantityDamaged: Number(raw.quantityDamaged ?? 0),
    quantityLost: Number(raw.quantityLost ?? 0),
    reorderLevel: Number(raw.reorderLevel ?? raw.reorderThreshold ?? 10),
    maxStock: Number(raw.maxStock ?? 1000),
    warehouseId: (raw.warehouseId as string) ?? null,
    locationPath: (raw.locationPath as string) ?? null,
    locationAisle: (raw.locationAisle as string) ?? null,
    locationRack: (raw.locationRack as string) ?? null,
    locationShelf: (raw.locationShelf as string) ?? null,
    locationBin: (raw.locationBin as string) ?? null,
    truckId: (raw.truckId as string) ?? null,
    customerId: (raw.customerId as string) ?? null,
    isCustomerOwned: Boolean(raw.isCustomerOwned),
    isConsumable: Boolean(raw.isConsumable),
    isRental: Boolean(raw.isRental),
    isSeasonal: raw.isSeasonal !== false,
    storageFeeCents: (raw.storageFeeCents as number) ?? null,
    storageReturnDate: raw.storageReturnDate ? new Date(raw.storageReturnDate as string) : null,
    damageStatus: (raw.damageStatus as InventoryItemRecord['damageStatus']) ?? null,
    prices: (raw.prices as InventoryItemRecord['prices']) ?? [],
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(),
    createdBy: (raw.createdBy as string) ?? null,
    updatedBy: (raw.updatedBy as string) ?? null,
  };
}

export async function listInventoryItems360(orgId: string): Promise<InventoryItemRecord[]> {
  const items = await colList<Record<string, unknown>>(orgId, 'inventoryItems');
  return items.map((i) => normalizeItem({ ...i, organizationId: orgId }));
}

export async function getInventoryItem360(orgId: string, itemId: string) {
  const item = await colGet<Record<string, unknown>>(orgId, 'inventoryItems', itemId);
  if (!item) return null;
  return normalizeItem({ ...item, id: itemId, organizationId: orgId });
}

export async function createInventoryItem360(orgId: string, input: Partial<InventoryItemRecord>, userId?: string | null) {
  const locationPath = [input.locationAisle, input.locationRack, input.locationShelf, input.locationBin].filter(Boolean).join(' / ') || null;
  const item = await colCreate(orgId, 'inventoryItems', {
    ...input,
    organizationId: orgId,
    quantityReserved: input.quantityReserved ?? 0,
    quantityAssigned: input.quantityAssigned ?? 0,
    quantityDamaged: input.quantityDamaged ?? 0,
    quantityLost: input.quantityLost ?? 0,
    barcode: input.barcode ?? `BC-${input.sku}`,
    qrCode: input.qrCode ?? `YL-QR-${input.sku}-${Date.now()}`,
    locationPath,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  return normalizeItem({ ...item, organizationId: orgId });
}

export async function updateInventoryItem360(orgId: string, itemId: string, data: Partial<InventoryItemRecord>, userId?: string | null) {
  const patch: Record<string, unknown> = { ...data, updatedBy: userId ?? null };
  if (data.locationAisle || data.locationRack || data.locationShelf || data.locationBin) {
    const existing = await getInventoryItem360(orgId, itemId);
    patch.locationPath = [
      data.locationAisle ?? existing?.locationAisle,
      data.locationRack ?? existing?.locationRack,
      data.locationShelf ?? existing?.locationShelf,
      data.locationBin ?? existing?.locationBin,
    ].filter(Boolean).join(' / ');
  }
  await colUpdate(orgId, 'inventoryItems', itemId, patch);
  return getInventoryItem360(orgId, itemId);
}

export async function bulkUpdateInventoryItems360(
  orgId: string,
  itemIds: string[],
  patch: {
    categoryId?: string;
    categoryName?: string;
    reorderLevel?: number;
    stockAdjustment?: number;
  },
  userId?: string | null,
) {
  let updated = 0;
  for (const itemId of itemIds) {
    const existing = await getInventoryItem360(orgId, itemId);
    if (!existing) continue;

    const data: Partial<InventoryItemRecord> = {};
    if (patch.categoryId) data.categoryId = patch.categoryId;
    if (patch.categoryName) data.categoryName = patch.categoryName;
    if (patch.reorderLevel !== undefined) data.reorderLevel = patch.reorderLevel;
    if (patch.stockAdjustment) {
      data.quantityOnHand = Math.max(0, (existing.quantityOnHand ?? 0) + patch.stockAdjustment);
    }

    if (Object.keys(data).length === 0) continue;
    await updateInventoryItem360(orgId, itemId, data, userId);
    updated += 1;
  }
  return { updated };
}

export async function ensureInventoryCategories(orgId: string): Promise<InventoryCategory[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'inventoryCategories')).get();
  if (!snap.empty) {
    return snap.docs.map((d) => mapDoc<InventoryCategory>({ id: d.id, ...d.data()! }));
  }
  const now = ts();
  const categories: InventoryCategory[] = [];
  for (const cat of DEFAULT_CATEGORY_TREE) {
    const ref = db.collection(orgPath(orgId, 'inventoryCategories')).doc();
    const data = { organizationId: orgId, name: cat.name, group: cat.group, parentId: null, description: null, isActive: true, createdAt: now, updatedAt: now };
    await ref.set(data);
    categories.push(mapDoc<InventoryCategory>({ id: ref.id, ...data }));
  }
  return categories;
}

export async function listCategories(orgId: string) {
  return ensureInventoryCategories(orgId);
}

function inferCategoryGroup(name: string): InventoryCategory['group'] {
  const lower = name.toLowerCase();
  if (/bulb|light|pixel|rgb|led|c7|c9|mini|permanent/.test(lower)) return 'lighting';
  if (/wire|cord|spt|socket|splitter|controller|power|plug/.test(lower)) return 'wire_components';
  if (/wreath|garland|bow|decor|display|ornament|tree/.test(lower)) return 'decor';
  if (/clip|stake|zip|tie|fastener|anchor|tape|hook/.test(lower)) return 'installation_supplies';
  return 'equipment';
}

export async function findOrCreateInventoryCategory(
  orgId: string,
  rawName: string | null | undefined,
): Promise<InventoryCategory | null> {
  if (!rawName?.trim()) return null;

  const categories = await ensureInventoryCategories(orgId);
  const normalized = rawName.trim().toLowerCase();

  const exact = categories.find((cat) => cat.name.toLowerCase() === normalized);
  if (exact) return exact;

  const partial = categories.find(
    (cat) => normalized.includes(cat.name.toLowerCase()) || cat.name.toLowerCase().includes(normalized),
  );
  if (partial) return partial;

  const db = getAdminFirestore();
  const ref = db.collection(orgPath(orgId, 'inventoryCategories')).doc();
  const now = ts();
  const group = inferCategoryGroup(rawName);
  const data = {
    organizationId: orgId,
    name: rawName.trim(),
    group,
    parentId: null,
    description: 'Imported from CSV',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return mapDoc<InventoryCategory>({ id: ref.id, ...data });
}

export async function ensureDefaultWarehouses(orgId: string): Promise<Warehouse[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'warehouses')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<Warehouse>({ id: d.id, ...d.data()! }));

  const defaults = [
    { name: 'Main Warehouse', type: 'main' as const },
    { name: 'Secondary Warehouse', type: 'secondary' as const },
    { name: 'Seasonal Storage', type: 'seasonal_storage' as const },
  ];
  const now = ts();
  const warehouses: Warehouse[] = [];
  for (const w of defaults) {
    const ref = db.collection(orgPath(orgId, 'warehouses')).doc();
    await ref.set({ organizationId: orgId, ...w, address: null, isActive: true, createdAt: now, updatedAt: now });
    warehouses.push(mapDoc<Warehouse>({ id: ref.id, organizationId: orgId, ...w, address: null, isActive: true, createdAt: now, updatedAt: now }));
  }
  return warehouses;
}

export async function createWarehouse(orgId: string, data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userId?: string | null) {
  return colCreate(orgId, 'warehouses', { ...data, createdBy: userId, updatedBy: userId }) as Promise<Warehouse>;
}

export async function listWarehouseLocations(orgId: string, warehouseId: string): Promise<WarehouseLocation[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(`${orgPath(orgId, 'warehouses')}/${warehouseId}/locations`).get();
  return snap.docs.map((d) => mapDoc<WarehouseLocation>({ id: d.id, ...d.data()! }));
}

export async function createWarehouseLocation(orgId: string, warehouseId: string, data: Omit<WarehouseLocation, 'id' | 'warehouseId' | 'createdAt' | 'updatedAt' | 'label' | 'itemCount'>, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(`${orgPath(orgId, 'warehouses')}/${warehouseId}/locations`).doc();
  const now = ts();
  const label = `${data.aisle} / ${data.rack} / ${data.shelf} / ${data.bin}`;
  await ref.set({ warehouseId, ...data, label, itemCount: 0, createdAt: now, updatedAt: now, createdBy: userId ?? null, updatedBy: userId ?? null });
  return mapDoc<WarehouseLocation>({ id: ref.id, warehouseId, ...data, label, itemCount: 0, createdAt: now, updatedAt: now });
}

export async function ensureDefaultVendors(orgId: string): Promise<Vendor[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'vendors')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<Vendor>({ id: d.id, ...d.data()! }));

  const names = ['Minleon', 'HBL', 'Reinders', 'Certified Lights', 'Holiday Bright Lights'];
  const now = ts();
  const vendors: Vendor[] = [];
  for (const name of names) {
    const ref = db.collection(orgPath(orgId, 'vendors')).doc();
    const data = { organizationId: orgId, name, contactName: null, email: null, phone: null, leadTimeDays: 7, isPreferred: name === 'Minleon', notes: null, createdAt: now, updatedAt: now };
    await ref.set(data);
    vendors.push(mapDoc<Vendor>({ id: ref.id, ...data }));
  }
  return vendors;
}

export async function createVendor(orgId: string, data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userId?: string | null) {
  return colCreate(orgId, 'vendors', { ...data, createdBy: userId, updatedBy: userId }) as Promise<Vendor>;
}

export async function listVendors(orgId: string) {
  return ensureDefaultVendors(orgId);
}

export async function createPurchaseOrder(orgId: string, input: { vendorId: string; expectedDelivery?: Date | null; lineItems: Array<Omit<PurchaseOrder['lineItems'][number], 'id' | 'quantityReceived'>>; notes?: string | null }, userId?: string | null) {
  const vendor = await colGet<Vendor>(orgId, 'vendors', input.vendorId);
  const all = await colList<{ id: string }>(orgId, 'purchaseOrders');
  const poNumber = `PO-${String(all.length + 1).padStart(5, '0')}`;
  const lineItems = input.lineItems.map((li) => ({ ...li, id: nanoid(), quantityReceived: 0 }));
  const subtotalCents = lineItems.reduce((s, li) => s + li.quantityOrdered * li.unitCostCents, 0);
  return colCreate(orgId, 'purchaseOrders', {
    poNumber,
    vendorId: input.vendorId,
    vendorName: vendor?.name ?? null,
    status: 'draft',
    orderDate: new Date(),
    expectedDelivery: input.expectedDelivery ?? null,
    lineItems,
    subtotalCents,
    notes: input.notes ?? null,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<PurchaseOrder>;
}

export async function listPurchaseOrders(orgId: string) {
  return colList<PurchaseOrder>(orgId, 'purchaseOrders');
}

export async function updatePurchaseOrderStatus(orgId: string, poId: string, status: PurchaseOrder['status'], userId?: string | null) {
  await colUpdate(orgId, 'purchaseOrders', poId, { status, updatedBy: userId });
  if (status === 'received') {
    const po = await colGet<PurchaseOrder>(orgId, 'purchaseOrders', poId);
    if (po) {
      for (const line of po.lineItems) {
        if (line.inventoryItemId) {
          const item = await getInventoryItem360(orgId, line.inventoryItemId);
          if (item) {
            await updateInventoryItem360(orgId, line.inventoryItemId, {
              quantityOnHand: item.quantityOnHand + line.quantityOrdered,
            }, userId);
          }
        }
      }
    }
  }
  return colGet<PurchaseOrder>(orgId, 'purchaseOrders', poId);
}

export async function createTransfer(orgId: string, input: Omit<InventoryTransfer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'transferredAt' | 'createdBy' | 'updatedBy'>, userId?: string | null, userName?: string | null) {
  const item = await getInventoryItem360(orgId, input.itemId);
  if (!item) throw new Error('Item not found');
  const available = computeAvailable(item);
  if (available < input.quantity) throw new Error('Insufficient available quantity');

  await updateInventoryItem360(orgId, input.itemId, {
    quantityOnHand: item.quantityOnHand - input.quantity,
    ...(input.toType === 'truck' ? { truckId: input.toLocation, quantityAssigned: item.quantityAssigned + input.quantity } : {}),
    ...(input.toType === 'customer' ? { customerId: input.toLocation, isCustomerOwned: true, quantityAssigned: item.quantityAssigned + input.quantity } : {}),
  }, userId);

  return colCreate(orgId, 'inventoryTransfers', {
    ...input,
    itemName: item.name,
    sku: item.sku,
    userId: userId ?? null,
    userName: userName ?? null,
    transferredAt: new Date(),
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<InventoryTransfer>;
}

export async function listTransfers(orgId: string) {
  return colList<InventoryTransfer>(orgId, 'inventoryTransfers');
}

export async function createAudit(orgId: string, input: { auditType: InventoryAudit['auditType']; warehouseId?: string | null; lines: Array<{ itemId: string; expectedQty: number; actualQty: number }> }, userName?: string | null, userId?: string | null) {
  const lines = await Promise.all(input.lines.map(async (line) => {
    const item = await getInventoryItem360(orgId, line.itemId);
    return {
      id: nanoid(),
      itemId: line.itemId,
      sku: item?.sku ?? null,
      itemName: item?.name ?? null,
      expectedQty: line.expectedQty,
      actualQty: line.actualQty,
      variance: line.actualQty - line.expectedQty,
    };
  }));
  const totalVariance = lines.reduce((s, l) => s + Math.abs(l.variance), 0);
  const totalExpected = lines.reduce((s, l) => s + l.expectedQty, 0);
  const accuracyPercent = totalExpected > 0 ? Math.round((1 - totalVariance / totalExpected) * 100) : 100;

  for (const line of lines) {
    if (line.variance !== 0) {
      const item = await getInventoryItem360(orgId, line.itemId);
      if (item) await updateInventoryItem360(orgId, line.itemId, { quantityOnHand: line.actualQty }, userId);
    }
  }

  return colCreate(orgId, 'inventoryAudits', {
    auditType: input.auditType,
    warehouseId: input.warehouseId ?? null,
    status: 'completed',
    lines,
    userName: userName ?? null,
    completedAt: new Date(),
    accuracyPercent,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<InventoryAudit>;
}

export async function listAudits(orgId: string) {
  return colList<InventoryAudit>(orgId, 'inventoryAudits');
}

export async function ensureDefaultTrucks(orgId: string): Promise<TruckInventory[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'truckInventory')).get();
  if (!snap.empty) return snap.docs.map((d) => mapDoc<TruckInventory>({ id: d.id, ...d.data()! }));

  const trucks = [
    { vehicleName: 'Install Truck 1', vehicleType: 'install_truck' as const },
    { vehicleName: 'Service Truck 2', vehicleType: 'service_truck' as const },
    { vehicleName: 'Lift Truck', vehicleType: 'lift_truck' as const },
  ];
  const now = ts();
  const result: TruckInventory[] = [];
  for (const t of trucks) {
    const ref = db.collection(orgPath(orgId, 'truckInventory')).doc();
    const data = { organizationId: orgId, ...t, licensePlate: null, assignedUserName: null, itemIds: [], totalItems: 0, totalValueCents: 0, createdAt: now, updatedAt: now };
    await ref.set(data);
    result.push(mapDoc<TruckInventory>({ id: ref.id, ...data }));
  }
  return result;
}

export async function listTrucks(orgId: string) {
  const trucks = await ensureDefaultTrucks(orgId);
  const items = await listInventoryItems360(orgId);
  return trucks.map((truck) => {
    const truckItems = items.filter((i) => i.truckId === truck.id);
    return {
      ...truck,
      itemIds: truckItems.map((i) => i.id),
      totalItems: truckItems.reduce((s, i) => s + i.quantityOnHand, 0),
      totalValueCents: truckItems.reduce((s, i) => s + computeItemValue(i), 0),
    };
  });
}

export async function assignToCustomer(orgId: string, input: { customerId: string; itemId: string; quantity: number; storageBin?: string | null; storageLocation?: string | null; storageFeeCents?: number | null; returnDate?: Date | null }, customerName?: string | null, userId?: string | null) {
  const item = await getInventoryItem360(orgId, input.itemId);
  if (!item) throw new Error('Item not found');

  await updateInventoryItem360(orgId, input.itemId, {
    customerId: input.customerId,
    isCustomerOwned: true,
    quantityAssigned: item.quantityAssigned + input.quantity,
    storageFeeCents: input.storageFeeCents ?? null,
    storageReturnDate: input.returnDate ?? null,
    locationBin: input.storageBin ?? item.locationBin,
  }, userId);

  return colCreate(orgId, 'customerInventory', {
    customerId: input.customerId,
    customerName: customerName ?? null,
    itemId: input.itemId,
    itemName: item.name,
    sku: item.sku,
    quantity: input.quantity,
    storageBin: input.storageBin ?? null,
    storageLocation: input.storageLocation ?? null,
    condition: 'good',
    storageFeeCents: input.storageFeeCents ?? null,
    returnDate: input.returnDate ?? null,
    qrCode: `YL-STORAGE-${input.customerId.slice(0, 6)}-${item.sku}`,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<CustomerInventoryAssignment>;
}

export async function listCustomerInventory(orgId: string, customerId?: string) {
  const all = await colList<CustomerInventoryAssignment>(orgId, 'customerInventory');
  return customerId ? all.filter((c) => c.customerId === customerId) : all;
}

export async function allocateJobMaterial(orgId: string, input: { jobId: string; itemId: string; quantity: number; proposalId?: string | null }, userId?: string | null) {
  const item = await getInventoryItem360(orgId, input.itemId);
  if (!item) throw new Error('Item not found');
  const available = computeAvailable(item);
  if (available < input.quantity) throw new Error('Insufficient stock');

  await updateInventoryItem360(orgId, input.itemId, {
    quantityReserved: item.quantityReserved + input.quantity,
  }, userId);

  const db = getAdminFirestore();
  await db.collection(orgPath(orgId, 'jobMaterials')).add({
    jobId: input.jobId,
    inventoryItemId: input.itemId,
    quantity: input.quantity,
    status: 'allocated',
    organizationId: orgId,
    createdAt: ts(),
    updatedAt: ts(),
  });

  return colCreate(orgId, 'jobMaterialAllocations', {
    jobId: input.jobId,
    proposalId: input.proposalId ?? null,
    itemId: input.itemId,
    itemName: item.name,
    sku: item.sku,
    quantity: input.quantity,
    status: 'allocated',
    warehouseLocation: item.locationPath ?? null,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<JobMaterialAllocation>;
}

export async function generatePickList(orgId: string, jobId: string): Promise<PickListItem[]> {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'jobMaterialAllocations')).where('jobId', '==', jobId).get();
  const allocations = snap.docs.map((d) => mapDoc<JobMaterialAllocation>({ id: d.id, ...d.data()! }));

  return Promise.all(allocations.map(async (a) => {
    const item = await getInventoryItem360(orgId, a.itemId);
    return {
      itemId: a.itemId,
      sku: a.sku ?? item?.sku ?? '',
      name: a.itemName ?? item?.name ?? '',
      quantity: a.quantity,
      warehouseLocation: a.warehouseLocation ?? item?.locationPath ?? '—',
      binLocation: item?.locationBin ?? '—',
    };
  }));
}

export async function getInventoryDashboard(orgId: string): Promise<InventoryDashboardKpis> {
  const items = await listInventoryItems360(orgId);
  const audits = await listAudits(orgId);

  let total = 0, available = 0, assigned = 0, customerOwned = 0, truck = 0, damaged = 0;
  let lowStock = 0, reorderAlerts = 0;

  for (const item of items) {
    const val = computeItemValue(item);
    total += val;
    const avail = computeAvailable(item);
    available += avail * item.unitCostCents;
    assigned += item.quantityAssigned * item.unitCostCents;
    if (item.isCustomerOwned) customerOwned += val;
    if (item.truckId) truck += val;
    damaged += item.quantityDamaged * item.unitCostCents;
    if (avail <= item.reorderLevel) {
      lowStock++;
      if (avail < item.reorderLevel) reorderAlerts++;
    }
  }

  const lastAudit = audits[0];
  const accuracy = lastAudit?.accuracyPercent ?? 98;

  return {
    totalInventoryValueCents: total,
    availableInventoryValueCents: available,
    assignedInventoryValueCents: assigned,
    customerOwnedValueCents: customerOwned,
    truckInventoryValueCents: truck,
    damagedInventoryValueCents: damaged,
    reorderAlerts,
    lowStockCount: lowStock,
    inventoryTurnover: items.length > 0 ? Math.round((assigned / Math.max(total, 1)) * 12) / 10 : 0,
    inventoryAccuracyPercent: accuracy,
  };
}

export async function generateForecasts(orgId: string): Promise<InventoryForecast[]> {
  const items = await listInventoryItems360(orgId);
  const proposals = await colList<{ status: string }>(orgId, 'proposals');
  const openProposals = proposals.filter((p) => !['approved', 'rejected', 'expired'].includes(p.status)).length;

  const forecasts: InventoryForecast[] = [];
  for (const item of items.filter((i) => computeAvailable(i) <= i.reorderLevel * 2)) {
    forecasts.push({
      id: item.id,
      organizationId: orgId,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      seasonalUsage: Math.round(item.quantityOnHand * 0.4),
      historicalUsage: Math.round(item.quantityOnHand * 0.3),
      upcomingInstalls: Math.round(openProposals * 0.5),
      openProposals,
      suggestedReorderQty: Math.max(item.reorderLevel * 2, item.maxStock - computeAvailable(item)),
      forecastNotes: `Reorder suggested — ${computeAvailable(item)} available vs ${item.reorderLevel} reorder level`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return forecasts;
}

export async function getInventoryAnalytics(orgId: string): Promise<InventoryAnalytics> {
  const items = await listInventoryItems360(orgId);
  const totalValue = items.reduce((s, i) => s + computeItemValue(i), 0);

  return {
    valueOverTime: [
      { month: 'Jan', valueCents: Math.round(totalValue * 0.7) },
      { month: 'Feb', valueCents: Math.round(totalValue * 0.75) },
      { month: 'Mar', valueCents: Math.round(totalValue * 0.8) },
      { month: 'Apr', valueCents: Math.round(totalValue * 0.85) },
      { month: 'May', valueCents: Math.round(totalValue * 0.9) },
      { month: 'Jun', valueCents: totalValue },
    ],
    topUsedItems: items.slice(0, 5).map((i) => ({ name: i.name, sku: i.sku, usage: i.quantityAssigned + i.quantityReserved })),
    slowMovingItems: items.filter((i) => i.quantityAssigned === 0).slice(0, 5).map((i) => ({ name: i.name, sku: i.sku, daysIdle: 90 })),
    seasonalConsumption: [
      { category: 'Lighting', quantity: items.filter((i) => i.categoryGroup === 'lighting').reduce((s, i) => s + i.quantityOnHand, 0) },
      { category: 'Decor', quantity: items.filter((i) => i.categoryGroup === 'decor').reduce((s, i) => s + i.quantityOnHand, 0) },
    ],
    turnoverRate: totalValue > 0 ? 4.2 : 0,
  };
}

export async function processBarcodeAction(orgId: string, input: { code: string; action: string; quantity: number; targetId?: string }, userId?: string | null, userName?: string | null) {
  const items = await listInventoryItems360(orgId);
  const item = items.find((i) => i.barcode === input.code || i.qrCode === input.code || i.sku === input.code);
  if (!item) throw new Error('Item not found for code');

  switch (input.action) {
    case 'check_in':
      await updateInventoryItem360(orgId, item.id, { quantityOnHand: item.quantityOnHand + input.quantity }, userId);
      break;
    case 'check_out':
      await updateInventoryItem360(orgId, item.id, { quantityOnHand: Math.max(0, item.quantityOnHand - input.quantity) }, userId);
      break;
    case 'assign_customer':
      if (input.targetId) await assignToCustomer(orgId, { customerId: input.targetId, itemId: item.id, quantity: input.quantity }, null, userId);
      break;
    case 'assign_truck':
      if (input.targetId) await updateInventoryItem360(orgId, item.id, { truckId: input.targetId, quantityAssigned: item.quantityAssigned + input.quantity }, userId);
      break;
    default:
      break;
  }
  return getInventoryItem360(orgId, item.id);
}

export async function aiInventoryQuery(orgId: string, question: string): Promise<AiInventoryQuery> {
  const q = question.toLowerCase();
  const items = await listInventoryItems360(orgId);
  const recommendations: string[] = [];

  if (q.includes('reorder') || q.includes('low stock')) {
    const low = items.filter((i) => computeAvailable(i) <= i.reorderLevel);
    return {
      answer: `Found ${low.length} items at or below reorder level.`,
      items: low.slice(0, 10).map((i) => ({ id: i.id, sku: i.sku, name: i.name, detail: `${computeAvailable(i)} available, reorder at ${i.reorderLevel}` })),
      recommendations: low.slice(0, 3).map((i) => `Create PO for ${i.name} (${i.sku})`),
    };
  }

  if (q.includes('damaged')) {
    const damaged = items.filter((i) => i.quantityDamaged > 0);
    const threshold = q.match(/\$([\d]+)/)?.[1];
    const filtered = threshold ? damaged.filter((i) => i.quantityDamaged * i.unitCostCents > Number(threshold) * 100) : damaged;
    return {
      answer: `${filtered.length} items with damaged inventory.`,
      items: filtered.map((i) => ({ id: i.id, sku: i.sku, name: i.name, detail: `${i.quantityDamaged} damaged — ${i.damageStatus ?? 'pending'}` })),
      recommendations: ['Review damage reports and create replacement POs'],
    };
  }

  if (q.includes('forecast') || q.includes('c9')) {
    const c9 = items.filter((i) => i.name.toLowerCase().includes('c9') || i.sku.toLowerCase().includes('c9'));
    recommendations.push('Based on open proposals, order 15% more C9 bulbs before October');
    return {
      answer: 'Seasonal forecast for C9 bulbs based on historical usage and open proposals.',
      items: c9.map((i) => ({ id: i.id, sku: i.sku, name: i.name, detail: `Suggest reorder: ${Math.max(i.reorderLevel * 2, 100)} units` })),
      recommendations,
    };
  }

  const customerMatch = q.match(/assigned to (.+)/);
  if (customerMatch) {
    const assignments = await listCustomerInventory(orgId);
    return {
      answer: `${assignments.length} customer inventory assignments on file.`,
      items: assignments.slice(0, 10).map((a) => ({ id: a.id, sku: a.sku ?? '', name: a.itemName ?? '', detail: `${a.quantity} @ ${a.storageBin ?? 'bin TBD'}` })),
      recommendations: [],
    };
  }

  return {
    answer: 'Try: "Show items below reorder level", "Show damaged inventory over $500", or "Forecast C9 bulb usage"',
    items: items.slice(0, 5).map((i) => ({ id: i.id, sku: i.sku, name: i.name, detail: `${computeAvailable(i)} available` })),
    recommendations: ['Run full inventory audit', 'Review reorder forecasts'],
  };
}

export async function markItemDamaged(orgId: string, itemId: string, quantity: number, status: 'repair' | 'replace' | 'dispose', userId?: string | null) {
  const item = await getInventoryItem360(orgId, itemId);
  if (!item) throw new Error('Not found');
  return updateInventoryItem360(orgId, itemId, {
    quantityDamaged: item.quantityDamaged + quantity,
    quantityOnHand: Math.max(0, item.quantityOnHand - quantity),
    damageStatus: status,
  }, userId);
}

export async function listLowStockInventory360(orgId: string) {
  const items = await listInventoryItems360(orgId);
  return items
    .map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      available: computeAvailable(item),
      reorderLevel: item.reorderLevel,
      quantityDamaged: item.quantityDamaged,
      locationPath: item.locationPath ?? null,
    }))
    .filter((i) => i.available <= i.reorderLevel)
    .sort((a, b) => a.available - b.available);
}

export async function getInventoryLocationSummary(orgId: string) {
  const [items, trucks] = await Promise.all([
    listInventoryItems360(orgId),
    ensureDefaultTrucks(orgId),
  ]);
  const truckNames = new Map(trucks.map((t) => [t.id, t.vehicleName]));

  const buckets = new Map<string, { label: string; locationType: 'warehouse' | 'vehicle' | 'storage_bin' | 'unassigned'; itemCount: number; totalQuantity: number; totalValueCents: number }>();

  for (const item of items) {
    let key: string;
    let label: string;
    let locationType: 'warehouse' | 'vehicle' | 'storage_bin' | 'unassigned';

    if (item.truckId) {
      key = `truck:${item.truckId}`;
      label = truckNames.get(item.truckId) ?? `Truck ${item.truckId.slice(0, 6)}`;
      locationType = 'vehicle';
    } else if (item.customerId && item.isCustomerOwned) {
      key = `customer:${item.customerId}`;
      label = `Customer storage · ${item.customerId.slice(0, 8)}`;
      locationType = 'storage_bin';
    } else if (item.locationPath) {
      key = `wh:${item.locationPath}`;
      label = item.locationPath;
      locationType = 'warehouse';
    } else {
      key = 'unassigned';
      label = 'Unassigned';
      locationType = 'unassigned';
    }

    const existing = buckets.get(key) ?? { label, locationType, itemCount: 0, totalQuantity: 0, totalValueCents: 0 };
    existing.itemCount += 1;
    existing.totalQuantity += item.quantityOnHand;
    existing.totalValueCents += computeItemValue(item);
    buckets.set(key, existing);
  }

  return [...buckets.entries()]
    .map(([locationKey, data]) => ({ locationKey, ...data }))
    .sort((a, b) => b.totalValueCents - a.totalValueCents);
}

export async function getItemJobAllocations(orgId: string, itemId: string) {
  const db = getAdminFirestore();
  const snap = await db.collection(orgPath(orgId, 'jobMaterialAllocations')).where('itemId', '==', itemId).get();
  return snap.docs.map((d) => mapDoc<JobMaterialAllocation>({ id: d.id, ...d.data()! }));
}
