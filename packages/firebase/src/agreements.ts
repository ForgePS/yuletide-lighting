import type { MultiYearAgreement, MultiYearAgreementStatus } from '@clcrm/types';
import { isAgreementSignedStatus, parsePublicAccessToken } from '@clcrm/types';
import type { MultiYearAgreementInput, UpdateMultiYearAgreementInput } from '@clcrm/validators';
import { getAdminFirestore, Timestamp } from './admin';
import { getByPublicToken, getOrganization, generatePublicAccessToken } from './firestore';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

export const AGREEMENT_TERMS_VERSION = '2026.1';

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
    customerName:
      input.customerName !== undefined ? input.customerName.trim() || 'Unassigned' : undefined,
    propertyId: emptyToNull(input.propertyId),
    propertyLabel: emptyToNull(input.propertyLabel),
    title: input.title?.trim(),
    status: input.status,
    optionCode: input.optionCode?.trim(),
    optionLabel: input.optionLabel?.trim(),
    startSeason: input.startSeason,
    endSeason: input.endSeason,
    annualValueCents: input.annualValueCents,
    totalValueCents:
      years !== undefined && input.annualValueCents !== undefined
        ? years * input.annualValueCents
        : undefined,
    depositPercent: input.depositPercent,
    autoGenerateProjects: input.autoGenerateProjects,
    linkedProjectIds: input.linkedProjectIds,
    notes: emptyToNull(input.notes),
    source: emptyToNull(input.source),
    signedDocumentUrl: emptyToNull(input.signedDocumentUrl),
    signedAt: input.signedAt ?? undefined,
    cancelledAt: input.cancelledAt ?? undefined,
    nextRenewalDate: input.nextRenewalDate ?? undefined,
  });
}

export async function listMultiYearAgreements360(
  orgId: string,
  opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: MultiYearAgreementStatus;
    customerId?: string;
  } = {},
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
  if (opts.customerId)
    items = items.filter((agreement) => agreement.customerId === opts.customerId);

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
      customerName: input.customerName?.trim() || 'Unassigned',
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

export async function sendAgreementForSignature360(
  orgId: string,
  agreementId: string,
  userId?: string | null,
) {
  const agreement = await getMultiYearAgreement360(orgId, agreementId);
  if (!agreement) return null;
  if (
    isAgreementSignedStatus(agreement.status) ||
    agreement.status === 'completed' ||
    agreement.status === 'cancelled'
  ) {
    return agreement;
  }

  const publicToken = parsePublicAccessToken(agreement.publicToken) || generatePublicAccessToken();
  let termsVersion = agreement.termsVersion ?? AGREEMENT_TERMS_VERSION;
  try {
    const { getAgreementSettings } = await import('./settings360');
    const settings = await getAgreementSettings(orgId);
    termsVersion = agreement.termsVersion ?? settings.termsVersion ?? AGREEMENT_TERMS_VERSION;
  } catch {
    /* keep default */
  }
  const db = getAdminFirestore();
  const ref = db.doc(`${agreementsPath(orgId)}/${agreementId}`);
  const patch = {
    status: 'awaiting_signature' as const,
    publicToken,
    termsVersion,
    updatedAt: ts(),
    updatedBy: userId ?? null,
  };
  await ref.update(patch);
  const updated = await ref.get();
  const mapped = mapDoc({ id: updated.id, ...updated.data()! });
  if (agreement.customerId) {
    try {
      const { notifyPortalCustomer } = await import('./portal360');
      await notifyPortalCustomer(orgId, agreement.customerId, {
        category: 'agreements',
        title: 'Agreement ready to sign',
        body: `${agreement.title} is ready for your signature.`,
        actionUrl: `/a/${publicToken}`,
      });
    } catch {
      // Best-effort
    }
  }
  return mapped;
}

export async function getAgreementByPublicToken(token: string) {
  const agreement = await getByPublicToken<MultiYearAgreement & { organizationId: string }>(
    'multiYearAgreements',
    token,
  );
  if (!agreement) return null;

  const orgId = agreement.organizationId;
  const organization = await getOrganization(orgId);
  let branding: { companyName?: string; brandColor?: string; logoUrl?: string | null } | null =
    null;
  let termsVersion = agreement.termsVersion ?? AGREEMENT_TERMS_VERSION;
  let termsBody =
    "By signing this agreement you authorize the company to provide seasonal lighting services for the seasons listed above at the agreed annual value. Work will be scheduled according to weather and crew availability. Cancellations and renewals are subject to the company's standard policies.";
  try {
    const { getBrandingForCustomerFacing, getAgreementSettings } = await import('./settings360');
    branding = await getBrandingForCustomerFacing(orgId);
    const agreementSettings = await getAgreementSettings(orgId);
    termsVersion =
      agreement.termsVersion ?? agreementSettings.termsVersion ?? AGREEMENT_TERMS_VERSION;
    const companyName = branding?.companyName || organization?.companyName || 'the company';
    termsBody = (agreementSettings.termsBody || termsBody).replace(
      /\{\{\s*companyName\s*\}\}/g,
      companyName,
    );
  } catch {
    branding = null;
    const companyName = organization?.companyName || 'the company';
    termsBody = termsBody.replace(/the company/g, companyName);
  }

  return {
    agreement: {
      id: agreement.id,
      organizationId: orgId,
      title: agreement.title,
      status: agreement.status,
      customerName: agreement.customerName,
      optionCode: agreement.optionCode,
      optionLabel: agreement.optionLabel,
      startSeason: agreement.startSeason,
      endSeason: agreement.endSeason,
      annualValueCents: agreement.annualValueCents,
      totalValueCents: agreement.totalValueCents,
      depositPercent: agreement.depositPercent,
      notes: agreement.notes ?? null,
      termsVersion,
      termsBody,
      signedAt: agreement.signedAt ?? null,
      signedByName: agreement.signedByName ?? null,
      propertyLabel: agreement.propertyLabel ?? null,
    },
    organization: organization
      ? {
          id: organization.id,
          companyName: branding?.companyName ?? organization.companyName,
          brandColor: branding?.brandColor ?? '#DC2626',
          logoUrl: branding?.logoUrl ?? null,
        }
      : null,
  };
}

export async function recordAgreementSignature(
  token: string,
  input: {
    signedByName: string;
    signatureData?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const agreement = await getByPublicToken<MultiYearAgreement & { organizationId: string }>(
    'multiYearAgreements',
    token,
  );
  if (!agreement) return null;

  if (isAgreementSignedStatus(agreement.status)) {
    return getAgreementByPublicToken(token);
  }
  // YL-S8: require explicit send — draft tokens are not freely signable.
  if (agreement.status !== 'awaiting_signature') {
    throw new Error('Agreement is not available for signature');
  }

  const orgId = agreement.organizationId;
  const db = getAdminFirestore();
  const ref = db.doc(`${agreementsPath(orgId)}/${agreement.id}`);
  // Atomic status check + sign (P2-S6 concurrency / one-time semantics).
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Agreement is not available for signature');
    const current = snap.data() as { status?: string };
    if (current.status === 'active' || current.status === 'signed') {
      return;
    }
    if (current.status !== 'awaiting_signature') {
      throw new Error('Agreement is not available for signature');
    }
    const now = ts();
    const patch = stripUndefined({
      status: 'active',
      signedAt: now,
      signedByName: input.signedByName.trim(),
      signatureData: input.signatureData?.trim() || input.signedByName.trim(),
      signerIp: input.ipAddress ?? null,
      signerUserAgent: input.userAgent ?? null,
      termsVersion: agreement.termsVersion ?? AGREEMENT_TERMS_VERSION,
      updatedAt: now,
    }) as Record<string, unknown>;
    tx.update(ref, patch);
  });

  return getAgreementByPublicToken(token);
}
