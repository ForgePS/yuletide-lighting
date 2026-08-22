import { describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';
import {
  isValidPublicAccessToken,
  normalizePublicAccessToken,
  parsePublicAccessToken,
  PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH,
  PUBLIC_ACCESS_TOKEN_MIN_LENGTH,
} from '@clcrm/types';
import { publicAccessTokenSchema } from '@clcrm/validators';

describe('YL-S22 public access tokens', () => {
  it('rejects empty, short, and invalid charset tokens', () => {
    expect(normalizePublicAccessToken('  ')).toBeNull();
    expect(isValidPublicAccessToken('')).toBe(false);
    expect(isValidPublicAccessToken('short')).toBe(false);
    expect(isValidPublicAccessToken('almost-sixteen')).toBe(false); // 14
    expect(isValidPublicAccessToken('valid-token-16ch')).toBe(true); // 16
    expect(isValidPublicAccessToken('bad token spaces!!')).toBe(false);
    expect(parsePublicAccessToken('tiny')).toBeNull();
    expect(parsePublicAccessToken('  valid-token-16ch  ')).toBe('valid-token-16ch');
  });

  it('accepts generated nanoid-length URL-safe tokens', () => {
    const token = nanoid(PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH);
    expect(token).toHaveLength(PUBLIC_ACCESS_TOKEN_GENERATED_LENGTH);
    expect(token.length).toBeGreaterThanOrEqual(PUBLIC_ACCESS_TOKEN_MIN_LENGTH);
    expect(isValidPublicAccessToken(token)).toBe(true);
    expect(publicAccessTokenSchema.safeParse(token).success).toBe(true);
  });

  it('zod schema fails closed for weak tokens', () => {
    expect(publicAccessTokenSchema.safeParse('').success).toBe(false);
    expect(publicAccessTokenSchema.safeParse('prop-b1').success).toBe(false);
    expect(publicAccessTokenSchema.safeParse('s6-inv-xb').success).toBe(false);
    expect(publicAccessTokenSchema.safeParse('a'.repeat(15)).success).toBe(false);
    expect(publicAccessTokenSchema.safeParse('a'.repeat(16)).success).toBe(true);
  });
});
