/** Seasonal Rebooking Engine — Sprint 9 */

export type RebookingCampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type RebookingRecordStatus =
  | 'not_sent'
  | 'sent'
  | 'opened'
  | 'rebooked'
  | 'upgrade_requested'
  | 'declined'
  | 'no_response';

export type RebookingAuditFields = {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type RebookingCampaign = RebookingAuditFields & {
  id: string;
  organizationId: string;
  seasonYear: number;
  name: string;
  status: RebookingCampaignStatus;
  startDate?: Date | null;
  targetCustomerIds: string[];
  totalProjectedRevenueCents: number;
  totalBookedRevenueCents: number;
  emailSubject?: string | null;
  emailBody?: string | null;
};

export type RebookingRecord = RebookingAuditFields & {
  id: string;
  organizationId: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  previousProposalId?: string | null;
  previousJobId?: string | null;
  newProposalId?: string | null;
  status: RebookingRecordStatus;
  projectedValueCents: number;
  bookedValueCents: number;
  preferredInstallDate?: Date | null;
  preferredMonth?: string | null;
  lastContactedAt?: Date | null;
  notes?: string | null;
};

export type RebookingDashboard = {
  activeCampaigns: number;
  totalTargets: number;
  notSent: number;
  sent: number;
  rebooked: number;
  declined: number;
  projectedRevenueCents: number;
  bookedRevenueCents: number;
  conversionRatePercent: number;
};

export type RebookingRecordWithCustomer = RebookingRecord & {
  customerEmail?: string | null;
  customerPhone?: string | null;
  previousProposalTitle?: string | null;
};
