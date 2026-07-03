/** Review & Referral Engine — Sprint 12 */

import type { MessageAuditFields, MessageChannel } from './messages';

export type ReviewRequest360Status =
  | 'pending'
  | 'sent'
  | 'clicked'
  | 'submitted'
  | 'internal_feedback';

export type ReviewRequest360 = MessageAuditFields & {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string | null;
  jobId?: string | null;
  channel: MessageChannel;
  platform?: 'google' | 'facebook' | null;
  reviewUrl?: string | null;
  publicToken?: string | null;
  status: ReviewRequest360Status;
  rating?: number | null;
  feedback?: string | null;
  sentAt?: Date | null;
  clickedAt?: Date | null;
  submittedAt?: Date | null;
  referralCode?: string | null;
};

export type ReferralStatus = 'issued' | 'used' | 'rewarded' | 'expired';

export type ReferralRecord = MessageAuditFields & {
  id: string;
  organizationId: string;
  referringCustomerId: string;
  referringCustomerName?: string | null;
  referredCustomerId?: string | null;
  code: string;
  status: ReferralStatus;
  rewardAmountCents?: number | null;
  issuedAt: Date;
  usedAt?: Date | null;
  rewardedAt?: Date | null;
  notes?: string | null;
};

export type ReviewsDashboard = {
  requestsSent: number;
  reviewsCompleted: number;
  internalFeedback: number;
  referralsIssued: number;
  referralsUsed: number;
  avgRating: number | null;
  pendingFollowUp: number;
};

export type PublicReviewContext = {
  organization: {
    companyName: string;
    brandColor: string;
    logoUrl?: string | null;
  };
  customerName?: string | null;
  reviewRequest: Pick<
    ReviewRequest360,
    'id' | 'status' | 'rating' | 'feedback' | 'submittedAt'
  >;
  alreadySubmitted: boolean;
};

export type ReviewFeedbackResult = {
  route: 'google' | 'internal';
  googleReviewUrl?: string | null;
  message: string;
};
