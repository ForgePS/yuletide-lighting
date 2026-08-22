import { describe, expect, it } from 'vitest';
import {
  createPortalQrRawToken,
  hashPortalQrToken,
  maskEmail,
  maskNamePart,
  maskPhone,
  maskStreet,
  portalQrAccessUrl,
  portalQrTestUtils,
} from '../src/portal-qr360';
import type { PortalQrCode } from '@clcrm/types';

function fakeQr(partial: Partial<PortalQrCode>): PortalQrCode {
  return {
    id: 'qr1',
    organizationId: 'org_a',
    customerId: 'cust_secret_123',
    type: 'customer_portal',
    tokenHash: 'abc',
    tokenVersion: 1,
    status: 'active',
    accessMode: 'activation',
    reusable: false,
    requireIdentityVerification: true,
    scanCount: 0,
    failedVerificationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('portal QR security helpers', () => {
  it('creates unique non-sequential tokens', () => {
    const a = createPortalQrRawToken();
    const b = createPortalQrRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(b.length).toBeGreaterThanOrEqual(32);
  });

  it('batch generation produces unique codes', () => {
    const set = new Set(Array.from({ length: 50 }, () => createPortalQrRawToken()));
    expect(set.size).toBe(50);
  });

  it('hashes tokens stably and does not equal raw token', () => {
    const raw = createPortalQrRawToken();
    const hash = hashPortalQrToken(raw);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashPortalQrToken(raw));
    expect(hash).not.toBe(raw);
  });

  it('never puts customer id, email, or org id in the access URL', () => {
    const raw = createPortalQrRawToken();
    const url = portalQrAccessUrl(raw);
    expect(url).toContain('/portal/access/');
    expect(url).toContain(raw);
    expect(url.toLowerCase()).not.toContain('customer');
    expect(url).not.toMatch(/@[a-z0-9.-]+\./i);
    expect(url).not.toContain('org_');
    expect(url).not.toContain('cus_');
    expect(url).not.toContain('cust_secret');
  });

  it('tokens are not guessable sequentially from prior token bytes', () => {
    const tokens = Array.from({ length: 20 }, () => createPortalQrRawToken());
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i]).not.toBe(tokens[i - 1]);
      // base64url alphabet only — no predictable numeric suffix pattern required
      expect(tokens[i]).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('masks identity for activation welcome only', () => {
    expect(maskNamePart('Jeremy')).toMatch(/^J•+/);
    expect(maskStreet('123 Main Street')).toMatch(/123 M•+/);
    expect(maskEmail('jeremy@example.com')).toBe('j••••@example.com');
    expect(maskPhone('(555) 123-9876')).toBe('•••-•••-9876');
  });
});

describe('portal QR status validation', () => {
  const { isExpired, isInactiveStatus } = portalQrTestUtils;

  it('rejects expired by status and by expiresAt', () => {
    expect(isExpired(fakeQr({ status: 'expired' }))).toBe(true);
    expect(isExpired(fakeQr({ expiresAt: new Date(Date.now() - 60_000) }))).toBe(true);
    expect(isExpired(fakeQr({ expiresAt: new Date(Date.now() + 86_400_000) }))).toBe(false);
    expect(isExpired(fakeQr({ expiresAt: null }))).toBe(false);
  });

  it('treats revoked, replaced, suspended, invalid, draft as inactive', () => {
    for (const status of [
      'revoked',
      'replaced',
      'suspended',
      'invalid',
      'expired',
      'draft',
    ] as const) {
      expect(isInactiveStatus(status)).toBe(true);
    }
    expect(isInactiveStatus('active')).toBe(false);
    expect(isInactiveStatus('reusable')).toBe(false);
    // P2-S6: single-use activation is terminal — further OTP/verify cycles denied.
    expect(isInactiveStatus('used_for_activation')).toBe(true);
  });
});

describe('portal QR device classification', () => {
  const { parseDevice } = portalQrTestUtils;

  it('classifies phone, tablet, and desktop user agents', () => {
    expect(parseDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)').deviceClass).toBe(
      'phone',
    );
    expect(parseDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)').deviceClass).toBe('tablet');
    expect(
      parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0').deviceClass,
    ).toBe('desktop');
    expect(parseDevice(null).deviceClass).toBe('unknown');
  });
});
