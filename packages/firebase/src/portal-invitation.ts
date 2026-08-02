/**
 * Portal invitation create / claim / replace (P2-S3).
 * ENVIRONMENT=EMULATOR evidence uses test delivery adapter only.
 */
import type { PortalUser, PortalUserRole } from '@clcrm/types';
import { PORTAL_USER_ROLES } from '@clcrm/types';
import { getAdminFirestore } from './admin';
import { colCreate, colGet, colUpdate } from './firestore';
import { mapTimestampsFromData, stripUndefinedDeep } from './firestore-utils';
import {
  createPortalOpaqueToken,
  hashPortalSecret,
  normalizePortalEmail,
  redactPortalLogMetadata,
} from './portal-security';
import {
  getPortalSecurityConfig,
  portalInvitationTtlMs,
  PORTAL_PUBLIC_MESSAGES,
} from './portal-security-config';
import { getPortalDeliveryProvider, publicDeliveryMessage } from './portal-delivery';
import {
  ensurePortalAccount,
  getPortalAccount,
  getPortalUser,
  invalidatePortalSessions,
} from './portal360';
import { logCustomerActivity } from './customer360';

export type PortalInvitationDelivery = {
  channel: 'emulator' | 'email';
  to: string;
  subject: string;
  /** Never log. Returned only for staff copy-once / emulator fixtures. */
  invitationToken?: string;
  message: string;
};

/** @deprecated Prefer getEmulatorInvitationCaptures from portal-delivery */
const legacyDeliveries: PortalInvitationDelivery[] = [];

export function getEmulatorInvitationDeliveries(): PortalInvitationDelivery[] {
  return [...legacyDeliveries];
}

export function clearEmulatorInvitationDeliveries(): void {
  legacyDeliveries.length = 0;
}

function mapUser(id: string, data: Record<string, unknown>): PortalUser {
  const mapped: Record<string, unknown> = mapTimestampsFromData({ id, ...data });
  for (const field of [
    'invitationSentAt',
    'invitationExpiresAt',
    'invitationConsumedAt',
    'claimedAt',
    'lastLoginAt',
    'lockedUntil',
    'suspendedAt',
    'revokedAt',
  ] as const) {
    const value = mapped[field];
    if (value && typeof value === 'object' && 'toDate' in value) {
      mapped[field] = (value as { toDate: () => Date }).toDate();
    }
  }
  return mapped as PortalUser;
}

async function markPendingInvitesReplaced(
  orgId: string,
  customerId: string,
  normalizedEmail: string,
  exceptUserId?: string,
): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(`organizations/${orgId}/portalUsers`)
    .where('customerId', '==', customerId)
    .where('normalizedEmail', '==', normalizedEmail)
    .where('invitationStatus', '==', 'pending')
    .get();
  await Promise.all(
    snap.docs
      .filter((d) => d.id !== exceptUserId)
      .map((d) =>
        colUpdate(orgId, 'portalUsers', d.id, {
          invitationStatus: 'replaced',
          invitationTokenHash: null,
          updatedAt: new Date(),
        }),
      ),
  );
}

export async function createPortalUserInvitation(args: {
  organizationId: string;
  customerId: string;
  role: PortalUserRole;
  email: string;
  displayName?: string | null;
  contactId?: string | null;
  propertyIds?: string[];
  actorId?: string | null;
  /** When true, mark prior pending invites for same email as replaced. */
  replacePending?: boolean;
}): Promise<{
  portalUser: PortalUser;
  delivery: PortalInvitationDelivery;
  invitationToken: string;
}> {
  if (!PORTAL_USER_ROLES.includes(args.role)) {
    throw new Error('Invalid portal role');
  }
  const email = normalizePortalEmail(args.email);
  if (!email || !email.includes('@')) {
    throw new Error('Valid email required');
  }

  const { account } = await ensurePortalAccount(args.organizationId, args.customerId, {
    portalEnabled: true,
    status: 'active',
  });
  if (
    account.status === 'suspended' ||
    account.status === 'archived' ||
    account.status === 'locked'
  ) {
    throw new Error('Portal account is not eligible for invitation');
  }

  if (args.replacePending !== false) {
    await markPendingInvitesReplaced(args.organizationId, args.customerId, email);
  }

  const cfg = getPortalSecurityConfig();
  const invitationToken = createPortalOpaqueToken(32);
  const tokenHash = hashPortalSecret(invitationToken, 'portal-invitation');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + portalInvitationTtlMs(cfg));

  const created = await colCreate(
    args.organizationId,
    'portalUsers',
    stripUndefinedDeep({
      customerId: args.customerId,
      portalAccountId: account.id,
      contactId: args.contactId ?? null,
      authUserId: null,
      role: args.role,
      status: 'invited',
      propertyIds: args.propertyIds ?? [],
      permissions: [],
      displayName: args.displayName ?? null,
      email,
      normalizedEmail: email,
      invitationStatus: 'pending',
      invitationSentAt: now,
      invitationExpiresAt: expiresAt,
      invitationConsumedAt: null,
      invitationTokenHash: tokenHash,
      claimedAt: null,
      lastLoginAt: null,
      failedVerificationCount: 0,
      lockedUntil: null,
      sessionVersion: 0,
      createdBy: args.actorId ?? null,
      updatedBy: args.actorId ?? null,
    }),
  );

  const portalUser = (await colGet<PortalUser>(args.organizationId, 'portalUsers', created.id))!;

  const provider = getPortalDeliveryProvider();
  const send = await provider.sendInvitation({
    to: email,
    organizationId: args.organizationId,
    invitationToken,
    claimPath: `/portal/invite/${invitationToken}`,
  });

  const delivery: PortalInvitationDelivery = {
    channel: provider.name === 'emulator' ? 'emulator' : 'email',
    to: email,
    subject: 'Your customer portal invitation',
    invitationToken: provider.name === 'emulator' ? invitationToken : undefined,
    message: publicDeliveryMessage(),
  };
  if (delivery.channel === 'emulator') {
    legacyDeliveries.push({ ...delivery });
  }
  void send;
  void redactPortalLogMetadata({
    event: 'portal.invitation.created',
    organizationId: args.organizationId,
    customerId: args.customerId,
    portalUserId: portalUser.id,
  });

  await logCustomerActivity(
    args.organizationId,
    args.customerId,
    'email_sent',
    'Portal invitation created',
    args.actorId,
    'System',
  );

  return { portalUser, delivery, invitationToken };
}

/**
 * Replacement resend: mark prior pending invite REPLACED, issue a new pending invite + token.
 */
export async function resendPortalUserInvitation(args: {
  organizationId: string;
  portalUserId: string;
  actorId?: string | null;
}): Promise<{
  portalUser: PortalUser;
  delivery: PortalInvitationDelivery;
  invitationToken: string;
}> {
  const existing = await getPortalUser(args.organizationId, args.portalUserId);
  if (!existing?.email) {
    throw new Error('Portal invitation not found');
  }
  if (existing.invitationStatus !== 'pending') {
    throw new Error('Only pending invitations can be resent');
  }
  const cfg = getPortalSecurityConfig();
  if (
    existing.invitationSentAt &&
    Date.now() - existing.invitationSentAt.getTime() < cfg.invitationResendCooldownSeconds * 1000
  ) {
    throw new Error(PORTAL_PUBLIC_MESSAGES.tryAgainLater);
  }
  return createPortalUserInvitation({
    organizationId: args.organizationId,
    customerId: existing.customerId,
    role: existing.role,
    email: existing.email,
    displayName: existing.displayName,
    contactId: existing.contactId,
    propertyIds: existing.propertyIds,
    actorId: args.actorId,
    replacePending: true,
  });
}

export async function revokePortalInvitation(args: {
  organizationId: string;
  portalUserId: string;
  actorId?: string | null;
}): Promise<PortalUser | null> {
  const user = await getPortalUser(args.organizationId, args.portalUserId);
  if (!user) return null;
  await colUpdate(args.organizationId, 'portalUsers', user.id, {
    invitationStatus: 'revoked',
    invitationTokenHash: null,
    status: user.status === 'invited' ? 'locked' : user.status,
    updatedBy: args.actorId ?? null,
  });
  await invalidatePortalSessions(args.organizationId, {
    portalAccountId: user.portalAccountId,
    portalUserId: user.id,
    actorId: args.actorId,
  });
  return colGet<PortalUser>(args.organizationId, 'portalUsers', user.id);
}

/**
 * Atomic invitation claim. Soft failures return enumeration-safe message.
 * authUserId is server-assigned from verified ID token only.
 */
export async function claimPortalInvitation(args: {
  invitationToken: string;
  authUserId: string;
}): Promise<
  | {
      ok: true;
      organizationId: string;
      customerId: string;
      portalAccountId: string;
      portalUserId: string;
    }
  | { ok: false; message: string }
> {
  const fail = { ok: false as const, message: PORTAL_PUBLIC_MESSAGES.accessUnavailable };
  if (!args.authUserId || typeof args.authUserId !== 'string') {
    return fail;
  }

  const tokenHash = hashPortalSecret(args.invitationToken, 'portal-invitation');
  const db = getAdminFirestore();

  const snap = await db
    .collectionGroup('portalUsers')
    .where('invitationTokenHash', '==', tokenHash)
    .limit(1)
    .get();

  if (snap.empty) {
    return fail;
  }

  const docRef = snap.docs[0]!.ref;
  const orgId = docRef.parent.parent?.id;
  if (!orgId) {
    return fail;
  }

  try {
    const result = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(docRef);
      if (!fresh.exists) return null;
      const user = mapUser(fresh.id, fresh.data()!);

      if (user.invitationStatus !== 'pending') {
        return null;
      }
      if (user.invitationExpiresAt && user.invitationExpiresAt.getTime() < Date.now()) {
        tx.update(docRef, { invitationStatus: 'expired', invitationTokenHash: null });
        return null;
      }
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        return null;
      }
      if (user.status === 'suspended' || user.status === 'locked' || user.revokedAt) {
        return null;
      }

      const accountRef = db.doc(`organizations/${orgId}/portalAccounts/${user.portalAccountId}`);
      const accountSnap = await tx.get(accountRef);
      if (!accountSnap.exists) return null;
      const account = mapTimestampsFromData({
        id: accountSnap.id,
        ...accountSnap.data()!,
      }) as Awaited<ReturnType<typeof getPortalAccount>>;
      if (
        !account?.portalEnabled ||
        account.status === 'suspended' ||
        account.status === 'archived' ||
        account.status === 'locked' ||
        account.customerId !== user.customerId
      ) {
        return null;
      }

      // Do not run non-transactional queries inside the transaction.
      // authUserId uniqueness is enforced by subsequent reads / staff tooling.

      const now = new Date();
      tx.update(docRef, {
        authUserId: args.authUserId,
        status: 'active',
        invitationStatus: 'consumed',
        invitationConsumedAt: now,
        invitationTokenHash: null,
        claimedAt: now,
        lastLoginAt: now,
        failedVerificationCount: 0,
        lockedUntil: null,
        updatedAt: now,
      });

      return {
        organizationId: orgId,
        customerId: user.customerId,
        portalAccountId: user.portalAccountId,
        portalUserId: user.id,
      };
    });

    if (!result) {
      return fail;
    }

    await logCustomerActivity(
      result.organizationId,
      result.customerId,
      'note_added',
      'Portal invitation claimed',
      null,
      'System',
    );

    return { ok: true, ...result };
  } catch {
    return fail;
  }
}
