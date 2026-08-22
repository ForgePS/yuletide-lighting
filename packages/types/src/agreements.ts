export type MultiYearAgreementStatus =
  | 'draft'
  | 'awaiting_signature'
  | 'signed'
  | 'active'
  | 'renewal_due'
  | 'completed'
  | 'cancelled';

/** `active` is treated as signed-ish for display/workflow (legacy signed agreements). */
export function isAgreementSignedStatus(status: MultiYearAgreementStatus | string | null | undefined): boolean {
  return status === 'signed' || status === 'active';
}

/** YL-S8 — null-safe display label for agreement status badges. */
export function formatAgreementStatusLabel(status: MultiYearAgreementStatus | string | null | undefined): string {
  const value = typeof status === 'string' ? status : '';
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** YL-S8 — public `/a/[token]` may only collect signatures when awaiting_signature. */
export function canPublicSignAgreement(status: MultiYearAgreementStatus | string | null | undefined): boolean {
  return status === 'awaiting_signature';
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
