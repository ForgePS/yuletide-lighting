/**
 * Portal Phase 2 S5 — route authorization + file access unit tests.
 * ENVIRONMENT=EMULATOR (pure unit where possible).
 */
import { describe, expect, it } from 'vitest';
import { PORTAL_ROUTE_DEFINITIONS, resolvePortalRouteDefinition } from './portal-route-access';
import {
  sanitizePortalFilename,
  resolvePortalStoragePath,
  verifyPortalFileTicket,
  assertSafePortalStoragePath,
} from './portal-file-access';
import { getPortalSecurityConfig, portalFileAccessTtlMs } from './portal-security-config';

describe('P2-S5 route mapping', () => {
  it('maps every protected feature segment in PORTAL_ROUTE_DEFINITIONS', () => {
    const features = new Set(PORTAL_ROUTE_DEFINITIONS.map((d) => d.feature).filter(Boolean));
    for (const required of [
      'dashboard',
      'scheduling',
      'service_requests',
      'messaging',
      'e_sign',
      'billing',
      'proposals',
      'agreements',
      'properties',
      'mockups',
      'documents',
      'install_tracking',
      'takedowns',
      'storage',
      'consultations',
      'reviews',
      'rebooking',
    ]) {
      expect(features.has(required as never)).toBe(true);
    }
  });

  it('resolves known paths and fails closed on unknown segments', () => {
    expect(resolvePortalRouteDefinition('/portal/tok/billing')?.feature).toBe('billing');
    expect(resolvePortalRouteDefinition('/portal/tok/jobs/job_1')?.resourceType).toBe('job');
    expect(resolvePortalRouteDefinition('/portal/tok/not-a-real-feature')).toBeNull();
    expect(resolvePortalRouteDefinition('/portal/login')).toBeNull();
  });

  it('unknown feature route class is not authenticated-open by default', () => {
    const unknown = resolvePortalRouteDefinition('/portal/abc/secret-admin');
    expect(unknown).toBeNull();
  });
});

describe('P2-S5 file path + filename hardening', () => {
  it('sanitizes path traversal and injection characters in filenames', () => {
    expect(sanitizePortalFilename('../../etc/passwd')).not.toContain('..');
    expect(sanitizePortalFilename('a/b\\c:d*.pdf')).toBe('a_b_c_d_.pdf');
    expect(sanitizePortalFilename('%2e%2e/x')).not.toMatch(/\.\./);
  });

  it('resolves only same-tenant organization storage paths', () => {
    const org = 'orgA';
    expect(resolvePortalStoragePath(org, `organizations/${org}/portal-service/c1/f.jpg`)).toBe(
      `organizations/${org}/portal-service/c1/f.jpg`,
    );
    expect(resolvePortalStoragePath(org, 'organizations/orgB/portal-service/c1/f.jpg')).toBeNull();
    expect(resolvePortalStoragePath(org, `/api/files?path=organizations/${org}/docs/a.pdf`)).toBe(
      `organizations/${org}/docs/a.pdf`,
    );
    expect(resolvePortalStoragePath(org, '/api/files?path=../secret')).toBeNull();
  });

  it('rejects path traversal in assertSafePortalStoragePath', () => {
    expect(() =>
      assertSafePortalStoragePath('orgA', 'c1', 'organizations/orgA/../orgB/x'),
    ).toThrow();
    expect(() =>
      assertSafePortalStoragePath('orgA', 'c1', 'organizations/orgA/portal-service/c2/x'),
    ).toThrow();
    expect(() =>
      assertSafePortalStoragePath('orgA', 'c1', 'organizations/orgA/portal-service/c1/ok.jpg'),
    ).not.toThrow();
  });

  it('rejects forged/expired tickets', () => {
    expect(verifyPortalFileTicket('not-a-ticket')).toBeNull();
    expect(verifyPortalFileTicket('abc.def')).toBeNull();
  });

  it('uses centralized short file access TTL', () => {
    const cfg = getPortalSecurityConfig();
    expect(cfg.fileAccessTtlMinutes).toBeGreaterThanOrEqual(1);
    expect(cfg.fileAccessTtlMinutes).toBeLessThanOrEqual(60);
    expect(portalFileAccessTtlMs(cfg)).toBe(cfg.fileAccessTtlMinutes * 60 * 1000);
    expect(cfg.maxUploadBytes).toBeLessThanOrEqual(12_000_000);
  });
});
