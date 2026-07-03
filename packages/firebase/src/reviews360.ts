import type {
  PublicReviewContext,
  ReferralRecord,
  ReviewFeedbackResult,
  ReviewRequest360,
  ReviewsDashboard,
} from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { colCreate, colGet, colList, colUpdate, getOrganization, nanoid } from './firestore';
import { mapTimestampsFromData } from './firestore-utils';
import { sendMessage360 } from './messages360';
import { logCustomerActivity } from './customer360';
import { syncCustomerPipelineFromJob } from './jobs360';

function appBase() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
}

function mapReview(raw: Record<string, unknown>, id: string): ReviewRequest360 {
  return mapTimestampsFromData({ id, ...raw }) as unknown as ReviewRequest360;
}

function mapReferral(raw: Record<string, unknown>, id: string): ReferralRecord {
  return mapTimestampsFromData({ id, ...raw }) as unknown as ReferralRecord;
}

async function findReviewByToken(token: string): Promise<(ReviewRequest360 & { _orgId: string }) | null> {
  const db = getAdminFirestore();
  const snap = await db.collectionGroup('reviewRequests').where('publicToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  const orgId = doc.ref.parent.parent?.id;
  if (!orgId) return null;
  return { ...mapReview(doc.data() as Record<string, unknown>, doc.id), _orgId: orgId };
}

function referralCodeFromName(firstName: string) {
  const prefix = firstName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'GIFT';
  return `${prefix}${nanoid(4).toUpperCase()}`;
}

function pickChannel(customer: { phone?: string | null; mobilePhone?: string | null; email?: string | null; preferredContactMethod?: string | null }) {
  if (customer.preferredContactMethod === 'email' && customer.email) return 'email' as const;
  if (customer.preferredContactMethod === 'sms' && (customer.mobilePhone || customer.phone)) return 'sms' as const;
  if (customer.mobilePhone || customer.phone) return 'sms' as const;
  if (customer.email) return 'email' as const;
  return 'sms' as const;
}

export async function listReviewRequests360(orgId: string): Promise<ReviewRequest360[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'reviewRequests');
  return rows
    .map((r) => mapReview(r, String(r.id)))
    .sort((a, b) => (b.sentAt?.getTime() ?? b.createdAt.getTime()) - (a.sentAt?.getTime() ?? a.createdAt.getTime()));
}

export async function getReviewsDashboard(orgId: string): Promise<ReviewsDashboard> {
  const reviews = await listReviewRequests360(orgId);
  const referrals = await listReferrals(orgId);
  const rated = reviews.filter((r) => r.rating != null);
  const avgRating = rated.length
    ? Math.round((rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length) * 10) / 10
    : null;

  return {
    requestsSent: reviews.filter((r) => r.status !== 'pending').length,
    reviewsCompleted: reviews.filter((r) => r.status === 'submitted').length,
    internalFeedback: reviews.filter((r) => r.status === 'internal_feedback').length,
    referralsIssued: referrals.length,
    referralsUsed: referrals.filter((r) => r.status === 'used' || r.status === 'rewarded').length,
    avgRating,
    pendingFollowUp: reviews.filter((r) => r.status === 'sent' || r.status === 'clicked').length,
  };
}

export async function sendReviewRequest360(
  orgId: string,
  input: {
    customerId: string;
    jobId?: string;
    channel?: ReviewRequest360['channel'];
    platform?: 'google' | 'facebook';
  },
  userId?: string | null,
): Promise<ReviewRequest360 | null> {
  const customer = await colGet<{
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    mobilePhone?: string | null;
    email?: string | null;
    preferredContactMethod?: string | null;
  }>(orgId, 'customers', input.customerId);
  if (!customer) return null;

  if (input.jobId) {
    const existing = (await listReviewRequests360(orgId)).find(
      (r) => r.jobId === input.jobId && r.status !== 'pending',
    );
    if (existing) return existing;
  }

  const org = await getOrganization(orgId);
  const platform = input.platform ?? 'google';
  const reviewUrl = platform === 'google' ? org?.reviewGoogleUrl : org?.reviewFacebookUrl;
  const customerName = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer';
  const channel = input.channel ?? pickChannel(customer);
  const publicToken = nanoid(32);
  const reviewPageUrl = `${appBase()}/review/${publicToken}`;
  const referral = await ensureReferralCode(orgId, input.customerId, userId);

  const request = (await colCreate(orgId, 'reviewRequests', {
    organizationId: orgId,
    customerId: input.customerId,
    customerName,
    jobId: input.jobId ?? null,
    channel,
    platform,
    reviewUrl: reviewUrl ?? null,
    publicToken,
    status: 'pending',
    rating: null,
    feedback: null,
    referralCode: referral?.code ?? null,
    sentAt: null,
    clickedAt: null,
    submittedAt: null,
    createdBy: userId,
    updatedBy: userId,
  })) as ReviewRequest360;

  const referralLine = referral ? ` Share code ${referral.code} with friends for a reward.` : '';
  await sendMessage360(
    orgId,
    {
      customerId: input.customerId,
      channel,
      body: `Hi ${customerName}! Thank you for choosing ${org?.companyName ?? 'us'}. How did we do? Rate your experience: ${reviewPageUrl}${referralLine}`,
    },
    userId,
    'Review Engine',
  );

  await colUpdate(orgId, 'reviewRequests', request.id, { status: 'sent', sentAt: new Date() });

  if (input.jobId) {
    await colUpdate(orgId, 'jobs', input.jobId, { stage: 'review_requested', updatedAt: new Date() });
    await syncCustomerPipelineFromJob(orgId, input.customerId, 'installed', userId);
  }

  await logCustomerActivity(
    orgId,
    input.customerId,
    channel === 'sms' ? 'sms_sent' : 'email_sent',
    'Review request sent after installation',
    userId,
  );

  return colGet<ReviewRequest360>(orgId, 'reviewRequests', request.id);
}

export async function triggerReviewRequestForJob(
  orgId: string,
  jobId: string,
  userId?: string | null,
): Promise<ReviewRequest360 | null> {
  const job = await colGet<{ customerId?: string; stage?: string }>(orgId, 'jobs', jobId);
  if (!job?.customerId) return null;
  if (job.stage === 'review_requested' || job.stage === 'complete') {
    const existing = (await listReviewRequests360(orgId)).find((r) => r.jobId === jobId);
    if (existing) return existing;
  }
  return sendReviewRequest360(
    orgId,
    { customerId: job.customerId, jobId, platform: 'google' },
    userId,
  );
}

export async function getPublicReviewByToken(token: string): Promise<PublicReviewContext | null> {
  const found = await findReviewByToken(token);
  if (!found) return null;
  const { _orgId, ...review } = found;
  const org = await getOrganization(_orgId);
  if (!org) return null;

  if (review.status === 'sent') {
    await colUpdate(_orgId, 'reviewRequests', review.id, { status: 'clicked', clickedAt: new Date() });
    review.status = 'clicked';
  }

  const alreadySubmitted = review.status === 'submitted' || review.status === 'internal_feedback';

  return {
    organization: {
      companyName: org.companyName,
      brandColor: org.brandColor,
      logoUrl: org.logoUrl,
    },
    customerName: review.customerName,
    reviewRequest: {
      id: review.id,
      status: review.status,
      rating: review.rating,
      feedback: review.feedback,
      submittedAt: review.submittedAt,
    },
    alreadySubmitted,
  };
}

export async function submitReviewFeedback(
  token: string,
  rating: number,
  feedback?: string | null,
): Promise<ReviewFeedbackResult | null> {
  const found = await findReviewByToken(token);
  if (!found) return null;
  const { _orgId: orgId, ...review } = found;

  if (review.status === 'submitted' || review.status === 'internal_feedback') {
    return {
      route: review.status === 'submitted' ? 'google' : 'internal',
      message: 'Thank you — your feedback was already recorded.',
    };
  }

  const org = await getOrganization(orgId);
  const now = new Date();

  if (rating >= 4) {
    await colUpdate(orgId, 'reviewRequests', review.id, {
      status: 'submitted',
      rating,
      feedback: feedback ?? null,
      submittedAt: now,
    });
    await logCustomerActivity(orgId, review.customerId, 'note_added', `Positive review (${rating}/5) — routed to Google`);
    if (review.jobId) {
      await colUpdate(orgId, 'jobs', review.jobId, { stage: 'complete', updatedAt: now });
    }
    return {
      route: 'google',
      googleReviewUrl: org?.reviewGoogleUrl ?? review.reviewUrl,
      message: 'Thank you! Please share your experience on Google.',
    };
  }

  await colUpdate(orgId, 'reviewRequests', review.id, {
    status: 'internal_feedback',
    rating,
    feedback: feedback ?? null,
    submittedAt: now,
  });
  await logCustomerActivity(
    orgId,
    review.customerId,
    'note_added',
    `Internal feedback (${rating}/5): ${feedback ?? 'No additional comments'}`,
  );

  return {
    route: 'internal',
    message: 'Thank you for your honest feedback. Our team will follow up with you shortly.',
  };
}

export async function listReferrals(orgId: string, customerId?: string): Promise<ReferralRecord[]> {
  const rows = await colList<Record<string, unknown>>(orgId, 'referrals');
  const filtered = customerId ? rows.filter((r) => r.referringCustomerId === customerId) : rows;
  return filtered
    .map((r) => mapReferral(r, String(r.id)))
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
}

export async function ensureReferralCode(
  orgId: string,
  customerId: string,
  userId?: string | null,
  rewardAmountCents?: number | null,
): Promise<ReferralRecord | null> {
  const existing = (await listReferrals(orgId, customerId)).find((r) => r.status === 'issued');
  if (existing) return existing;

  const customer = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', customerId);
  if (!customer) return null;

  const customerName = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer';
  let code = referralCodeFromName(customer.firstName ?? 'GIFT');
  const allCodes = new Set((await listReferrals(orgId)).map((r) => r.code));
  while (allCodes.has(code)) {
    code = referralCodeFromName(customer.firstName ?? 'GIFT');
  }

  return colCreate(orgId, 'referrals', {
    organizationId: orgId,
    referringCustomerId: customerId,
    referringCustomerName: customerName,
    referredCustomerId: null,
    code,
    status: 'issued',
    rewardAmountCents: rewardAmountCents ?? null,
    issuedAt: new Date(),
    usedAt: null,
    rewardedAt: null,
    notes: null,
    createdBy: userId,
    updatedBy: userId,
  }) as Promise<ReferralRecord>;
}

export async function createReferralCode(
  orgId: string,
  customerId: string,
  rewardAmountCents?: number | null,
  notes?: string | null,
  userId?: string | null,
): Promise<ReferralRecord | null> {
  const referral = await ensureReferralCode(orgId, customerId, userId, rewardAmountCents);
  if (referral && notes) {
    await colUpdate(orgId, 'referrals', referral.id, { notes, updatedBy: userId });
    return colGet<ReferralRecord>(orgId, 'referrals', referral.id);
  }
  return referral;
}

export async function redeemReferralCode(
  orgId: string,
  code: string,
  referredCustomerId: string,
  userId?: string | null,
): Promise<ReferralRecord | null> {
  const normalized = code.trim().toUpperCase();
  const referral = (await listReferrals(orgId)).find(
    (r) => r.code.toUpperCase() === normalized && r.status === 'issued',
  );
  if (!referral) return null;

  await colUpdate(orgId, 'referrals', referral.id, {
    status: 'used',
    referredCustomerId,
    usedAt: new Date(),
    updatedBy: userId,
  });

  const referred = await colGet<{ firstName?: string; lastName?: string }>(orgId, 'customers', referredCustomerId);
  if (referred) {
    await colUpdate(orgId, 'customers', referredCustomerId, {
      referralSource: `referral:${referral.code}`,
      updatedAt: new Date(),
    });
  }

  await logCustomerActivity(
    orgId,
    referral.referringCustomerId,
    'note_added',
    `Referral code ${referral.code} redeemed by new customer`,
    userId,
  );

  return colGet<ReferralRecord>(orgId, 'referrals', referral.id);
}

export async function markReferralRewarded(
  orgId: string,
  referralId: string,
  userId?: string | null,
): Promise<ReferralRecord | null> {
  const referral = await colGet<ReferralRecord>(orgId, 'referrals', referralId);
  if (!referral || referral.status !== 'used') return null;
  await colUpdate(orgId, 'referrals', referralId, {
    status: 'rewarded',
    rewardedAt: new Date(),
    updatedBy: userId,
  });
  return colGet<ReferralRecord>(orgId, 'referrals', referralId);
}
