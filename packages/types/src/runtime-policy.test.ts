import { describe, expect, it } from 'vitest';
import {
  daysUntilNodejs20Decommission,
  FIREBASE_FUNCTIONS_RUNTIME_ID,
  FIREBASE_NODE_ENGINE_MAJOR,
  FIREBASE_NODE_ENGINES_VALUE,
  firebaseNodeEngineMismatchMessage,
  isFirebaseNodeEngineSatisfied,
  NODEJS20_DECOMMISSION_DATE,
  parseNodeMajorVersion,
} from '@clcrm/types';

describe('YL-S24 Firebase Node runtime policy', () => {
  it('pins Node 22 / nodejs22 before nodejs20 decommission', () => {
    expect(FIREBASE_NODE_ENGINE_MAJOR).toBe(22);
    expect(FIREBASE_NODE_ENGINES_VALUE).toBe('22');
    expect(FIREBASE_FUNCTIONS_RUNTIME_ID).toBe('nodejs22');
    expect(NODEJS20_DECOMMISSION_DATE).toBe('2026-10-30');
  });

  it('parses node versions and satisfies only the target major', () => {
    expect(parseNodeMajorVersion('v22.14.0')).toBe(22);
    expect(parseNodeMajorVersion('20.19.0')).toBe(20);
    expect(parseNodeMajorVersion(null)).toBeNull();
    expect(isFirebaseNodeEngineSatisfied('v22.1.0')).toBe(true);
    expect(isFirebaseNodeEngineSatisfied('v20.11.0')).toBe(false);
    expect(isFirebaseNodeEngineSatisfied('v24.15.0')).toBe(false);
  });

  it('emits mismatch guidance when not on target major', () => {
    expect(firebaseNodeEngineMismatchMessage('v22.0.0')).toBeNull();
    const msg = firebaseNodeEngineMismatchMessage('v20.11.1');
    expect(msg).toContain('Node v20.11.1');
    expect(msg).toContain('Node 22');
    expect(msg).toContain('nodejs22');
    expect(msg).toContain('2026-10-30');
  });

  it('computes days until nodejs20 decommission', () => {
    expect(daysUntilNodejs20Decommission(new Date('2026-10-30T12:00:00Z'))).toBe(0);
    expect(daysUntilNodejs20Decommission(new Date('2026-10-20T12:00:00Z'))).toBe(10);
    expect(daysUntilNodejs20Decommission(new Date('2026-11-01T12:00:00Z'))).toBeLessThan(0);
  });
});
