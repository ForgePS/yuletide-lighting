export type ProjectPrepStatus =
  | 'pending'
  | 'pulling'
  | 'partially_pulled'
  | 'to_be_ordered'
  | 'ordered'
  | 'checked_in'
  | 'packed'
  | 'ready'
  | 'cancelled';

export type ProjectPrepItem = {
  id: string;
  organizationId: string;
  customerId?: string | null;
  customerName?: string | null;
  jobId?: string | null;
  jobTitle: string;
  proposalId?: string | null;
  inventoryItemId?: string | null;
  sku?: string | null;
  itemName: string;
  category?: string | null;
  status: ProjectPrepStatus;
  quantityNeeded: number;
  quantityPulled: number;
  quantityOrdered: number;
  quantityCheckedIn: number;
  storageLocation?: string | null;
  truckId?: string | null;
  truckName?: string | null;
  vendorName?: string | null;
  dueDate?: Date | null;
  notes?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProjectPrepSummary = {
  totalItems: number;
  readyItems: number;
  orderNeededItems: number;
  blockedItems: number;
};
