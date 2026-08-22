/**
 * Phase 0 record-path freeze.
 *
 * Source of truth:
 * - Properties → organizations/{orgId}/properties (customerId FK)
 * - Jobs → organizations/{orgId}/jobs
 *
 * Legacy dual paths under customers/{id}/properties|jobs remain read/compat only.
 * Do not invent a third store. See docs/phase0-migration-map.md.
 */

import { createProperty, type PropertyRecord } from './firestore';
import { colCreate } from './firestore';

export function orgCollectionPath(orgId: string, collection: string) {
  return `organizations/${orgId}/${collection}`;
}

export function assertOrgScopedIds(
  orgId: string,
  data: { organizationId?: string | null; customerId?: string | null },
) {
  if (data.organizationId && data.organizationId !== orgId) {
    throw new Error('Tenant isolation violation: organizationId does not match auth org');
  }
  if (data.customerId !== undefined && data.customerId !== null && !String(data.customerId).trim()) {
    throw new Error('customerId is required for this relationship');
  }
}

/** Canonical property write — org collection only. */
export async function createOrgProperty(
  orgId: string,
  data: Omit<PropertyRecord, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>,
) {
  if (!data.customerId?.trim()) {
    throw new Error('createOrgProperty requires customerId');
  }
  assertOrgScopedIds(orgId, { organizationId: orgId, customerId: data.customerId });
  return createProperty(orgId, data);
}

export type CreateOrgJobInput = {
  customerId: string;
  title: string;
  stage?: string;
  propertyId?: string | null;
  proposalId?: string | null;
  jobType?: string | null;
  subtotalCents?: number | null;
  installNotes?: string | null;
  internalNotes?: string | null;
  assignedCrewUserId?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
};

/** Canonical job write — org-level jobs collection. */
export async function createOrgJob(orgId: string, input: CreateOrgJobInput) {
  if (!input.customerId?.trim()) {
    throw new Error('createOrgJob requires customerId');
  }
  if (!input.title?.trim()) {
    throw new Error('createOrgJob requires title');
  }
  assertOrgScopedIds(orgId, { organizationId: orgId, customerId: input.customerId });
  return colCreate(orgId, 'jobs', {
    organizationId: orgId,
    customerId: input.customerId,
    title: input.title.trim(),
    // YL-S9: default into pipeline board (legacy `pending` was an orphan column).
    stage: input.stage ?? 'accepted_proposal',
    propertyId: input.propertyId ?? null,
    proposalId: input.proposalId ?? null,
    jobType: input.jobType ?? null,
    subtotalCents: input.subtotalCents ?? null,
    installNotes: input.installNotes ?? null,
    internalNotes: input.internalNotes ?? null,
    assignedCrewUserId: input.assignedCrewUserId ?? null,
    scheduledStart: input.scheduledStart ?? null,
    scheduledEnd: input.scheduledEnd ?? null,
  });
}
