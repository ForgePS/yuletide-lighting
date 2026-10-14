import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isDemoEntryEnabled } from './demo-access';

describe('demo-access', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('enables demo entry outside production by default', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_DEMO_ENTRY;
    expect(isDemoEntryEnabled()).toBe(true);
  });

  it('can disable demo entry explicitly', () => {
    process.env.ALLOW_DEMO_ENTRY = '0';
    expect(isDemoEntryEnabled()).toBe(false);
  });

  it('can enable demo entry in production explicitly', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_ENTRY = '1';
    expect(isDemoEntryEnabled()).toBe(true);
  });
});
