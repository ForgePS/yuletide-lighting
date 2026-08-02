/**
 * Customer Portal QR — Phase 1 security foundation.
 * Raw tokens appear only in /portal/access/{token} URLs and are hashed (SHA-256) at rest.
 * QR identifies the account and starts access; it never permanently bypasses authentication.
 */

import { createHash, randomBytes } from 'crypto';
import type {
  PortalQrAccessMode,
  PortalQrAuditAction,
  PortalQrAuthResult,
  PortalQrCode,
  PortalQrCodeStatus,
  PortalQrCodeType,
  PortalQrScanEvent,
  PortalQrValidationResult,
} from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { mapTimestampsFromData, stripUndefinedDeep } from './firestore-utils';
import {
  colCreate,
  colGet,
  colList,
  colUpdate,
  getOrganization,
  type CustomerRecord,
} from './firestore';
import { getBrandingForCustomerFacing } from './settings360';
import { logCustomerActivity } from './customer360';
import {
  ensurePortalAccount,
  createPortalTimelineEvent,
  notifyPortalCustomer,
  buildPortalAccessUrl,
  resolvePortalFeatures,
  getPortalAccountByCustomer,
} from './portal360';
import { createPortalOtpCode, hashPortalSecret, timingSafeEqualHex } from './portal-security';
import {
  getPortalSecurityConfig,
  portalOtpTtlMs,
  PORTAL_PUBLIC_MESSAGES,
} from './portal-security-config';
import { getPortalDeliveryProvider } from './portal-delivery';
import { consumePortalRateLimit, portalRateLimitKey } from './portal-rate-limit';

const TOKEN_BYTES = 32;
const GENERIC_BLOCK_MESSAGE =
  'This portal access code is no longer active. Please contact Yuletide Lighting Company for assistance.';

export function hashPortalQrToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function createPortalQrRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function portalQrAccessUrl(rawToken: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yuletide-lighting.web.app';
  return `${base.replace(/\/$/, '')}/portal/access/${rawToken}`;
}

export function maskNamePart(value?: string | null): string {
  const v = (value ?? '').trim();
  if (!v) return '••••';
  return `${v[0]!.toUpperCase()}${'•'.repeat(Math.max(3, Math.min(6, v.length - 1)))}`;
}

export function maskStreet(address?: string | null): string {
  const v = (address ?? '').trim();
  if (!v) return '•••• Street';
  const parts = v.split(/\s+/);
  if (parts.length === 1) return `${parts[0]!.slice(0, 3)}••••`;
  const num = parts[0]!;
  const street = parts[1]!;
  return `${num} ${street.slice(0, 1)}•••• ${parts.slice(2).join(' ')}`.trim();
}

export function maskEmail(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null;
  const [user, domain] = email.split('@');
  if (!user || !domain) return null;
  return `${user[0]!}••••@${domain}`;
}

export function maskPhone(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `•••-•••-${digits.slice(-4)}`;
}

function mapQr(raw: Record<string, unknown> & { id: string }): PortalQrCode {
  const mapped = mapTimestampsFromData(raw) as PortalQrCode;
  return {
    ...mapped,
    type: mapped.type ?? 'customer_portal',
    tokenHash: mapped.tokenHash || (mapped.token ? hashPortalQrToken(String(mapped.token)) : ''),
    tokenVersion: mapped.tokenVersion ?? 1,
    status: mapped.status ?? 'active',
    accessMode: mapped.accessMode ?? 'activation',
    reusable: mapped.reusable ?? true,
    requireIdentityVerification: mapped.requireIdentityVerification ?? true,
    scanCount: mapped.scanCount ?? 0,
    failedVerificationCount: mapped.failedVerificationCount ?? 0,
    replacedByQrCodeId: mapped.replacedByQrCodeId ?? (raw.replacedById as string) ?? null,
  };
}

function diagnosticRef() {
  return `QR-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseDevice(ua?: string | null): {
  deviceClass: PortalQrScanEvent['deviceClass'];
  browserFamily: string | null;
  operatingSystemFamily: string | null;
} {
  const s = (ua ?? '').toLowerCase();
  let deviceClass: PortalQrScanEvent['deviceClass'] = 'unknown';
  if (/ipad|tablet/.test(s)) deviceClass = 'tablet';
  else if (/mobi|iphone|android/.test(s)) deviceClass = 'phone';
  else if (s) deviceClass = 'desktop';
  let browserFamily: string | null = null;
  if (s.includes('edg/')) browserFamily = 'Edge';
  else if (s.includes('chrome')) browserFamily = 'Chrome';
  else if (s.includes('safari')) browserFamily = 'Safari';
  else if (s.includes('firefox')) browserFamily = 'Firefox';
  let operatingSystemFamily: string | null = null;
  if (s.includes('windows')) operatingSystemFamily = 'Windows';
  else if (s.includes('android')) operatingSystemFamily = 'Android';
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ios'))
    operatingSystemFamily = 'iOS';
  else if (s.includes('mac os')) operatingSystemFamily = 'macOS';
  return { deviceClass, browserFamily, operatingSystemFamily };
}

function isExpired(qr: PortalQrCode): boolean {
  if (qr.status === 'expired') return true;
  if (!qr.expiresAt) return false;
  const end = qr.expiresAt instanceof Date ? qr.expiresAt : new Date(String(qr.expiresAt));
  return end.getTime() < Date.now();
}

function isInactiveStatus(status: PortalQrCodeStatus) {
  return ['revoked', 'replaced', 'suspended', 'invalid', 'expired', 'draft'].includes(status);
}

async function findQrByRawToken(
  rawToken: string,
): Promise<{ orgId: string; qr: PortalQrCode } | null> {
  const db = getAdminFirestore();
  const tokenHash = hashPortalQrToken(rawToken);
  try {
    const byHash = await db
      .collectionGroup('portalQrCodes')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();
    if (!byHash.empty) {
      const doc = byHash.docs[0]!;
      const qr = mapQr({ id: doc.id, ...doc.data()! });
      const orgId = String(qr.organizationId ?? doc.ref.parent.parent?.id ?? '');
      if (orgId) return { orgId, qr };
    }
  } catch {
    // index may still be building
  }
  try {
    // Legacy plaintext migration path
    const byToken = await db
      .collectionGroup('portalQrCodes')
      .where('token', '==', rawToken)
      .limit(1)
      .get();
    if (!byToken.empty) {
      const doc = byToken.docs[0]!;
      const qr = mapQr({ id: doc.id, ...doc.data()! });
      const orgId = String(qr.organizationId ?? doc.ref.parent.parent?.id ?? '');
      if (orgId) {
        if (!qr.tokenHash) {
          await colUpdate(orgId, 'portalQrCodes', qr.id, {
            tokenHash,
            tokenVersion: 1,
            token: null,
          });
        }
        return { orgId, qr: { ...qr, tokenHash } };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function writeQrAudit(
  orgId: string,
  input: {
    customerId: string;
    propertyId?: string | null;
    qrCodeId?: string | null;
    action: PortalQrAuditAction;
    userId?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    batchId?: string | null;
  },
) {
  await colCreate(
    orgId,
    'portalQrAuditEvents',
    stripUndefinedDeep({
      customerId: input.customerId,
      propertyId: input.propertyId ?? null,
      qrCodeId: input.qrCodeId ?? null,
      action: input.action,
      userId: input.userId ?? null,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus ?? null,
      reason: input.reason ?? null,
      batchId: input.batchId ?? null,
    }),
  );
  await logCustomerActivity(
    orgId,
    input.customerId,
    'note_added',
    `Portal QR: ${input.action}${input.reason ? ` — ${input.reason}` : ''}`,
    input.userId,
    'System',
  );
}

async function recordScan(
  orgId: string,
  input: {
    qrCodeId: string;
    customerId: string;
    propertyId?: string | null;
    validationResult: PortalQrValidationResult;
    authenticationResult?: PortalQrAuthResult | null;
    userAgent?: string | null;
    failureReason?: string | null;
    diagnosticReference: string;
  },
) {
  const device = parseDevice(input.userAgent);
  await colCreate(
    orgId,
    'portalQrScans',
    stripUndefinedDeep({
      qrCodeId: input.qrCodeId,
      customerId: input.customerId,
      propertyId: input.propertyId ?? null,
      scannedAt: new Date(),
      validationResult: input.validationResult,
      authenticationResult: input.authenticationResult ?? null,
      ...device,
      userAgent: input.userAgent ?? null,
      failureReason: input.failureReason ?? null,
      diagnosticReference: input.diagnosticReference,
    }),
  );
  await writeQrAudit(orgId, {
    customerId: input.customerId,
    propertyId: input.propertyId,
    qrCodeId: input.qrCodeId,
    action: 'scanned',
    reason: `${input.validationResult}${input.authenticationResult ? `/${input.authenticationResult}` : ''}`,
  });
}

export async function listPortalQrCodes(
  orgId: string,
  customerId: string,
): Promise<PortalQrCode[]> {
  const rows = await colList<Record<string, unknown> & { id: string }>(orgId, 'portalQrCodes');
  return rows
    .filter((r) => r.customerId === customerId)
    .map((r) => mapQr({ ...r, organizationId: orgId }))
    .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
}

export async function getPortalQrCode(
  orgId: string,
  qrCodeId: string,
): Promise<PortalQrCode | null> {
  const raw = await colGet<Record<string, unknown> & { id: string }>(
    orgId,
    'portalQrCodes',
    qrCodeId,
  );
  if (!raw) return null;
  return mapQr({ ...raw, organizationId: orgId });
}

export type GeneratePortalQrInput = {
  customerId: string;
  propertyId?: string | null;
  type?: PortalQrCodeType;
  targetRecordId?: string | null;
  label?: string | null;
  internalDescription?: string | null;
  expiresAt?: Date | null;
  reusable?: boolean;
  requireIdentityVerification?: boolean;
  accessMode?: PortalQrAccessMode;
  userId?: string | null;
  batchId?: string | null;
  replaceExistingActivation?: boolean;
};

export async function generatePortalQrCode(
  orgId: string,
  input: GeneratePortalQrInput,
): Promise<{ qr: PortalQrCode; rawToken: string; accessUrl: string }> {
  const customer = await colGet<CustomerRecord>(orgId, 'customers', input.customerId);
  if (!customer) throw new Error('Customer not found');

  const features = await resolvePortalFeatures(orgId);
  if (!features.settings.enabled) {
    throw new Error('Customer Portal is disabled for this organization');
  }

  const type = input.type ?? 'customer_portal';
  const accessMode =
    input.accessMode ?? (type === 'customer_portal' ? 'activation' : 'authenticated_deep_link');
  const requireIdentityVerification = input.requireIdentityVerification ?? true;
  const reusable = input.reusable ?? accessMode !== 'activation';

  if (accessMode === 'activation' && !input.replaceExistingActivation) {
    const existing = await listPortalQrCodes(orgId, input.customerId);
    const activeActivation = existing.find(
      (c) => c.accessMode === 'activation' && c.status === 'active' && !isExpired(c),
    );
    if (activeActivation) {
      throw new Error(
        'An active activation QR already exists. Replace it intentionally to create another.',
      );
    }
  }

  const { account } = await ensurePortalAccount(orgId, input.customerId);
  const rawToken = createPortalQrRawToken();
  const tokenHash = hashPortalQrToken(rawToken);

  const created = await colCreate(
    orgId,
    'portalQrCodes',
    stripUndefinedDeep({
      organizationId: orgId,
      customerId: input.customerId,
      propertyId: input.propertyId ?? null,
      portalAccountId: account.id,
      type,
      targetRecordId: input.targetRecordId ?? null,
      tokenHash,
      tokenVersion: 1,
      token: null,
      status: 'active' as PortalQrCodeStatus,
      accessMode,
      reusable,
      requireIdentityVerification,
      expiresAt: input.expiresAt ?? null,
      activatedAt: null,
      revokedAt: null,
      replacedByQrCodeId: null,
      replacesId: null,
      label: input.label ?? null,
      internalDescription: input.internalDescription ?? null,
      campaignId: null,
      printTemplateId: null,
      scanCount: 0,
      failedVerificationCount: 0,
      lastScannedAt: null,
      createdBy: input.userId ?? null,
    }),
  );

  const qr = mapQr({ ...created, organizationId: orgId } as Record<string, unknown> & {
    id: string;
  });
  await writeQrAudit(orgId, {
    customerId: input.customerId,
    propertyId: input.propertyId,
    qrCodeId: qr.id,
    action: input.batchId ? 'bulk_generated' : 'generated',
    userId: input.userId,
    newStatus: 'active',
    reason: input.label || type,
    batchId: input.batchId,
  });
  await createPortalTimelineEvent(orgId, {
    customerId: input.customerId,
    eventType: 'portal_qr_generated',
    title: 'Portal QR generated',
    description: input.label || type,
    customerVisible: false,
  });

  return { qr, rawToken, accessUrl: portalQrAccessUrl(rawToken) };
}

export async function revokePortalQrCode(
  orgId: string,
  qrCodeId: string,
  userId?: string | null,
  reason?: string,
): Promise<PortalQrCode> {
  const qr = await getPortalQrCode(orgId, qrCodeId);
  if (!qr) throw new Error('QR code not found');
  if (qr.status === 'revoked') return qr;
  const previousStatus = qr.status;
  await colUpdate(orgId, 'portalQrCodes', qrCodeId, {
    status: 'revoked',
    revokedAt: new Date(),
  });
  await writeQrAudit(orgId, {
    customerId: qr.customerId,
    propertyId: qr.propertyId,
    qrCodeId,
    action: 'revoked',
    userId,
    previousStatus,
    newStatus: 'revoked',
    reason: reason ?? 'Staff revoked',
  });
  return (await getPortalQrCode(orgId, qrCodeId))!;
}

export async function replacePortalQrCode(
  orgId: string,
  qrCodeId: string,
  opts?: Omit<GeneratePortalQrInput, 'customerId' | 'replaceExistingActivation'>,
): Promise<{ qr: PortalQrCode; rawToken: string; accessUrl: string; previous: PortalQrCode }> {
  const previous = await getPortalQrCode(orgId, qrCodeId);
  if (!previous) throw new Error('QR code not found');

  const generated = await generatePortalQrCode(orgId, {
    customerId: previous.customerId,
    propertyId: opts?.propertyId ?? previous.propertyId,
    type: opts?.type ?? previous.type,
    targetRecordId: opts?.targetRecordId ?? previous.targetRecordId,
    label: opts?.label ?? previous.label ?? 'Replacement',
    internalDescription: opts?.internalDescription ?? previous.internalDescription,
    expiresAt: opts?.expiresAt === undefined ? (previous.expiresAt ?? null) : opts.expiresAt,
    reusable: opts?.reusable ?? previous.reusable,
    requireIdentityVerification:
      opts?.requireIdentityVerification ?? previous.requireIdentityVerification,
    accessMode: opts?.accessMode ?? previous.accessMode,
    userId: opts?.userId,
    replaceExistingActivation: true,
  });

  await colUpdate(orgId, 'portalQrCodes', previous.id, {
    status: 'replaced',
    revokedAt: new Date(),
    replacedByQrCodeId: generated.qr.id,
  });
  await colUpdate(orgId, 'portalQrCodes', generated.qr.id, {
    replacesId: previous.id,
  });
  await writeQrAudit(orgId, {
    customerId: previous.customerId,
    qrCodeId: previous.id,
    action: 'replaced',
    userId: opts?.userId,
    previousStatus: previous.status,
    newStatus: 'replaced',
    reason: `Replaced by ${generated.qr.id}`,
  });

  return {
    qr: (await getPortalQrCode(orgId, generated.qr.id))!,
    rawToken: generated.rawToken,
    accessUrl: generated.accessUrl,
    previous: (await getPortalQrCode(orgId, previous.id))!,
  };
}

export async function bulkGeneratePortalQrCodes(
  orgId: string,
  customerIds: string[],
  opts?: Omit<GeneratePortalQrInput, 'customerId'> & { replaceExistingActivation?: boolean },
) {
  const batchId = `batch_${Date.now().toString(36)}_${randomBytes(2).toString('hex')}`;
  const created: Array<{ customerId: string; qrId: string; accessUrl: string; rawToken: string }> =
    [];
  const errors: Array<{ customerId: string; message: string }> = [];
  for (const customerId of Array.from(new Set(customerIds.filter(Boolean)))) {
    try {
      const result = await generatePortalQrCode(orgId, {
        ...opts,
        customerId,
        batchId,
        replaceExistingActivation: opts?.replaceExistingActivation,
      });
      created.push({
        customerId,
        qrId: result.qr.id,
        accessUrl: result.accessUrl,
        rawToken: result.rawToken,
      });
    } catch (err) {
      errors.push({ customerId, message: err instanceof Error ? err.message : 'Failed' });
    }
  }
  return { batchId, created, errors };
}

export async function listPortalQrScans(orgId: string, qrCodeId: string, limit = 50) {
  const rows = await colList<Record<string, unknown> & { id: string }>(orgId, 'portalQrScans');
  return rows
    .filter((r) => r.qrCodeId === qrCodeId)
    .map((r) => mapTimestampsFromData(r) as PortalQrScanEvent)
    .sort(
      (a, b) =>
        (b.scannedAt?.getTime?.() ?? b.createdAt?.getTime?.() ?? 0) -
        (a.scannedAt?.getTime?.() ?? a.createdAt?.getTime?.() ?? 0),
    )
    .slice(0, limit);
}

export type PortalQrLandingPublic = {
  ok: boolean;
  flow: 'activation' | 'sign_in' | 'blocked';
  validationResult: PortalQrValidationResult;
  companyName: string;
  brandColor: string;
  logoUrl?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  diagnosticReference: string;
  message?: string;
  /** Only for activation flow (new/inactive) — never for blocked. */
  maskedAccountName?: string | null;
  maskedProperty?: string | null;
  channels?: Array<{ channel: 'email' | 'sms'; masked: string }>;
  deepLinkType?: PortalQrCodeType;
  alreadyActivated?: boolean;
};

async function blockedLanding(
  branding: { companyName: string; brandColor: string; logoUrl?: string | null },
  org: { phone?: string | null; email?: string | null } | null,
  diagnosticReference: string,
  validationResult: PortalQrValidationResult,
): Promise<PortalQrLandingPublic> {
  return {
    ok: false,
    flow: 'blocked',
    validationResult,
    companyName: branding.companyName,
    brandColor: branding.brandColor,
    logoUrl: branding.logoUrl,
    supportPhone: org?.phone ?? null,
    supportEmail: org?.email ?? null,
    diagnosticReference,
    message: GENERIC_BLOCK_MESSAGE,
  };
}

/** Public: validate QR server-side and return branded landing without granting portal access. */
export async function getPortalQrLanding(
  rawToken: string,
  meta?: { userAgent?: string | null },
): Promise<PortalQrLandingPublic> {
  const diagnosticReference = diagnosticRef();
  const brandingFallback = {
    companyName: 'Yuletide Lighting',
    brandColor: '#B91C1C',
    logoUrl: null as string | null,
  };

  const found = await findQrByRawToken(rawToken);
  if (!found) {
    return {
      ok: false,
      flow: 'blocked',
      validationResult: 'invalid',
      companyName: brandingFallback.companyName,
      brandColor: brandingFallback.brandColor,
      logoUrl: null,
      supportPhone: null,
      supportEmail: null,
      diagnosticReference,
      message: GENERIC_BLOCK_MESSAGE,
    };
  }

  const { orgId, qr } = found;
  const [branding, org, features, account, customer] = await Promise.all([
    getBrandingForCustomerFacing(orgId).catch(() => brandingFallback),
    getOrganization(orgId),
    resolvePortalFeatures(orgId),
    getPortalAccountByCustomer(orgId, qr.customerId),
    colGet<CustomerRecord>(orgId, 'customers', qr.customerId),
  ]);

  const support = {
    phone: (org as { phone?: string | null } | null)?.phone ?? null,
    email: (org as { email?: string | null } | null)?.email ?? null,
  };

  if (!features.settings.enabled || !features.moduleEnabled) {
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'tenant_disabled',
      userAgent: meta?.userAgent,
      diagnosticReference,
      failureReason: 'portal_module_disabled',
    });
    return blockedLanding(branding, support, diagnosticReference, 'tenant_disabled');
  }

  if (isInactiveStatus(qr.status) || isExpired(qr)) {
    const validationResult: PortalQrValidationResult =
      qr.status === 'revoked' || qr.status === 'replaced' || qr.status === 'suspended'
        ? 'revoked'
        : isExpired(qr)
          ? 'expired'
          : 'invalid';
    if (isExpired(qr) && qr.status === 'active') {
      await colUpdate(orgId, 'portalQrCodes', qr.id, { status: 'expired' });
    }
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult,
      userAgent: meta?.userAgent,
      diagnosticReference,
      failureReason: qr.status,
    });
    await colUpdate(orgId, 'portalQrCodes', qr.id, {
      scanCount: (qr.scanCount ?? 0) + 1,
      lastScannedAt: new Date(),
    });
    return blockedLanding(branding, support, diagnosticReference, validationResult);
  }

  if (
    account?.status === 'suspended' ||
    account?.status === 'locked' ||
    account?.status === 'archived'
  ) {
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'portal_suspended',
      userAgent: meta?.userAgent,
      diagnosticReference,
      failureReason: account.status,
    });
    return blockedLanding(branding, support, diagnosticReference, 'portal_suspended');
  }

  await colUpdate(orgId, 'portalQrCodes', qr.id, {
    scanCount: (qr.scanCount ?? 0) + 1,
    lastScannedAt: new Date(),
  });

  const portalActive = Boolean(
    account?.portalEnabled &&
    account.status === 'active' &&
    (account.activatedAt || account.lastLoginAt),
  );

  // Existing active portal users: sign-in flow — no PII before auth
  if (portalActive && qr.accessMode !== 'activation') {
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'valid',
      authenticationResult: 'sign_in_required',
      userAgent: meta?.userAgent,
      diagnosticReference,
    });
    return {
      ok: true,
      flow: 'sign_in',
      validationResult: 'valid',
      companyName: branding.companyName,
      brandColor: branding.brandColor,
      logoUrl: branding.logoUrl,
      supportPhone: support.phone,
      supportEmail: support.email,
      diagnosticReference,
      deepLinkType: qr.type,
      message: 'Sign in to continue to your portal.',
      channels: [],
    };
  }

  if (portalActive && qr.accessMode === 'activation' && qr.reusable) {
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'valid',
      authenticationResult: 'sign_in_required',
      userAgent: meta?.userAgent,
      diagnosticReference,
    });
    return {
      ok: true,
      flow: 'sign_in',
      validationResult: 'valid',
      companyName: branding.companyName,
      brandColor: branding.brandColor,
      logoUrl: branding.logoUrl,
      supportPhone: support.phone,
      supportEmail: support.email,
      diagnosticReference,
      deepLinkType: qr.type,
      alreadyActivated: true,
      message: 'Sign in to open your portal. This QR code does not keep you signed in permanently.',
      channels: [],
    };
  }

  // Activation / new customer: masked identity + verification channels
  let maskedProperty: string | null = null;
  if (qr.propertyId) {
    const prop = await colGet<{ addressLine1?: string }>(orgId, 'properties', qr.propertyId);
    maskedProperty = maskStreet(prop?.addressLine1);
  } else {
    const props = await colList<{ customerId?: string; addressLine1?: string }>(
      orgId,
      'properties',
    );
    const first = props.find((p) => p.customerId === qr.customerId);
    maskedProperty = maskStreet(first?.addressLine1);
  }

  const channels: Array<{ channel: 'email' | 'sms'; masked: string }> = [];
  const emailMasked = maskEmail(customer?.email);
  const phoneMasked = maskPhone(customer?.phone);
  if (emailMasked) channels.push({ channel: 'email', masked: emailMasked });
  if (phoneMasked) channels.push({ channel: 'sms', masked: phoneMasked });

  await recordScan(orgId, {
    qrCodeId: qr.id,
    customerId: qr.customerId,
    propertyId: qr.propertyId,
    validationResult: 'valid',
    authenticationResult: 'verification_required',
    userAgent: meta?.userAgent,
    diagnosticReference,
  });

  return {
    ok: true,
    flow: 'activation',
    validationResult: 'valid',
    companyName: branding.companyName,
    brandColor: branding.brandColor,
    logoUrl: branding.logoUrl,
    supportPhone: support.phone,
    supportEmail: support.email,
    diagnosticReference,
    deepLinkType: qr.type,
    alreadyActivated: false,
    maskedAccountName: customer?.businessName
      ? maskNamePart(customer.businessName)
      : `${maskNamePart(customer?.firstName)} ${maskNamePart(customer?.lastName)}`.trim(),
    maskedProperty,
    channels,
    message: 'Verify your identity to continue.',
  };
}

function normalizeContact(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s()-]/g, '');
}

function portalTimestampMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (value && typeof value === 'object' && '_seconds' in value) {
    return Number((value as { _seconds: number })._seconds) * 1000;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const millis = new Date(value).getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
}

function otpHash(code: string) {
  return hashPortalSecret(code.trim(), 'portal-otp');
}

function safeEqualHex(a: string, b: string) {
  return timingSafeEqualHex(a, b);
}

type PortalQrOtpRecord = {
  id: string;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
  purpose?: string | null;
};

async function listPortalQrOtps(orgId: string, qrCodeId: string): Promise<PortalQrOtpRecord[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/portalQrVerifications`)
    .where('qrCodeId', '==', qrCodeId)
    .get();
  return snap.docs.map(
    (doc) => mapTimestampsFromData({ id: doc.id, ...doc.data()! }) as PortalQrOtpRecord,
  );
}

/** Invalidate every outstanding OTP for a QR before issuing a replacement. */
export async function invalidateOpenQrOtps(orgId: string, qrCodeId: string): Promise<number> {
  const open = (await listPortalQrOtps(orgId, qrCodeId)).filter((otp) => !otp.consumedAt);
  if (!open.length) return 0;
  const consumedAt = new Date();
  await Promise.all(
    open.map((otp) =>
      colUpdate(orgId, 'portalQrVerifications', otp.id, {
        consumedAt,
      }),
    ),
  );
  return open.length;
}

export async function sendPortalQrVerificationCode(
  rawToken: string,
  input: { channel: 'email' | 'sms'; contact: string; userAgent?: string | null },
): Promise<{
  sent: boolean;
  maskedDestination: string;
  diagnosticReference: string;
  reason?: string;
}> {
  const diagnosticReference = diagnosticRef();
  const config = getPortalSecurityConfig();
  const provided = normalizeContact(input.contact);
  const tokenHashPrefix = hashPortalQrToken(rawToken).slice(0, 16);
  const tokenLimit = consumePortalRateLimit(
    portalRateLimitKey(['otp-req', 'ip-or-token', tokenHashPrefix]),
  );
  if (!tokenLimit.allowed) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  const found = await findQrByRawToken(rawToken);
  if (!found) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }
  const { orgId, qr } = found;

  const requestLimits = [
    consumePortalRateLimit(portalRateLimitKey(['otp-req', 'qr', qr.id])),
    consumePortalRateLimit(portalRateLimitKey(['otp-req', 'contact', provided])),
  ];
  if (requestLimits.some((limit) => !limit.allowed)) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  if (isInactiveStatus(qr.status) || isExpired(qr)) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  const customer = await colGet<CustomerRecord>(orgId, 'customers', qr.customerId);
  if (!customer) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  const emailOk =
    input.channel === 'email' && customer.email && normalizeContact(customer.email) === provided;
  const phoneOk =
    input.channel === 'sms' &&
    customer.phone &&
    normalizeContact(customer.phone).endsWith(provided.slice(-10));

  if (!emailOk && !phoneOk) {
    await colUpdate(orgId, 'portalQrCodes', qr.id, {
      failedVerificationCount: (qr.failedVerificationCount ?? 0) + 1,
    });
    await writeQrAudit(orgId, {
      customerId: qr.customerId,
      qrCodeId: qr.id,
      action: 'verification_failed',
      reason: 'contact_mismatch',
    });
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'valid',
      authenticationResult: 'verification_failed',
      userAgent: input.userAgent,
      diagnosticReference,
      failureReason: 'contact_mismatch',
    });
    // Same generic message — do not reveal whether the account exists / contact is wrong
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  if ((qr.failedVerificationCount ?? 0) >= config.otpMaxAttempts * 3) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  const previousOtps = await listPortalQrOtps(orgId, qr.id);
  const latestCreatedAt = previousOtps
    .map((otp) => portalTimestampMillis(otp.createdAt))
    .filter((createdAt): createdAt is number => createdAt != null)
    .sort((a, b) => b - a)[0];
  if (
    latestCreatedAt != null &&
    Date.now() - latestCreatedAt < config.otpResendCooldownSeconds * 1000
  ) {
    return {
      sent: false,
      maskedDestination: '',
      diagnosticReference,
      reason: PORTAL_PUBLIC_MESSAGES.verificationSent,
    };
  }

  await invalidateOpenQrOtps(orgId, qr.id);

  const code = createPortalOtpCode(config.otpLength);
  await colCreate(orgId, 'portalQrVerifications', {
    qrCodeId: qr.id,
    customerId: qr.customerId,
    purpose: 'portal_access',
    channel: input.channel,
    codeHash: otpHash(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + portalOtpTtlMs(config)),
    consumedAt: null,
  });

  await writeQrAudit(orgId, {
    customerId: qr.customerId,
    qrCodeId: qr.id,
    action: 'verification_attempted',
    reason: input.channel,
  });

  const branding = await getBrandingForCustomerFacing(orgId);
  let sent = false;
  const deliveryProvider = getPortalDeliveryProvider();

  if (deliveryProvider.name === 'emulator') {
    // Emulator adapter captures the OTP for tests without logging or contacting external services.
    const delivery = await deliveryProvider.sendOtp({
      purpose: 'portal_access',
      channel: input.channel,
      to: input.channel === 'email' ? customer.email! : customer.phone!,
      otp: code,
      organizationId: orgId,
      diagnosticReference,
    });
    sent = delivery.delivered;
  } else if (deliveryProvider.name === 'live-disabled-s3') {
    // S3 is emulator-only. Fail closed without contacting Resend or Twilio.
    sent = false;
  } else if (input.channel === 'email') {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      sent = false;
    } else {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: customer.email,
          subject: `${branding.companyName} — portal verification code`,
          text: `Your verification code is ${code}. It expires in ${config.otpTtlMinutes} minutes.\n\nIf you did not request this, ignore this email.`,
        }),
      });
      sent = res.ok;
      if (sent)
        await writeQrAudit(orgId, {
          customerId: qr.customerId,
          qrCodeId: qr.id,
          action: 'emailed',
          reason: 'otp',
        });
    }
  } else {
    // SMS via Twilio env if present
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone =
      process.env.TWILIO_FROM_NUMBER ||
      ((await getOrganization(orgId)) as { twilioPhoneNumber?: string } | null)?.twilioPhoneNumber;
    if (!sid || !auth || !fromPhone || !customer.phone) {
      sent = false;
    } else {
      const body = new URLSearchParams({
        To: customer.phone,
        From: fromPhone,
        Body: `${branding.companyName} portal code: ${code}. Expires in ${config.otpTtlMinutes} minutes.`,
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      sent = res.ok;
      if (sent)
        await writeQrAudit(orgId, {
          customerId: qr.customerId,
          qrCodeId: qr.id,
          action: 'sms_sent',
          reason: 'otp',
        });
    }
  }

  // Never return the raw OTP or delivery configuration details.
  return {
    sent,
    maskedDestination:
      input.channel === 'email'
        ? (maskEmail(customer.email) ?? '')
        : (maskPhone(customer.phone) ?? ''),
    diagnosticReference,
    reason: sent ? undefined : PORTAL_PUBLIC_MESSAGES.verificationSent,
  };
}

export async function verifyPortalQrCodeAndActivate(
  rawToken: string,
  input: { code: string; acceptTerms: boolean; userAgent?: string | null },
): Promise<{ portalUrl: string; activated: boolean; deepLinkPath?: string | null }> {
  if (!input.acceptTerms) throw new Error('You must accept the portal terms to continue.');
  const config = getPortalSecurityConfig();
  const diagnosticReference = diagnosticRef();
  const found = await findQrByRawToken(rawToken);
  if (!found) throw new Error(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  const { orgId, qr } = found;

  if (isInactiveStatus(qr.status) || isExpired(qr)) {
    throw new Error(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  }

  const candidates = (await listPortalQrOtps(orgId, qr.id))
    .filter(
      (verification) =>
        !verification.consumedAt &&
        verification.expiresAt.getTime() > Date.now() &&
        (verification.purpose === undefined || verification.purpose === 'portal_access'),
    )
    .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

  const latest = candidates[0];
  if (!latest) throw new Error(PORTAL_PUBLIC_MESSAGES.accessUnavailable);

  if ((latest.attempts ?? 0) >= config.otpMaxAttempts) {
    await colUpdate(orgId, 'portalQrVerifications', latest.id, {
      consumedAt: new Date(),
    });
    await writeQrAudit(orgId, {
      customerId: qr.customerId,
      qrCodeId: qr.id,
      action: 'verification_failed',
      reason: 'max_attempts',
    });
    throw new Error(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  }

  const ok = safeEqualHex(latest.codeHash, otpHash(input.code.trim()));
  if (!ok) {
    const attempts = (latest.attempts ?? 0) + 1;
    await colUpdate(orgId, 'portalQrVerifications', latest.id, {
      attempts,
      consumedAt: attempts >= config.otpMaxAttempts ? new Date() : null,
    });
    await colUpdate(orgId, 'portalQrCodes', qr.id, {
      failedVerificationCount: (qr.failedVerificationCount ?? 0) + 1,
    });
    await writeQrAudit(orgId, {
      customerId: qr.customerId,
      qrCodeId: qr.id,
      action: 'verification_failed',
      reason: attempts >= config.otpMaxAttempts ? 'max_attempts' : 'bad_code',
    });
    await recordScan(orgId, {
      qrCodeId: qr.id,
      customerId: qr.customerId,
      propertyId: qr.propertyId,
      validationResult: 'valid',
      authenticationResult: 'verification_failed',
      userAgent: input.userAgent,
      diagnosticReference,
      failureReason: attempts >= config.otpMaxAttempts ? 'max_attempts' : 'bad_code',
    });
    throw new Error(PORTAL_PUBLIC_MESSAGES.accessUnavailable);
  }

  await colUpdate(orgId, 'portalQrVerifications', latest.id, { consumedAt: new Date() });

  const { account, token: accessToken } = await ensurePortalAccount(orgId, qr.customerId, {
    portalEnabled: true,
    status: 'active',
  });

  await colUpdate(orgId, 'customers', qr.customerId, {
    portalEnabled: true,
    portalToken: accessToken,
  });
  const firstActivation = !account.activatedAt;
  await colUpdate(orgId, 'portalAccounts', account.id, {
    portalEnabled: true,
    status: 'active',
    activatedAt: account.activatedAt ?? new Date(),
  });

  const now = new Date();
  const nextStatus: PortalQrCodeStatus = qr.reusable ? 'reusable' : 'used_for_activation';
  await colUpdate(
    orgId,
    'portalQrCodes',
    qr.id,
    stripUndefinedDeep({
      activatedAt: qr.activatedAt ?? now,
      status: nextStatus,
      lastScannedAt: now,
    }),
  );

  await writeQrAudit(orgId, {
    customerId: qr.customerId,
    qrCodeId: qr.id,
    action: 'activated',
    previousStatus: qr.status,
    newStatus: nextStatus,
  });
  await recordScan(orgId, {
    qrCodeId: qr.id,
    customerId: qr.customerId,
    propertyId: qr.propertyId,
    validationResult: 'valid',
    authenticationResult: firstActivation ? 'activated' : 'already_authenticated',
    userAgent: input.userAgent,
    diagnosticReference,
  });

  if (firstActivation) {
    await createPortalTimelineEvent(orgId, {
      customerId: qr.customerId,
      eventType: 'portal_qr_activated',
      title: 'Portal activated via QR',
      description: 'Customer verified identity and activated the portal.',
      customerVisible: true,
    });
    await notifyPortalCustomer(orgId, qr.customerId, {
      category: 'account',
      title: 'Welcome to your portal',
      body: 'Your portal is active. Bookmark Home for quick access on this device.',
      actionUrl: '#',
    });
  }

  const deepLinkPath = deepLinkForQr(qr, accessToken);
  return {
    portalUrl: buildPortalAccessUrl(accessToken),
    activated: firstActivation,
    deepLinkPath,
  };
}

function deepLinkForQr(qr: PortalQrCode, accessToken: string): string | null {
  const base = `/portal/${accessToken}`;
  switch (qr.type) {
    case 'property':
      return `${base}/properties`;
    case 'proposal':
      return `${base}/proposals`;
    case 'invoice':
      return `${base}/billing`;
    case 'service_request':
      return `${base}/service-request`;
    case 'installation':
      return `${base}/jobs`;
    case 'takedown':
      return `${base}/takedowns`;
    case 'rebooking':
      return `${base}/rebook`;
    default:
      return base;
  }
}

export async function getStaffPortalQrView(orgId: string, customerId: string) {
  const [codes, account, customer] = await Promise.all([
    listPortalQrCodes(orgId, customerId),
    getPortalAccountByCustomer(orgId, customerId),
    colGet<CustomerRecord>(orgId, 'customers', customerId),
  ]);
  const active =
    codes.find((c) => (c.status === 'active' || c.status === 'reusable') && !isExpired(c)) ?? null;

  return {
    account,
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    codes: codes.map((c) => ({
      id: c.id,
      type: c.type,
      status: c.status,
      accessMode: c.accessMode,
      reusable: c.reusable,
      requireIdentityVerification: c.requireIdentityVerification,
      label: c.label,
      expiresAt: c.expiresAt,
      activatedAt: c.activatedAt,
      revokedAt: c.revokedAt,
      scanCount: c.scanCount,
      failedVerificationCount: c.failedVerificationCount,
      lastScannedAt: c.lastScannedAt,
      createdAt: c.createdAt,
      expired: isExpired(c),
    })),
    active: active
      ? {
          id: active.id,
          type: active.type,
          status: active.status,
          accessMode: active.accessMode,
          reusable: active.reusable,
          requireIdentityVerification: active.requireIdentityVerification,
          label: active.label,
          expiresAt: active.expiresAt,
          activatedAt: active.activatedAt,
          scanCount: active.scanCount,
          failedVerificationCount: active.failedVerificationCount,
          lastScannedAt: active.lastScannedAt,
          createdAt: active.createdAt,
          expired: false,
        }
      : null,
  };
}

/** Pure helpers exported for unit tests */
export const portalQrTestUtils = {
  hashPortalQrToken,
  createPortalQrRawToken,
  maskNamePart,
  maskStreet,
  maskEmail,
  maskPhone,
  portalQrAccessUrl,
  isExpired,
  isInactiveStatus,
  parseDevice,
};

export async function listOrgPortalQrCodes(
  orgId: string,
  opts?: { status?: PortalQrCodeStatus | 'all'; limit?: number },
) {
  const rows = await colList<Record<string, unknown> & { id: string }>(orgId, 'portalQrCodes');
  let codes = rows.map((r) => mapQr({ ...r, organizationId: orgId }));
  if (opts?.status && opts.status !== 'all') {
    codes = codes.filter((c) => c.status === opts.status);
  }
  codes.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
  const limit = opts?.limit ?? 100;
  const sliced = codes.slice(0, limit);

  const customerIds = Array.from(new Set(sliced.map((c) => c.customerId)));
  const customers = await Promise.all(
    customerIds.map(async (id) => {
      const c = await colGet<CustomerRecord>(orgId, 'customers', id);
      return [
        id,
        c?.businessName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim() || id,
      ] as const;
    }),
  );
  const nameById = new Map(customers);

  return sliced.map((c) => ({
    id: c.id,
    customerId: c.customerId,
    customerName: nameById.get(c.customerId) ?? c.customerId,
    type: c.type,
    status: c.status,
    accessMode: c.accessMode,
    label: c.label,
    scanCount: c.scanCount,
    failedVerificationCount: c.failedVerificationCount,
    activatedAt: c.activatedAt,
    expiresAt: c.expiresAt,
    lastScannedAt: c.lastScannedAt,
    createdAt: c.createdAt,
    expired: isExpired(c),
  }));
}

export async function getPortalQrAnalytics(orgId: string) {
  const [codes, scans] = await Promise.all([
    colList<Record<string, unknown> & { id: string }>(orgId, 'portalQrCodes'),
    colList<Record<string, unknown> & { id: string }>(orgId, 'portalQrScans'),
  ]);
  const mapped = codes.map((r) => mapQr({ ...r, organizationId: orgId }));
  const scanRows = scans.map((r) => mapTimestampsFromData(r) as PortalQrScanEvent);

  const active = mapped.filter(
    (c) => (c.status === 'active' || c.status === 'reusable') && !isExpired(c),
  ).length;
  const expired = mapped.filter((c) => c.status === 'expired' || isExpired(c)).length;
  const revoked = mapped.filter(
    (c) => c.status === 'revoked' || c.status === 'replaced' || c.status === 'suspended',
  ).length;
  const activations = mapped.filter((c) => !!c.activatedAt).length;
  const failedVerifications = mapped.reduce((sum, c) => sum + (c.failedVerificationCount ?? 0), 0);

  const byDevice: Record<string, number> = {};
  for (const s of scanRows) {
    const key = s.deviceClass || 'unknown';
    byDevice[key] = (byDevice[key] ?? 0) + 1;
  }

  const recentScans = scanRows
    .sort((a, b) => (b.scannedAt?.getTime?.() ?? 0) - (a.scannedAt?.getTime?.() ?? 0))
    .slice(0, 15)
    .map((s) => ({
      id: s.id,
      qrCodeId: s.qrCodeId,
      customerId: s.customerId,
      scannedAt: s.scannedAt,
      validationResult: s.validationResult,
      authenticationResult: s.authenticationResult ?? null,
      deviceClass: s.deviceClass ?? null,
      diagnosticReference: s.diagnosticReference,
    }));

  const notActivated = mapped.filter(
    (c) => (c.status === 'active' || c.status === 'reusable') && !c.activatedAt && !isExpired(c),
  ).length;

  return {
    generated: mapped.length,
    active,
    expired,
    revoked,
    totalScans: scanRows.length,
    uniqueQrScanned: new Set(scanRows.map((s) => s.qrCodeId)).size,
    activations,
    failedVerifications,
    notActivated,
    byDevice,
    recentScans,
  };
}
