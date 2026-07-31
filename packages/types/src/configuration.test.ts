import { describe, expect, it } from 'vitest';
import {
  resolveConfigurationValue,
  validateConfigurationValue,
  scopeOutranks,
} from './configuration';

describe('configuration resolver', () => {
  it('prefers user over tenant over platform', () => {
    const result = resolveConfigurationValue('branding.primaryColor', {
      platform: '#000000',
      tenant: '#111111',
      user: '#222222',
    });
    expect('ok' in result && result.ok === false).toBe(false);
    if ('ok' in result) return;
    expect(result.value).toBe('#222222');
    expect(result.source).toBe('user');
  });

  it('falls back to platform default when layers empty', () => {
    const result = resolveConfigurationValue('maps.enabled', {}, { platformDefault: false });
    expect('ok' in result && result.ok === false).toBe(false);
    if ('ok' in result) return;
    expect(result.value).toBe(false);
    expect(result.source).toBe('platform');
  });

  it('fails closed when missing with no default', () => {
    const result = resolveConfigurationValue('ai.provider', {});
    expect(result).toEqual({ ok: false, error: 'configuration missing for ai.provider' });
  });

  it('validates values', () => {
    expect(validateConfigurationValue(true).ok).toBe(true);
    expect(validateConfigurationValue({ nested: { bad: true } }).ok).toBe(false);
  });

  it('ranks scopes', () => {
    expect(scopeOutranks('user', 'tenant')).toBe(true);
    expect(scopeOutranks('platform', 'plan')).toBe(false);
  });
});
