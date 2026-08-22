/**
 * PORTAL-P2-S7B — legacy path translation + scope conflict + redaction unit tests.
 * ENVIRONMENT=EMULATOR
 */
import { describe, expect, it } from 'vitest';
import {
  mapLegacyPortalPathToAppPath,
  portalAppPath,
  portalInviteSuccessPath,
  formatPortalStatusLabel,
  portalSessionTokenScopeConflict,
  redactPortalMagicTokenPath,
  translateLegacyPortalPathToSessionPath,
} from './portal-legacy-path';

const TOKEN = 'syntheticMagicTokenAAAA1111BBBB2222';

describe('YL-S12 portal invite + status labels', () => {
  it('portalInviteSuccessPath is session-first home', () => {
    expect(portalInviteSuccessPath()).toBe('/portal/app');
  });

  it('formatPortalStatusLabel is null-safe', () => {
    expect(formatPortalStatusLabel(null)).toBe('Unknown');
    expect(formatPortalStatusLabel(undefined)).toBe('Unknown');
    expect(formatPortalStatusLabel('')).toBe('Unknown');
    expect(formatPortalStatusLabel('awaiting_signature')).toBe('Awaiting Signature');
  });
});

describe('P2-S7B legacy route translation', () => {
  it('maps root', () => {
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}`)).toBe('/portal/app');
  });

  it('maps billing / schedule / messages / documents', () => {
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/billing`)).toBe('/portal/app/billing');
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/schedule`)).toBe('/portal/app/schedule');
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/messages`)).toBe('/portal/app/messages');
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/documents`)).toBe(
      '/portal/app/documents',
    );
  });

  it('maps jobs list and job detail', () => {
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/jobs`)).toBe('/portal/app/jobs');
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/jobs/job-123`)).toBe(
      '/portal/app/jobs/job-123',
    );
  });

  it('rejects unknown paths safely', () => {
    expect(mapLegacyPortalPathToAppPath(`/portal/${TOKEN}/not-a-feature`)).toBeNull();
    expect(mapLegacyPortalPathToAppPath('/portal/app/billing')).toBeNull();
    expect(mapLegacyPortalPathToAppPath('/portal/login')).toBeNull();
  });

  it('translated URL never contains raw token', () => {
    const dest = translateLegacyPortalPathToSessionPath(`/portal/${TOKEN}/billing`);
    expect(dest).toBeTruthy();
    expect(dest!).not.toContain(TOKEN);
    expect(portalAppPath('billing')).not.toContain(TOKEN);
  });
});

describe('P2-S7B session/token scope conflict', () => {
  it('same account — no conflict', () => {
    expect(portalSessionTokenScopeConflict('cust_a', 'cust_a')).toBe(false);
  });

  it('missing existing session — no conflict', () => {
    expect(portalSessionTokenScopeConflict(null, 'cust_b')).toBe(false);
  });

  it('same tenant / different customer — conflict', () => {
    expect(portalSessionTokenScopeConflict('cust_a', 'cust_b')).toBe(true);
  });

  it('different tenant customer id — conflict', () => {
    expect(portalSessionTokenScopeConflict('cust_tenant_a', 'cust_tenant_b')).toBe(true);
  });
});

describe('P2-S7B path redaction', () => {
  it('redacts raw magic token from paths', () => {
    expect(redactPortalMagicTokenPath(`/portal/${TOKEN}/billing`)).toBe('/portal/[token]/billing');
    expect(redactPortalMagicTokenPath(`/portal/${TOKEN}/jobs/job-123`)).toBe(
      '/portal/[token]/jobs/[jobId]',
    );
    expect(redactPortalMagicTokenPath(`/portal/${TOKEN}`)).toBe('/portal/[token]');
    expect(redactPortalMagicTokenPath('/portal/app/billing')).toBe('/portal/app/billing');
  });
});
