/**
 * Configuration registry foundation (Phase 2 prep).
 * Precedence: user preference → location override → tenant override → plan default → platform default
 */

export type ConfigurationNamespace =
  | 'organization'
  | 'branding'
  | 'modules'
  | 'portal'
  | 'navigation'
  | 'services'
  | 'workflow'
  | 'notifications'
  | 'integrations'
  | 'security'
  | 'reports'
  | 'maps'
  | 'ai'
  | 'billing';

export type ConfigurationScope = 'platform' | 'plan' | 'tenant' | 'location' | 'user';

export type ConfigurationKey = `${ConfigurationNamespace}.${string}`;

export type ConfigurationValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, string | number | boolean | null>;

export type ConfigurationVersion = number;

export type ConfigurationAuditRecord = {
  id: string;
  namespace: ConfigurationNamespace;
  key: ConfigurationKey;
  scope: ConfigurationScope;
  organizationId?: string | null;
  locationId?: string | null;
  userId?: string | null;
  previousValue: ConfigurationValue | undefined;
  nextValue: ConfigurationValue;
  actorUserId: string;
  createdAt: Date;
};

export type ConfigurationValidationResult =
  | { ok: true; value: ConfigurationValue }
  | { ok: false; error: string };

export type ResolvedConfigurationResult<T extends ConfigurationValue = ConfigurationValue> = {
  key: ConfigurationKey;
  value: T;
  source: ConfigurationScope;
  version: ConfigurationVersion;
};

export const CONFIGURATION_NAMESPACES: ConfigurationNamespace[] = [
  'organization',
  'branding',
  'modules',
  'portal',
  'navigation',
  'services',
  'workflow',
  'notifications',
  'integrations',
  'security',
  'reports',
  'maps',
  'ai',
  'billing',
];

const SCOPE_RANK: Record<ConfigurationScope, number> = {
  user: 5,
  location: 4,
  tenant: 3,
  plan: 2,
  platform: 1,
};

function isPlainRecord(value: unknown): value is Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (v) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}

/**
 * Resolve a configuration key using explicit precedence.
 * Missing values do not invent unsafe defaults — caller supplies platformDefault or receives an error.
 */
export function resolveConfigurationValue<T extends ConfigurationValue>(
  key: ConfigurationKey,
  layers: Partial<Record<ConfigurationScope, ConfigurationValue | undefined>>,
  options?: { platformDefault?: T; version?: ConfigurationVersion },
): ResolvedConfigurationResult<T> | { ok: false; error: string } {
  const order: ConfigurationScope[] = ['user', 'location', 'tenant', 'plan', 'platform'];
  for (const scope of order) {
    const value = layers[scope];
    if (value !== undefined) {
      return {
        key,
        value: value as T,
        source: scope,
        version: options?.version ?? 1,
      };
    }
  }
  if (options?.platformDefault !== undefined) {
    return {
      key,
      value: options.platformDefault,
      source: 'platform',
      version: options?.version ?? 1,
    };
  }
  return { ok: false, error: `configuration missing for ${key}` };
}

export function validateConfigurationValue(value: unknown): ConfigurationValidationResult {
  if (value === null) return { ok: true, value: null };
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { ok: true, value };
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return { ok: true, value };
  }
  if (isPlainRecord(value)) return { ok: true, value };
  return { ok: false, error: 'invalid configuration value' };
}

export function scopeOutranks(a: ConfigurationScope, b: ConfigurationScope): boolean {
  return SCOPE_RANK[a] > SCOPE_RANK[b];
}
