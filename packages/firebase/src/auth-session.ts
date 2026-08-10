/**
 * YL-S2 — Staff Firebase Auth session verification helpers.
 * Cryptographic verify + revocation + Auth disabled checks.
 * Middleware may still use structural JWT checks; server paths must use these helpers.
 */

import { getAdminAuth } from './admin';

export const AUTH_USER_DISABLED = 'AUTH_USER_DISABLED';
export const AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID';

export type VerifiedStaffToken = {
  uid: string;
  email?: string;
  name?: string;
};

export type StaffAuthFailureReason = 'invalid_token' | 'disabled' | 'revoked';

/**
 * Classify Admin Auth verification failures into stable app reasons.
 */
export function classifyStaffAuthError(err: unknown): StaffAuthFailureReason {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === AUTH_USER_DISABLED || /USER_DISABLED|auth\/user-disabled/i.test(msg)) {
    return 'disabled';
  }
  if (/ID_TOKEN_REVOKED|auth\/id-token-revoked|SESSION_COOKIE_REVOKED/i.test(msg)) {
    return 'revoked';
  }
  return 'invalid_token';
}

export function isFirebaseAuthUserDisabled(record: { disabled?: boolean } | null | undefined): boolean {
  return Boolean(record?.disabled);
}

/**
 * Verify Firebase ID token with revocation check, then reject disabled Auth users.
 */
export async function verifyStaffIdToken(idToken: string): Promise<VerifiedStaffToken> {
  if (!idToken || idToken.trim().length < 20) {
    throw new Error(AUTH_TOKEN_INVALID);
  }

  let decoded: { uid: string; email?: string; name?: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken.trim(), true);
  } catch (err) {
    const reason = classifyStaffAuthError(err);
    if (reason === 'revoked') throw err;
    const wrapped = new Error(AUTH_TOKEN_INVALID);
    (wrapped as Error & { cause?: unknown }).cause = err;
    throw wrapped;
  }

  const authUser = await getAdminAuth().getUser(decoded.uid);
  if (isFirebaseAuthUserDisabled(authUser)) {
    throw new Error(AUTH_USER_DISABLED);
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? authUser.email ?? undefined,
    name: decoded.name ?? authUser.displayName ?? undefined,
  };
}

/** Back-compat wrapper — always checks revocation (YL-S2). */
export async function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken, true);
}
