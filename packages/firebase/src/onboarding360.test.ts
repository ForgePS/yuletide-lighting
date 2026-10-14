import { describe, expect, it } from 'vitest';
import {
  COMPANY_SETUP_STEP_IDS,
  SKIPPABLE_COMPANY_SETUP_STEPS,
} from '@clcrm/types';

describe('company setup steps', () => {
  it('defines 16 setup stages', () => {
    expect(COMPANY_SETUP_STEP_IDS).toHaveLength(16);
    expect(COMPANY_SETUP_STEP_IDS).toContain('launch_readiness');
  });

  it('marks optional import and inventory as skippable', () => {
    expect(SKIPPABLE_COMPANY_SETUP_STEPS).toContain('customer_import');
    expect(SKIPPABLE_COMPANY_SETUP_STEPS).toContain('inventory');
  });
});
