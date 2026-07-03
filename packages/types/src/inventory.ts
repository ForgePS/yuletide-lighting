/** Enterprise Inventory — Sprint INV-001 */

export type InventoryAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type InventoryCategoryGroup =
  | 'lighting'
  | 'wire_components'
  | 'decor'
  | 'installation_supplies'
  | 'equipment';

export type WarehouseType = 'main' | 'secondary' | 'storage_building' | 'seasonal_storage';

export type VehicleType = 'install_truck' | 'service_truck' | 'lift_truck' | 'supervisor';

export type TransferReason = 'restock' | 'job_allocation' | 'customer_return' | 'audit_adjustment' | 'damage' | 'other';

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'closed';

export type AuditType = 'full_count' | 'cycle_count' | 'spot_audit';

export type DamageStatus = 'repair' | 'replace' | 'dispose';

export type MaterialAllocationStatus = 'allocated' | 'picked' | 'installed' | 'returned';

export type InventoryItemRecord = InventoryAuditFields & {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryGroup?: InventoryCategoryGroup | null;
  manufacturer?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  upc?: string | null;
  barcode?: string | null;
  qrCode?: string | null;
  unit: string;
  unitCostCents: number;
  sellPriceCents: number;
  replacementCostCents: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAssigned: number;
  quantityDamaged: number;
  quantityLost: number;
  reorderLevel: number;
  maxStock: number;
  warehouseId?: string | null;
  locationPath?: string | null;
  locationAisle?: string | null;
  locationRack?: string | null;
  locationShelf?: string | null;
  locationBin?: string | null;
  truckId?: string | null;
  customerId?: string | null;
  isCustomerOwned: boolean;
  isConsumable: boolean;
  isRental: boolean;
  isSeasonal: boolean;
  storageFeeCents?: number | null;
  storageReturnDate?: Date | null;
  damageStatus?: DamageStatus | null;
  prices: Array<{ agreementCode: string; unitPriceCents: number }>;
};

export type InventoryCategory = InventoryAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  group: InventoryCategoryGroup;
  parentId?: string | null;
  description?: string | null;
  isActive: boolean;
};

export type Warehouse = InventoryAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  type: WarehouseType;
  address?: string | null;
  isActive: boolean;
};

export type WarehouseLocation = InventoryAuditFields & {
  id: string;
  warehouseId: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  label: string;
  itemCount: number;
  capacity: number;
};

export type Vendor = InventoryAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  leadTimeDays: number;
  isPreferred: boolean;
  notes?: string | null;
};

export type PurchaseOrderLine = {
  id: string;
  inventoryItemId?: string | null;
  sku?: string | null;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostCents: number;
};

export type PurchaseOrder = InventoryAuditFields & {
  id: string;
  organizationId: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string | null;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDelivery?: Date | null;
  lineItems: PurchaseOrderLine[];
  subtotalCents: number;
  notes?: string | null;
};

export type InventoryTransfer = InventoryAuditFields & {
  id: string;
  organizationId: string;
  itemId: string;
  itemName?: string | null;
  sku?: string | null;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  fromType: 'warehouse' | 'truck' | 'customer' | 'job_site';
  toType: 'warehouse' | 'truck' | 'customer' | 'job_site';
  reason: TransferReason;
  userId?: string | null;
  userName?: string | null;
  notes?: string | null;
  transferredAt: Date;
};

export type InventoryAuditLine = {
  id: string;
  itemId: string;
  sku?: string | null;
  itemName?: string | null;
  expectedQty: number;
  actualQty: number;
  variance: number;
};

export type InventoryAudit = InventoryAuditFields & {
  id: string;
  organizationId: string;
  auditType: AuditType;
  warehouseId?: string | null;
  status: 'in_progress' | 'completed';
  lines: InventoryAuditLine[];
  userName?: string | null;
  completedAt?: Date | null;
  accuracyPercent?: number | null;
};

export type TruckInventory = InventoryAuditFields & {
  id: string;
  organizationId: string;
  vehicleName: string;
  vehicleType: VehicleType;
  licensePlate?: string | null;
  assignedUserName?: string | null;
  itemIds: string[];
  totalItems: number;
  totalValueCents: number;
};

export type CustomerInventoryAssignment = InventoryAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string | null;
  itemId: string;
  itemName?: string | null;
  sku?: string | null;
  quantity: number;
  storageBin?: string | null;
  storageLocation?: string | null;
  condition?: string | null;
  storageFeeCents?: number | null;
  returnDate?: Date | null;
  qrCode?: string | null;
};

export type JobMaterialAllocation = InventoryAuditFields & {
  id: string;
  organizationId: string;
  jobId: string;
  proposalId?: string | null;
  itemId: string;
  itemName?: string | null;
  sku?: string | null;
  quantity: number;
  status: MaterialAllocationStatus;
  warehouseLocation?: string | null;
  pickedAt?: Date | null;
};

export type InventoryForecast = InventoryAuditFields & {
  id: string;
  organizationId: string;
  itemId: string;
  itemName?: string | null;
  sku?: string | null;
  seasonalUsage: number;
  historicalUsage: number;
  upcomingInstalls: number;
  openProposals: number;
  suggestedReorderQty: number;
  forecastNotes?: string | null;
};

export type InventoryDashboardKpis = {
  totalInventoryValueCents: number;
  availableInventoryValueCents: number;
  assignedInventoryValueCents: number;
  customerOwnedValueCents: number;
  truckInventoryValueCents: number;
  damagedInventoryValueCents: number;
  reorderAlerts: number;
  lowStockCount: number;
  inventoryTurnover: number;
  inventoryAccuracyPercent: number;
};

export type InventoryAnalytics = {
  valueOverTime: Array<{ month: string; valueCents: number }>;
  topUsedItems: Array<{ name: string; sku: string; usage: number }>;
  slowMovingItems: Array<{ name: string; sku: string; daysIdle: number }>;
  seasonalConsumption: Array<{ category: string; quantity: number }>;
  turnoverRate: number;
};

export type PickListItem = {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  warehouseLocation: string;
  binLocation: string;
};

export type AiInventoryQuery = {
  answer: string;
  items: Array<{ id: string; sku: string; name: string; detail: string }>;
  recommendations: string[];
};

export const DEFAULT_CATEGORY_TREE: Array<{ group: InventoryCategoryGroup; name: string }> = [
  { group: 'lighting', name: 'C7 Bulbs' },
  { group: 'lighting', name: 'C9 Bulbs' },
  { group: 'lighting', name: 'Mini Lights' },
  { group: 'lighting', name: 'RGB Lights' },
  { group: 'lighting', name: 'Pixel Lights' },
  { group: 'lighting', name: 'Permanent Lighting' },
  { group: 'wire_components', name: 'Socket Wire' },
  { group: 'wire_components', name: 'SPT1' },
  { group: 'wire_components', name: 'SPT2' },
  { group: 'wire_components', name: 'Extension Cords' },
  { group: 'wire_components', name: 'Splitters' },
  { group: 'wire_components', name: 'Controllers' },
  { group: 'wire_components', name: 'Power Supplies' },
  { group: 'decor', name: 'Wreaths' },
  { group: 'decor', name: 'Garland' },
  { group: 'decor', name: 'Bows' },
  { group: 'decor', name: 'Pole Decorations' },
  { group: 'decor', name: 'Commercial Displays' },
  { group: 'installation_supplies', name: 'Clips' },
  { group: 'installation_supplies', name: 'Stakes' },
  { group: 'installation_supplies', name: 'Zip Ties' },
  { group: 'installation_supplies', name: 'Fasteners' },
  { group: 'installation_supplies', name: 'Anchors' },
  { group: 'equipment', name: 'Ladders' },
  { group: 'equipment', name: 'Lift Equipment' },
  { group: 'equipment', name: 'Safety Gear' },
  { group: 'equipment', name: 'Tools' },
];

export function computeAvailable(item: Pick<InventoryItemRecord, 'quantityOnHand' | 'quantityReserved' | 'quantityAssigned' | 'quantityDamaged' | 'quantityLost'>) {
  return Math.max(0, item.quantityOnHand - item.quantityReserved - item.quantityAssigned - item.quantityDamaged - item.quantityLost);
}

export function computeItemValue(item: Pick<InventoryItemRecord, 'quantityOnHand' | 'unitCostCents'>) {
  return item.quantityOnHand * item.unitCostCents;
}

export type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  available: number;
  reorderLevel: number;
  quantityDamaged: number;
  locationPath?: string | null;
};

export type InventoryLocationSummary = {
  locationKey: string;
  label: string;
  locationType: 'warehouse' | 'vehicle' | 'storage_bin' | 'unassigned';
  itemCount: number;
  totalQuantity: number;
  totalValueCents: number;
};
