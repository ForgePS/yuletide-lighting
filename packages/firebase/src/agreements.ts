import type { MultiYearAgreement, MultiYearAgreementStatus } from '@clcrm/types';
import type { MultiYearAgreementInput, UpdateMultiYearAgreementInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function agreementsPath(orgId: string) {
  return `organizations/${orgId}/multiYearAgreements`;
}

function emptyToNull(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function seasonCount(startSeason: number, endSeason: number) {
  return Math.max(1, endSeason - startSeason + 1);
}

function mapDoc(data: Record<string, unknown>) {
  return mapTimestampsFromData(data) as MultiYearAgreement;
}

function normalizeAgreementInput(input: MultiYearAgreementInput | UpdateMultiYearAgreementInput) {
  const years =
    input.startSeason !== undefined && input.endSeason !== undefined
      ? seasonCount(input.startSeason, input.endSeason)
      : undefined;
  return stripUndefined({
    customerId: emptyToNull(input.customerId),
    customerName: input.customerName?.trim(),
    propertyId: emptyToNull(input.propertyId),
    propertyLabel: emptyToNull(input.propertyLabel),
    title: input.title?.trim(),
    status: input.status,
    optionCode: input.optionCode?.trim(),
    optionLabel: input.optionLabel?.trim(),
    startSeason: input.startSeason,
    endSeason: input.endSeason,
    annualValueCents: input.annualValueCents,
    totalValueCents: years !== undefined && input.annualValueCents !== undefined
      ? years * input.annualValueCents
      : undefined,
    depositPercent: input.depositPercent,
    autoGenerateProjects: input.autoGenerateProjects,
    linkedProjectIds: input.linkedProjectIds,
    notes: emptyToNull(input.notes),
    source: emptyToNull(input.source),
    signedAt: input.signedAt ?? undefined,
    cancelledAt: input.cancelledAt ?? undefined,
    nextRenewalDate: input.nextRenewalDate ?? undefined,
  });
}

export async function listMultiYearAgreements360(
  orgId: string,
  opts: { page?: number; pageSize?: number; search?: string; status?: MultiYearAgreementStatus; customerId?: string } = {},
) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const db = getAdminFirestore();
  let snap;
  try {
    snap = await db.collection(agreementsPath(orgId)).orderBy('updatedAt', 'desc').get();
  } catch {
    snap = await db.collection(agreementsPath(orgId)).get();
  }
  let items = snap.docs.map((doc) => mapDoc({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  if (opts.status) items = items.filter((agreement) => agreement.status === opts.status);
  if (opts.customerId) items = items.filter((agreement) => agreement.customerId === opts.customerId);

  const search = opts.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((agreement) =>
      [
        agreement.title,
        agreement.customerName,
        agreement.propertyLabel,
        agreement.optionCode,
        agreement.optionLabel,
        agreement.status,
        agreement.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export async function getMultiYearAgreement360(orgId: string, agreementId: string) {
  const db = getAdminFirestore();
  const snap = await db.doc(`${agreementsPath(orgId)}/${agreementId}`).get();
  if (!snap.exists) return null;
  return mapDoc({ id: snap.id, ...snap.data()! });
}

export async function createMultiYearAgreement360(
  orgId: string,
  input: MultiYearAgreementInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.collection(agreementsPath(orgId)).doc();
  const now = ts();
  const data = {
    organizationId: orgId,
    ...normalizeAgreementInput({
      ...input,
      status: input.status ?? 'draft',
      optionCode: input.optionCode ?? 'A',
      optionLabel: input.optionLabel ?? 'Multi-year agreement',
      depositPercent: input.depositPercent ?? 50,
      autoGenerateProjects: input.autoGenerateProjects ?? true,
      linkedProjectIds: input.linkedProjectIds ?? [],
      source: input.source || 'manual',
    }),
    createdAt: now,
    updatedAt: now,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  };
  await ref.set(data);
  return mapDoc({ id: ref.id, ...data });
}

export async function updateMultiYearAgreement360(
  orgId: string,
  agreementId: string,
  input: UpdateMultiYearAgreementInput,
  userId?: string | null,
) {
  const db = getAdminFirestore();
  const ref = db.doc(`${agreementsPath(orgId)}/${agreementId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = snap.data() as MultiYearAgreement;
  const mergedInput = {
    ...input,
    startSeason: input.startSeason ?? current.startSeason,
    endSeason: input.endSeason ?? current.endSeason,
    annualValueCents: input.annualValueCents ?? current.annualValueCents,
  };
  const patch = {
    ...normalizeAgreementInput(mergedInput),
    updatedAt: ts(),
    updatedBy: userId ?? null,
  };
  await ref.update(patch);
  const updated = await ref.get();
  return mapDoc({ id: updated.id, ...updated.data()! });
}

export async function deleteMultiYearAgreement360(orgId: string, agreementId: string) {
  const db = getAdminFirestore();
  await db.doc(`${agreementsPath(orgId)}/${agreementId}`).delete();
  return { success: true };
}

export async function linkProjectToAgreement360(
  orgId: string,
  agreementId: string,
  projectId: string,
  userId?: string | null,
) {
  const agreement = await getMultiYearAgreement360(orgId, agreementId);
  if (!agreement) return null;
  const linkedProjectIds = Array.from(new Set([...(agreement.linkedProjectIds ?? []), projectId]));
  return updateMultiYearAgreement360(orgId, agreementId, { linkedProjectIds }, userId);
}
