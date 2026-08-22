/**
 * Portal Phase 2 S4 — canonical customer resource scope + ownership assertions.
 * ENVIRONMENT=EMULATOR for automated evidence. Fail closed on unknown ownership.
 */
import type { PortalAuthorizedContext } from './portal360';

export type PortalResourceScope = {
  organizationId: string;
  customerId: string;
  portalAccountId: string;
  portalUserId: string;
};

export class PortalResourceNotFoundError extends Error {
  readonly code = 'PORTAL_RESOURCE_NOT_FOUND';
  readonly internalReason: string;

  constructor(internalReason = 'OWNERSHIP_MISMATCH') {
    super('PORTAL_RESOURCE_NOT_FOUND');
    this.name = 'PortalResourceNotFoundError';
    this.internalReason = internalReason;
  }
}

/** Extract trusted portal resource scope — never from client input. */
export function getPortalResourceScope(authorized: PortalAuthorizedContext): PortalResourceScope {
  const organizationId = authorized.organizationId;
  const customerId = authorized.customer?.id;
  const portalAccountId = authorized.account?.id;
  const portalUserId = authorized.actingUser?.id;
  if (!organizationId || !customerId || !portalAccountId || !portalUserId) {
    throw new PortalResourceNotFoundError('MISSING_AUTHORITATIVE_SCOPE');
  }
  return { organizationId, customerId, portalAccountId, portalUserId };
}

export type PortalOwnedRecord = {
  id?: string;
  organizationId?: string | null;
  customerId?: string | null;
};

/**
 * Assert a loaded record belongs to the authorized portal customer.
 * Missing customerId fails closed (no name/email reconstruction here).
 */
export function requirePortalOwnedRecord(args: {
  authorized: PortalAuthorizedContext;
  record: PortalOwnedRecord | null | undefined;
  resourceType: string;
}): asserts args is {
  authorized: PortalAuthorizedContext;
  record: PortalOwnedRecord & { customerId: string };
  resourceType: string;
} {
  const scope = getPortalResourceScope(args.authorized);
  const record = args.record;
  if (!record) {
    throw new PortalResourceNotFoundError(`${args.resourceType}_MISSING`);
  }
  if (record.organizationId != null && record.organizationId !== scope.organizationId) {
    throw new PortalResourceNotFoundError(`${args.resourceType}_TENANT_MISMATCH`);
  }
  if (!record.customerId || record.customerId !== scope.customerId) {
    throw new PortalResourceNotFoundError(`${args.resourceType}_CUSTOMER_MISMATCH`);
  }
}

/** Soft check used when filtering nested lists. */
export function isPortalOwnedRecord(
  authorized: PortalAuthorizedContext,
  record: PortalOwnedRecord | null | undefined,
): boolean {
  try {
    requirePortalOwnedRecord({ authorized, record, resourceType: 'record' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitized ownership denial telemetry — never include record bodies / PII payloads.
 */
export function portalOwnershipDenialTelemetry(input: {
  organizationId: string;
  customerId: string;
  portalAccountId?: string;
  portalUserId?: string;
  resourceType: string;
  operation: string;
  internalReason: string;
}): Record<string, string> {
  return {
    event: 'portal.ownership_denied',
    organizationId: input.organizationId,
    customerId: input.customerId,
    portalAccountId: input.portalAccountId ?? '',
    portalUserId: input.portalUserId ?? '',
    resourceType: input.resourceType,
    operation: input.operation,
    internalReason: input.internalReason,
  };
}
