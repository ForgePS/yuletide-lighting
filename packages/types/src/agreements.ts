export type MultiYearAgreementStatus =
  | 'draft'
  | 'active'
  | 'renewal_due'
  | 'completed'
  | 'cancelled';

export type MultiYearAgreement = {
  id: string;
  organizationId: string;
  customerId?: string | null;
  customerName: string;
  propertyId?: string | null;
  propertyLabel?: string | null;
  title: string;
  status: MultiYearAgreementStatus;
  optionCode: string;
  optionLabel: string;
  startSeason: number;
  endSeason: number;
  annualValueCents: number;
  totalValueCents: number;
  depositPercent: number;
  autoGenerateProjects: boolean;
  linkedProjectIds: string[];
  notes?: string | null;
  source?: string | null;
  signedAt?: Date | null;
  cancelledAt?: Date | null;
  nextRenewalDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type MultiYearAgreementListResult = {
  items: MultiYearAgreement[];
  total: number;
  page: number;
  pageSize: number;
};
