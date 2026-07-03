import type { ServiceIssue, ServiceIssuePriority, ServiceIssueStatus } from '@clcrm/types';
import type { ServiceIssueInput, UpdateServiceIssueInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function issuePath(orgId: string) {
  return `organizations/${orgId}/serviceIssues`;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function mapDoc(data: Record<string, unknown>) {
  return mapTimestampsFromData(data) as ServiceIssue;
}

function normalizeIssueInput(input: ServiceIssueInput | UpdateServiceIssueInput) {
  return stripUndefined({
    customerId: emptyToNull(input.customerId),
    customerName: input.customerName?.trim(),
    propertyId: emptyToNull(input.propertyId),
    propertyLabel: emptyToNull(input.propertyLabel),
    jobId: emptyToNull(input.jobId),
    jobTitle: emptyToNull(input.jobTitle),
    title: input.title?.trim(),
    description: emptyToNull(input.description),
    category: input.category,
    priority: input.priority,
    status: input.status,
    warranty: input.warranty,
    assignedUserId: emptyToNull(input.assignedUserId),
    assignedUserName: emptyToNull(input.assignedUserName),
    scheduledAt: input.scheduledAt ?? undefined,
    resolvedAt: input.resolvedAt ?? undefined,
    closedAt: input.closedAt ?? undefined,
    resolutionNotes: emptyToNull(input.resolutionNotes),
    photoUrls: input.photoUrls,
    source: emptyToNull(input.source),
  });
}

function withStatusDates(
  status: ServiceIssueStatus | undefined,
  patch: Record<string, unknown>,
) {
  if (!status) return patch;
  const now = ts();
  if (status === 'resolved' && !patch.resolvedAt) patch.resolvedAt = now;
  if (status === 'closed' && !patch.closedAt) patch.closedAt = now;
  return patch;
}

export async function listServiceIssues360(
  orgId: string,
  opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ServiceIssueStatus;
    priority?: ServiceIssuePriority;
    customerId?: string;
    jobId?: string;
    warranty?: boolean;
  } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(issuePath(orgId)).orderBy('updatedAt', 'desc').get();
  } catch {
    snap = await db.collection(issuePath(orgId)).get();
  }

  let items = snap.docs.map((doc) => mapDoc({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  if (opts.status) items = items.filter((item) => item.status === opts.status);
  if (opts.priority) items = items.filter((item) => item.priority === opts.priority);
  if (opts.customerId) items = items.filter((item) => item.customerId === opts.customerId);
  if (opts.jobId) items = items.filter((item) => item.jobId === opts.jobId);
  if (opts.warranty !== undefined) items = items.filter((item) => item.warranty === opts.warranty);

  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((item) =>
      [
        item.customerName,
        item.propertyLabel,
        item.jobTitle,
        item.title,
        item.description,
        item.category,
        item.priority,
        item.status,
        item.assignedUserName,
        item.resolutionNotes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const summary = {
    totalIssues: items.length,
    openIssues: items.filter((item) => !['resolved', 'closed', 'cancelled'].includes(item.status)).length,
    urgentIssues: items.filter((item) => item.priority === 'urgent' || item.priority === 'high').length,
    warrantyIssues: items.filter((item) => item.warranty).length,
  };

  return { items: items.slice(start, start + pageSize), total, page, pageSize, summary };
}

export async function getServiceIssue360(orgId: string, issueId: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`${issuePath(orgId)}/${issueId}`).get();
  if (!snap.exists) return null;
  return mapDoc({ id: snap.id, ...snap.data()! });
}

export async function createServiceIssue360(orgId: string, input: ServiceIssueInput, userId?: string | null) {
  const db = getAdminFirestore();
  const ref = db.collection(issuePath(orgId)).doc();
  const now = ts();
  const base = normalizeIssueInput({
    ...input,
    status: input.status ?? 'reported',
    priority: input.priority ?? 'normal',
    category: input.category ?? 'other',
    warranty: input.warranty ?? false,
    photoUrls: input.photoUrls ?? [],
    source: input.source || 'manual',
  });
  const data = withStatusDates(base.status as ServiceIssueStatus | undefined, {
    organizationId: orgId,
    ...base,
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });
  await ref.set(data);
  return mapDoc({ id: ref.id, ...data });
}

export async function updateServiceIssue360(
  orgId: string,
  issueId: string,
  input: UpdateServiceIssueInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.doc(`${issuePath(orgId)}/${issueId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const patch = withStatusDates(input.status, {
    ...normalizeIssueInput(input),
    updatedAt: ts(),
    updatedBy: userId ?? null,
  });
  await ref.update(patch);
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}

export async function updateServiceIssueStatus360(
  orgId: string,
  issueId: string,
  input: { status: ServiceIssueStatus; resolutionNotes?: string | null },
  userId?: string | null,
) {
  return updateServiceIssue360(
    orgId,
    issueId,
    {
      status: input.status,
      resolutionNotes: input.resolutionNotes ?? undefined,
    },
    userId,
  );
}

export async function deleteServiceIssue360(orgId: string, issueId: string) {
  const db = getAdminFirestore();
  await db.doc(`${issuePath(orgId)}/${issueId}`).delete();
  return { success: true };
}
