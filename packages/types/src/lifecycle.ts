/**
 * YL-S23 — Full lifecycle smoke helpers (lead → proposal → pay → job → removal → renewal).
 * Pure predicates only — no Admin SDK / Firestore.
 */

import { isValidPublicAccessToken, parsePublicAccessToken } from './public-token';
import type { AppointmentType } from './schedule';

/** Canonical org job stages for the BACKLOG-006 happy path (subset of full pipeline). */
export const LIFECYCLE_JOB_STAGES = [
  'accepted_proposal',
  'deposit_paid',
  'scheduled',
  'installed',
  'removal_scheduled',
  'removed',
] as const;

export type LifecycleJobStage = (typeof LIFECYCLE_JOB_STAGES)[number];

export type PublicAccessLinkKind = 'proposal' | 'invoice' | 'agreement' | 'review' | 'mockup';

const PUBLIC_ACCESS_PATH_PREFIX: Record<PublicAccessLinkKind, string> = {
  proposal: '/p',
  invoice: '/pay',
  agreement: '/a',
  review: '/review',
  mockup: '/m',
};

/** Deposit cents from proposal fields (matches acceptance invoice creation intent). */
export function computeProposalDepositCents(input: {
  depositAmountCents?: number | null;
  depositPercent?: number | null;
  subtotalCents?: number | null;
}): number {
  const explicit = Number(input.depositAmountCents ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const subtotal = Math.max(0, Number(input.subtotalCents ?? 0));
  const percent = Math.min(100, Math.max(0, Number(input.depositPercent ?? 0)));
  return Math.round(subtotal * (percent / 100));
}

/**
 * Build a public CRM path only when the token is secret-shaped (YL-S22).
 * Returns null for weak/empty tokens (fail closed).
 */
export function buildPublicAccessPath(
  kind: PublicAccessLinkKind,
  token: string | null | undefined,
): string | null {
  const parsed = parsePublicAccessToken(token);
  if (!parsed || !isValidPublicAccessToken(parsed)) return null;
  return `${PUBLIC_ACCESS_PATH_PREFIX[kind]}/${parsed}`;
}

/** Appointment schedule → job/pipeline stage (shared with jobs360 sync maps). */
export function jobStageFromAppointmentSchedule(
  appointmentType: AppointmentType | string | null | undefined,
): LifecycleJobStage | null {
  switch (appointmentType) {
    case 'installation':
    case 'permanent_lighting_install':
    case 'commercial_project':
      return 'scheduled';
    case 'takedown':
      return 'removal_scheduled';
    default:
      return null;
  }
}

/** Appointment completion → job/pipeline stage (shared with schedule360 complete). */
export function jobStageFromAppointmentComplete(
  appointmentType: AppointmentType | string | null | undefined,
): LifecycleJobStage | null {
  switch (appointmentType) {
    case 'installation':
    case 'permanent_lighting_install':
    case 'commercial_project':
      return 'installed';
    case 'takedown':
      return 'removed';
    default:
      return null;
  }
}

export function lifecycleJobStageIndex(stage: string | null | undefined): number {
  if (!stage) return -1;
  return (LIFECYCLE_JOB_STAGES as readonly string[]).indexOf(stage);
}

/** True when `next` is at or after `current` on the lifecycle happy path. */
export function isLifecycleJobStageAtOrAfter(
  current: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const a = lifecycleJobStageIndex(current);
  const b = lifecycleJobStageIndex(next);
  if (a < 0 || b < 0) return false;
  return b >= a;
}

/**
 * Pipeline stages that are eligible to enter rebooking season workflows.
 * Aligns with rebooking360 targeting stored / removed / rebook_next_season customers.
 */
export function isRebookingEligiblePipelineStage(stage: string | null | undefined): boolean {
  return stage === 'stored' || stage === 'removed' || stage === 'rebook_next_season';
}

export type LifecycleSmokeHop =
  | 'lead'
  | 'proposal'
  | 'pay'
  | 'job'
  | 'removal'
  | 'renewal';

/**
 * Advance an in-memory lifecycle snapshot through BACKLOG-006 hops.
 * Used by unit smoke — does not write Firestore.
 */
export function advanceLifecycleSmoke(
  hop: LifecycleSmokeHop,
  state: {
    pipelineStage?: string | null;
    jobStage?: string | null;
    proposalToken?: string | null;
    invoiceToken?: string | null;
    depositPaid?: boolean;
    rebookEligible?: boolean;
  },
): {
  pipelineStage: string;
  jobStage: string;
  proposalPath: string | null;
  payPath: string | null;
  depositPaid: boolean;
  rebookEligible: boolean;
} {
  let pipelineStage = state.pipelineStage ?? 'new_lead';
  let jobStage = state.jobStage ?? 'accepted_proposal';
  let depositPaid = Boolean(state.depositPaid);
  let rebookEligible = Boolean(state.rebookEligible);

  switch (hop) {
    case 'lead':
      pipelineStage = 'new_lead';
      break;
    case 'proposal':
      pipelineStage = 'proposal_sent';
      jobStage = 'accepted_proposal';
      break;
    case 'pay':
      depositPaid = true;
      jobStage = 'deposit_paid';
      pipelineStage = 'deposit_paid';
      break;
    case 'job':
      jobStage = 'scheduled';
      pipelineStage = 'scheduled';
      break;
    case 'removal': {
      const completed = jobStageFromAppointmentComplete('takedown');
      jobStage = completed ?? 'removed';
      pipelineStage = jobStage;
      break;
    }
    case 'renewal':
      rebookEligible = isRebookingEligiblePipelineStage(pipelineStage) || pipelineStage === 'removed';
      if (rebookEligible) pipelineStage = 'rebook_next_season';
      break;
  }

  return {
    pipelineStage,
    jobStage,
    proposalPath: buildPublicAccessPath('proposal', state.proposalToken),
    payPath: buildPublicAccessPath('invoice', state.invoiceToken),
    depositPaid,
    rebookEligible,
  };
}
