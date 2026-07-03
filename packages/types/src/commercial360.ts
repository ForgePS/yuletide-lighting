/** Commercial Property Management — Sprint 10 */

export type CommercialAccountStatus = 'active' | 'prospect' | 'on_hold' | 'archived';

export type CommercialContractStatus = 'draft' | 'active' | 'pending_renewal' | 'expired' | 'cancelled';

export type CommercialAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CommercialAccount = CommercialAuditFields & {
  id: string;
  organizationId: string;
  name: string;
  customerId?: string | null;
  billingContactId?: string | null;
  accountManagerId?: string | null;
  accountManagerName?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  status: CommercialAccountStatus;
  siteMapUrl?: string | null;
};

export type CommercialLocation = CommercialAuditFields & {
  id: string;
  commercialAccountId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  siteContactName?: string | null;
  siteContactPhone?: string | null;
  siteNotes?: string | null;
  propertyId?: string | null;
  mockupIds: string[];
  photoUrls: string[];
  maintenanceScheduleNotes?: string | null;
};

export type CommercialContract = CommercialAuditFields & {
  id: string;
  commercialAccountId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date | null;
  amountCents: number;
  status: CommercialContractStatus;
  maintenanceNotes?: string | null;
};

export type CommercialAccountDetail = CommercialAccount & {
  locations: CommercialLocation[];
  contracts: CommercialContract[];
  customerName?: string | null;
  locationCount: number;
  activeContractCount: number;
  totalRevenueCents: number;
};

export type CommercialDashboard = {
  totalAccounts: number;
  totalLocations: number;
  activeContracts: number;
  pendingRenewals: number;
  commercialRevenueCents: number;
  projectedRevenueCents: number;
};

export type CommercialAccountListItem = CommercialAccount & {
  locationCount: number;
  customerName?: string | null;
  activeContractCount: number;
};
