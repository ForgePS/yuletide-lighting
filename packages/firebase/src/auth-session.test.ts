import { describe, expect, it } from 'vitest';
import {
  AUTH_USER_DISABLED,
  classifyStaffAuthError,
  isFirebaseAuthUserDisabled,
} from './auth-session';

/** Mirrors apps/web/src/lib/session-token.ts for package-level tests. */
function decodeFirebaseIdTokenPayload(token: string): { exp?: number; sub?: string; user_id?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
      exp?: number;
      sub?: string;
      user_id?: string;
    };
  } catch {
    return null;
  }
}

function isFirebaseIdTokenStructurallyValid(token: string | undefined | null): boolean {
  if (!token || token.length < 20) return false;
  const payload = decodeFirebaseIdTokenPayload(token);
  if (!payload) return false;
  if (!payload.sub && !payload.user_id) return false;
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 30_000) return false;
  return true;
}

describe('middleware session token structural validation', () => {
  function b64url(obj: object) {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  it('rejects missing and malformed tokens', () => {
    expect(isFirebaseIdTokenStructurallyValid(null)).toBe(false);
    expect(isFirebaseIdTokenStructurallyValid('not-a-jwt')).toBe(false);
  });

  it('accepts unexpired JWT-shaped tokens', () => {
    const token = `${b64url({ alg: 'RS256' })}.${b64url({ sub: 'uid123', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
    expect(isFirebaseIdTokenStructurallyValid(token)).toBe(true);
  });

  it('rejects expired tokens', () => {
    const token = `${b64url({ alg: 'RS256' })}.${b64url({ sub: 'uid123', exp: Math.floor(Date.now() / 1000) - 120 })}.sig`;
    expect(isFirebaseIdTokenStructurallyValid(token)).toBe(false);
  });
});

describe('YL-S2 auth-session helpers', () => {
  it('detects disabled auth users', () => {
    expect(isFirebaseAuthUserDisabled({ disabled: true })).toBe(true);
    expect(isFirebaseAuthUserDisabled({ disabled: false })).toBe(false);
    expect(isFirebaseAuthUserDisabled(null)).toBe(false);
  });

  it('classifies disabled errors', () => {
    expect(classifyStaffAuthError(new Error(AUTH_USER_DISABLED))).toBe('disabled');
    expect(classifyStaffAuthError(new Error('Firebase: Error (auth/user-disabled).'))).toBe('disabled');
  });

  it('classifies revoked tokens', () => {
    expect(classifyStaffAuthError(new Error('ID_TOKEN_REVOKED'))).toBe('revoked');
    expect(classifyStaffAuthError(new Error('auth/id-token-revoked'))).toBe('revoked');
  });

  it('classifies other errors as invalid_token', () => {
    expect(classifyStaffAuthError(new Error('auth/argument-error'))).toBe('invalid_token');
    expect(classifyStaffAuthError('boom')).toBe('invalid_token');
  });
});
