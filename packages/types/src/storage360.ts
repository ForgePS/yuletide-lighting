/** Customer Storage Management — Sprint 8 */

export type StorageRecordType = 'customer_owned' | 'company_owned' | 'mixed';

export type StorageRecordStatus = 'stored' | 'pulled' | 'discarded' | 'returned';

export type StoredItemCondition = 'good' | 'fair' | 'damaged' | 'discard';

export type StorageAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type StorageRecord = StorageAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  jobId?: string | null;
  storageType: StorageRecordType;
  binNumber: string;
  locationId: string;
  rack?: string | null;
  shelf?: string | null;
  status: StorageRecordStatus;
  storedAt: Date;
  pulledAt?: Date | null;
  conditionNotes?: string | null;
  photos: string[];
  storageFeeCents?: number | null;
  agreementSignedAt?: Date | null;
};

export type StoredItem = StorageAuditFields & {
  id: string;
  storageRecordId: string;
  name: string;
  quantity: number;
  condition: StoredItemCondition;
  notes?: string | null;
};

export type StorageRecordWithCustomer = StorageRecord & {
  customerName: string;
  propertyAddress?: string | null;
  itemCount: number;
};

export type StorageDashboard = {
  totalRecords: number;
  stored: number;
  pulled: number;
  awaitingBin: number;
  totalStorageFeesCents: number;
};

export type StoragePullSheetLine = {
  storageRecordId: string;
  customerId: string;
  customerName: string;
  jobId?: string | null;
  propertyAddress?: string | null;
  binNumber: string;
  locationId: string;
  rack?: string | null;
  shelf?: string | null;
  items: Array<{ name: string; quantity: number; condition: StoredItemCondition }>;
};

export type StoragePullSheet = {
  generatedAt: Date;
  filters: {
    customerId?: string | null;
    jobId?: string | null;
    date?: string | null;
  };
  lines: StoragePullSheetLine[];
};

/** YL-S15 — null-safe storage status / type / condition labels. */
export function formatStorageLabel(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'Unknown';
  return text
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export const formatStorageStatusLabel = formatStorageLabel;
export const formatStorageTypeLabel = formatStorageLabel;
export const formatStoredItemConditionLabel = formatStorageLabel;
