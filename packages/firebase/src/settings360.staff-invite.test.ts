import { describe, expect, it } from 'vitest';
import { buildStaffInviteUrl, hashStaffInviteToken } from './settings360';

describe('YL-S26 staff invite helpers', () => {
  it('hashes invite tokens deterministically', () => {
    const a = hashStaffInviteToken('opaque-token-value-abcdefgh');
    const b = hashStaffInviteToken('opaque-token-value-abcdefgh');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(hashStaffInviteToken('different-token-value-xyz')).not.toBe(a);
  });

  it('builds invite URL under app origin', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.test/';
    expect(buildStaffInviteUrl('abc123tokenvaluehere')).toBe(
      'https://example.test/invite/abc123tokenvaluehere',
    );
    if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});
