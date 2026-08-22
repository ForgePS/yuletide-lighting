import { z } from 'zod';

export const inventoryCategoryGroupSchema = z.enum([
  'lighting',
  'wire_components',
  'decor',
  'installation_supplies',
  'equipment',
]);

export const warehouseTypeSchema = z.enum(['main', 'secondary', 'storage_building', 'seasonal_storage']);
export const vehicleTypeSchema = z.enum(['install_truck', 'service_truck', 'lift_truck', 'supervisor']);
export const transferReasonSchema = z.enum(['restock', 'job_allocation', 'customer_return', 'audit_adjustment', 'damage', 'other']);
export const purchaseOrderStatusSchema = z.enum(['draft', 'ordered', 'partially_received', 'received', 'closed']);
export const auditTypeSchema = z.enum(['full_count', 'cycle_count', 'spot_audit']);
export const damageStatusSchema = z.enum(['repair', 'replace', 'dispose']);

export const createInventoryItem360Schema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  categoryName: z.string().max(100).optional().or(z.literal('')),
  categoryGroup: inventoryCategoryGroupSchema.optional(),
  manufacturer: z.string().max(200).optional().or(z.literal('')),
  vendorId: z.string().optional().or(z.literal('')),
  upc: z.string().max(50).optional().or(z.literal('')),
  unit: z.string().max(20).default('each'),
  unitCostCents: z.number().int().min(0).default(0),
  sellPriceCents: z.number().int().min(0).default(0),
  replacementCostCents: z.number().int().min(0).default(0),
  quantityOnHand: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(10),
  maxStock: z.number().min(0).default(1000),
  warehouseId: z.string().optional().or(z.literal('')),
  locationAisle: z.string().max(50).optional().or(z.literal('')),
  locationRack: z.string().max(50).optional().or(z.literal('')),
  locationShelf: z.string().max(50).optional().or(z.literal('')),
  locationBin: z.string().max(50).optional().or(z.literal('')),
  truckId: z.string().optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  isCustomerOwned: z.boolean().default(false),
  isConsumable: z.boolean().default(false),
  isRental: z.boolean().default(false),
  isSeasonal: z.boolean().default(true),
  prices: z.array(z.object({ agreementCode: z.string(), unitPriceCents: z.number().int().min(0) })).default([]),
});

export const updateInventoryItem360Schema = createInventoryItem360Schema.partial();

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  type: warehouseTypeSchema.default('main'),
  address: z.string().max(500).optional().or(z.literal('')),
});

export const createWarehouseLocationSchema = z.object({
  warehouseId: z.string().min(1),
  aisle: z.string().min(1).max(50),
  rack: z.string().min(1).max(50),
  shelf: z.string().min(1).max(50),
  bin: z.string().min(1).max(50),
  capacity: z.number().int().min(0).default(100),
});

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  leadTimeDays: z.number().int().min(0).default(7),
  isPreferred: z.boolean().default(false),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1),
  expectedDelivery: z.coerce.date().optional().nullable(),
  lineItems: z.array(z.object({
    inventoryItemId: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().min(1),
    quantityOrdered: z.number().positive(),
    unitCostCents: z.number().int().min(0),
  })).min(1),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const createTransferSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  fromType: z.enum(['warehouse', 'truck', 'customer', 'job_site']),
  toType: z.enum(['warehouse', 'truck', 'customer', 'job_site']),
  reason: transferReasonSchema,
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const createAuditSchema = z.object({
  auditType: auditTypeSchema,
  warehouseId: z.string().optional().or(z.literal('')),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    expectedQty: z.number().min(0),
    actualQty: z.number().min(0),
  })).min(1),
});

export const createTruckSchema = z.object({
  vehicleName: z.string().min(1).max(200),
  vehicleType: vehicleTypeSchema,
  licensePlate: z.string().max(20).optional().or(z.literal('')),
  assignedUserName: z.string().max(200).optional().or(z.literal('')),
});

export const assignCustomerInventorySchema = z.object({
  customerId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  storageBin: z.string().max(100).optional().or(z.literal('')),
  storageLocation: z.string().max(200).optional().or(z.literal('')),
  storageFeeCents: z.number().int().min(0).optional(),
  returnDate: z.coerce.date().optional().nullable(),
});

export const allocateJobMaterialSchema = z.object({
  jobId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  proposalId: z.string().optional(),
});

export const barcodeActionSchema = z.object({
  code: z.string().min(1),
  action: z.enum(['check_in', 'check_out', 'transfer', 'audit', 'assign_customer', 'assign_truck']),
  quantity: z.number().positive().default(1),
  targetId: z.string().optional(),
});

export const aiInventoryQuerySchema = z.object({
  question: z.string().min(1).max(500),
});

export const bulkUpdateInventoryItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(500),
  categoryId: z.string().optional(),
  categoryName: z.string().max(100).optional(),
  reorderLevel: z.number().min(0).optional(),
  stockAdjustment: z.number().int().optional(),
});

export type CreateInventoryItem360Input = z.infer<typeof createInventoryItem360Schema>;
