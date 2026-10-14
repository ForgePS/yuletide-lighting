import { describe, expect, it } from 'vitest';
import { DEMO_EMAIL_SIMULATED, DEMO_TENANT_SLUG } from '@clcrm/types';
import {
  createDemoSimulatedEmailResult,
  demoSimulatedCodeForOperation,
  isDemoOrganization,
} from './demo-tenant';

describe('demo-tenant guards', () => {
  it('detects demo tenant by flag or slug', () => {
    expect(isDemoOrganization({ isDemoTenant: true, slug: 'other' })).toBe(true);
    expect(isDemoOrganization({ isDemoTenant: false, slug: DEMO_TENANT_SLUG })).toBe(true);
    expect(isDemoOrganization({ isDemoTenant: false, slug: 'acme-lights' })).toBe(false);
    expect(isDemoOrganization(null)).toBe(false);
  });

  it('returns stable simulated outbound codes', () => {
    expect(demoSimulatedCodeForOperation('email')).toBe(DEMO_EMAIL_SIMULATED);
    expect(createDemoSimulatedEmailResult().code).toBe(DEMO_EMAIL_SIMULATED);
  });
});
