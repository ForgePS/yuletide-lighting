/**
 * Portal Phase 2 S6 — transaction mutation guard, state transitions, idempotency.
 * Composes P2-S1..S5. ENVIRONMENT=EMULATOR for automated evidence.
 */
import type { PortalAction, PortalFeatureKey } from '@clcrm/types';
import { invoicePayableCents } from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import {
  asPortalAuth,
  requirePortalAuthorized,
  type PortalAuthInput,
  type PortalAuthorizedContext,
} from './portal360';
import {
  getPortalResourceScope,
  requirePortalOwnedRecord,
  type PortalResourceScope,
} from './portal-ownership';
import { colGet } from './firestore';
import { hashPortalSecret } from './portal-security';

export type PortalMutationDenialReason =
  | 'AUTH_REQUIRED'
  | 'FEATURE_DISABLED'
  | 'ACTION_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'INVALID_STATE'
  | 'STALE_RESOURCE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'PORTAL_UNAVAILABLE';

export class PortalMutationDeniedError extends Error {
  readonly code = 'PORTAL_MUTATION_DENIED' as const;
  readonly reason: PortalMutationDenialReason;
  constructor(reason: PortalMutationDenialReason, message = 'PORTAL_MUTATION_DENIED') {
    super(message);
    this.name = 'PortalMutationDeniedError';
    this.reason = reason;
  }
}

export class PortalStaleResourceError extends PortalMutationDeniedError {
  constructor() {
    super('STALE_RESOURCE', 'STALE_RESOURCE');
    this.name = 'PortalStaleResourceError';
  }
}

export type PortalResourceType =
  | 'proposal'
  | 'agreement'
  | 'mockup'
  | 'invoice'
  | 'service_request'
  | 'schedule_request'
  | 'message'
  | 'notification'
  | 'rebooking'
  | 'review'
  | 'contact'
  | 'job'
  | 'property';

/** Customer-facing transitions only. Unknown → DENY. */
const PORTAL_TRANSITIONS: Record<string, Record<string, string[]>> = {
  proposal: {
    sent: ['approved', 'rejected', 'customer_questions'],
    viewed: ['approved', 'rejected', 'customer_questions'],
    customer_questions: ['approved', 'rejected', 'customer_questions'],
  },
  agreement: {
    awaiting_signature: ['active'],
    // YL-S8: draft must be sent first (awaiting_signature) before public sign
  },
  mockup: {
    in_review: ['approved', 'revision_requested'],
    published: ['approved', 'revision_requested'],
    pending_approval: ['approved', 'revision_requested'],
    sent: ['approved', 'revision_requested'],
    customer_review: ['approved', 'revision_requested'],
  },
  rebooking: {
    not_sent: ['rebooked', 'upgrade_requested'],
    sent: ['rebooked', 'upgrade_requested'],
    opened: ['rebooked', 'upgrade_requested'],
  },
  service_request: {
    // create-only from portal
    '': ['reported'],
  },
  schedule_request: {
    '': ['requested'],
  },
};

export function canPortalTransition(args: {
  resourceType: PortalResourceType | string;
  currentState: string | null | undefined;
  targetState: string;
}): boolean {
  const table = PORTAL_TRANSITIONS[args.resourceType];
  if (!table) return false;
  const current = String(args.currentState ?? '');
  const allowed = table[current];
  if (!allowed) return false;
  return allowed.includes(args.targetState);
}

export function assertPortalTransition(args: {
  resourceType: PortalResourceType | string;
  currentState: string | null | undefined;
  targetState: string;
}): void {
  if (!canPortalTransition(args)) {
    throw new PortalMutationDeniedError('INVALID_STATE');
  }
}

export type PortalMutationContext = {
  authorized: PortalAuthorizedContext;
  scope: PortalResourceScope;
  feature: PortalFeatureKey;
  action: PortalAction;
  resource?: { type: string; id: string; status?: string | null };
};

const COLLECTION_BY_TYPE: Record<string, string> = {
  proposal: 'proposals',
  agreement: 'multiYearAgreements',
  mockup: 'mockups',
  invoice: 'invoices',
  job: 'jobs',
  property: 'properties',
  notification: 'portalNotifications',
  contact: 'contacts',
  rebooking: 'rebookingRecords',
  service_request: 'serviceIssues',
};

/**
 * Canonical portal mutation authorization. Does not replace requirePortalAuthorized —
 * composes it with ownership + optional state/idempotency preconditions.
 */
export async function requirePortalMutation(args: {
  auth: string | PortalAuthInput;
  feature: PortalFeatureKey;
  action: PortalAction;
  resource?: {
    type: PortalResourceType | string;
    id: string;
    expectedStatus?: string | string[];
    expectedUpdatedAtMs?: number;
  };
  settingsAllows?: boolean | ((settings: PortalAuthorizedContext['settings']) => boolean);
}): Promise<PortalMutationContext> {
  const authorized = await requirePortalAuthorized({
    ...asPortalAuth(args.auth),
    feature: args.feature,
    action: args.action,
    settingsAllows: args.settingsAllows,
  });
  const scope = getPortalResourceScope(authorized);

  let resource: PortalMutationContext['resource'];
  if (args.resource?.id) {
    const collection = COLLECTION_BY_TYPE[args.resource.type];
    if (!collection) {
      throw new PortalMutationDeniedError('RESOURCE_NOT_FOUND');
    }
    const record = await colGet<{
      id: string;
      customerId?: string;
      organizationId?: string;
      status?: string;
      updatedAt?: Date | { toMillis?: () => number };
    }>(scope.organizationId, collection, args.resource.id);
    requirePortalOwnedRecord({
      authorized,
      record,
      resourceType: args.resource.type,
    });
    const status = record?.status ?? null;
    if (args.resource.expectedStatus) {
      const allowed = Array.isArray(args.resource.expectedStatus)
        ? args.resource.expectedStatus
        : [args.resource.expectedStatus];
      if (!status || !allowed.includes(status)) {
        throw new PortalMutationDeniedError('INVALID_STATE');
      }
    }
    if (args.resource.expectedUpdatedAtMs != null && record?.updatedAt) {
      const ms =
        record.updatedAt instanceof Date
          ? record.updatedAt.getTime()
          : typeof record.updatedAt.toMillis === 'function'
            ? record.updatedAt.toMillis()
            : null;
      if (ms != null && ms !== args.resource.expectedUpdatedAtMs) {
        throw new PortalStaleResourceError();
      }
    }
    resource = { type: args.resource.type, id: args.resource.id, status };
  }

  return {
    authorized,
    scope,
    feature: args.feature,
    action: args.action,
    resource,
  };
}

type IdempotencyRecord = {
  keyHash: string;
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
  action: string;
  resourceId: string;
  resultJson: string;
  createdAt: ReturnType<typeof Timestamp.now> | Date;
};

function idempotencySecret(): string {
  return (
    process.env.PORTAL_IDEMPOTENCY_SECRET ||
    process.env.PORTAL_SESSION_SECRET ||
    'emulator-portal-idempotency-secret-not-for-production'
  );
}

function idempotencyDocId(scopeKey: string, clientKey: string): string {
  return hashPortalSecret(`${scopeKey}|${clientKey}`, idempotencySecret()).slice(0, 64);
}

/**
 * Claim or replay a portal mutation idempotency key.
 * Bound to org/customer/account/user/action/resource — cross-scope reuse DENY.
 */
export async function withPortalIdempotency<T>(args: {
  scope: PortalResourceScope;
  action: string;
  resourceId: string;
  clientKey: string | null | undefined;
  execute: () => Promise<T>;
}): Promise<{ result: T; replayed: boolean }> {
  const key = args.clientKey?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    return { result: await args.execute(), replayed: false };
  }

  const scopeKey = [
    args.scope.organizationId,
    args.scope.customerId,
    args.scope.portalAccountId,
    args.scope.portalUserId,
    args.action,
    args.resourceId,
  ].join('|');
  const docId = idempotencyDocId(scopeKey, key);
  const db = getAdminFirestore();
  const ref = db.doc(`organizations/${args.scope.organizationId}/portalIdempotencyKeys/${docId}`);

  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() as IdempotencyRecord;
    if (
      data.organizationId !== args.scope.organizationId ||
      data.customerId !== args.scope.customerId ||
      data.portalAccountId !== args.scope.portalAccountId ||
      data.portalUserId !== args.scope.portalUserId ||
      data.action !== args.action ||
      data.resourceId !== args.resourceId
    ) {
      throw new PortalMutationDeniedError('IDEMPOTENCY_CONFLICT');
    }
    return { result: JSON.parse(data.resultJson) as T, replayed: true };
  }

  const result = await args.execute();
  try {
    await ref.create({
      keyHash: docId,
      organizationId: args.scope.organizationId,
      customerId: args.scope.customerId,
      portalAccountId: args.scope.portalAccountId,
      portalUserId: args.scope.portalUserId,
      action: args.action,
      resourceId: args.resourceId,
      resultJson: JSON.stringify(result),
      createdAt: Timestamp.now(),
    });
  } catch {
    // Concurrent create — re-read winner
    const again = await ref.get();
    if (again.exists) {
      const data = again.data() as IdempotencyRecord;
      if (
        data.action !== args.action ||
        data.resourceId !== args.resourceId ||
        data.customerId !== args.scope.customerId
      ) {
        throw new PortalMutationDeniedError('IDEMPOTENCY_CONFLICT');
      }
      return { result: JSON.parse(data.resultJson) as T, replayed: true };
    }
  }
  return { result, replayed: false };
}

/** Server-authoritative payable amount for an invoice record. */
export function portalInvoicePayableCents(invoice: {
  status?: string | null;
  subtotalCents?: number | null;
  amountPaidCents?: number | null;
  depositCents?: number | null;
}): { payable: boolean; amountCents: number; reason?: string } {
  // YL-S13: shared pure helper (kept as portal alias for existing imports).
  return invoicePayableCents(invoice);
}

/**
 * True when Stripe charges must be blocked (emulator / explicit safe mode / missing key).
 * YL-S26: `sk_live` no longer forces safe mode by itself — require
 * `PORTAL_ALLOW_LIVE_PAYMENTS=1` for live keys. `sk_test` may charge without that flag.
 */
export function portalPaymentSafeMode(): boolean {
  if (process.env.PORTAL_PAYMENT_SAFE_MODE === '1') return true;
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return true;
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!key) return true;
  if (key.startsWith('sk_live') && process.env.PORTAL_ALLOW_LIVE_PAYMENTS !== '1') {
    return true;
  }
  return false;
}
