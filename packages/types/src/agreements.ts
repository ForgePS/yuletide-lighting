export type MultiYearAgreementStatus =
  | 'draft'
  | 'awaiting_signature'
  | 'signed'
  | 'active'
  | 'renewal_due'
  | 'completed'
  | 'cancelled';

/** `active` is treated as signed-ish for display/workflow (legacy signed agreements). */
export function isAgreementSignedStatus(status: MultiYearAgreementStatus): boolean {
  return status === 'signed' || status === 'active';
}

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
  publicToken?: string | null;
  signedByName?: string | null;
  signerIp?: string | null;
  signatureData?: string | null;
  termsVersion?: string | null;
  signedDocumentUrl?: string | null;
  proposalId?: string | null;
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
