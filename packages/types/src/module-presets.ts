import type { CrmPlatformModuleKey } from './creator';
import { CRM_PLATFORM_MODULES, DEFAULT_AVAILABLE_MODULES } from './creator';

/** Bump when organization configuration shape changes incompatibly. */
export const ORGANIZATION_CONFIG_SCHEMA_VERSION = 1;

export const MODULE_MIGRATION_VERSION = 'org-modules-v1';

export type SubscriptionTier =
  | 'trial'
  | 'starter'
  | 'standard'
  | 'professional'
  | 'enterprise'
  | 'custom';

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  'trial',
  'starter',
  'standard',
  'professional',
  'enterprise',
  'custom',
];

export const KNOWN_MODULE_KEYS = new Set<string>(CRM_PLATFORM_MODULES.map((m) => m.key));

/** Creator-only capabilities must never be assigned via tenant presets. */
export const CREATOR_ONLY_MODULE_KEYS = new Set<string>([]);

const CORE: CrmPlatformModuleKey[] = [
  'customers',
  'pipeline',
  'proposals',
  'invoices',
  'jobs',
  'schedule',
  'messages',
  'customer_portal',
];

const STARTER: CrmPlatformModuleKey[] = [...CORE, 'mockups', 'inventory', 'reports', 'crew'];

const STANDARD: CrmPlatformModuleKey[] = [
  ...STARTER,
  'storage',
  'rebooking',
  'reviews',
  'routes',
  'sign_tracker',
  'time_clock',
];

const PROFESSIONAL: CrmPlatformModuleKey[] = [...STANDARD, 'automation', 'commercial'];

const ENTERPRISE: CrmPlatformModuleKey[] = [...DEFAULT_AVAILABLE_MODULES];

/**
 * Plan-driven module presets stored as configuration (not scattered in call sites).
 * `custom` has no automatic composition — callers must supply modules.
 */
export const MODULE_PRESETS: Record<
  Exclude<SubscriptionTier, 'custom'>,
  readonly CrmPlatformModuleKey[]
> = {
  trial: CORE,
  starter: STARTER,
  standard: STANDARD,
  professional: PROFESSIONAL,
  enterprise: ENTERPRISE,
};

export type OrgModuleSnapshot = {
  enabledModules?: unknown;
  disabledModules?: unknown;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  subscriptionTier?: string | null;
  configurationSchemaVersion?: number | null;
};

export type ResolveModulePresetResult =
  | {
      ok: true;
      tier: SubscriptionTier;
      modules: CrmPlatformModuleKey[];
      reason: string;
    }
  | {
      ok: false;
      error: string;
      tier?: SubscriptionTier;
    };

function asModuleArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === 'string');
}

export function filterKnownModules(keys: string[]): CrmPlatformModuleKey[] {
  const out: CrmPlatformModuleKey[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (!KNOWN_MODULE_KEYS.has(key)) continue;
    if (CREATOR_ONLY_MODULE_KEYS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key as CrmPlatformModuleKey);
  }
  return out;
}

export function unknownModuleKeys(keys: string[] | null | undefined): string[] {
  if (!keys) return [];
  return keys.filter((k) => !KNOWN_MODULE_KEYS.has(k));
}

/**
 * Infer subscription tier for migration/provisioning.
 * Rejects unknown explicit tiers; does not invent paid entitlements.
 */
export function inferSubscriptionTier(org: OrgModuleSnapshot): ResolveModulePresetResult {
  const explicit = org.subscriptionTier?.trim().toLowerCase();
  if (explicit) {
    if (!SUBSCRIPTION_TIERS.includes(explicit as SubscriptionTier)) {
      return { ok: false, error: `unknown subscriptionTier: ${explicit}` };
    }
    return {
      ok: true,
      tier: explicit as SubscriptionTier,
      modules: [],
      reason: 'explicit subscriptionTier',
    };
  }

  const status = (org.subscriptionStatus ?? 'none').toLowerCase();
  if (status === 'trialing') {
    return { ok: true, tier: 'trial', modules: [], reason: 'subscriptionStatus=trialing' };
  }
  if (status === 'active' || status === 'past_due') {
    // Legacy paid orgs without a tier field map to standard (not enterprise / enable-all).
    return {
      ok: true,
      tier: 'standard',
      modules: [],
      reason: `subscriptionStatus=${status} legacy default`,
    };
  }
  if (
    status === 'none' ||
    status === 'canceled' ||
    status === 'locked' ||
    !org.subscriptionStatus
  ) {
    return {
      ok: true,
      tier: 'trial',
      modules: [],
      reason: `subscriptionStatus=${status || 'missing'} → trial`,
    };
  }

  return { ok: false, error: `unknown subscriptionStatus: ${org.subscriptionStatus}` };
}

/**
 * Resolve the modules that should be written for an organization.
 * Preserves explicit disables; never enables creator-only modules.
 */
export function resolveModulesForOrganization(
  org: OrgModuleSnapshot,
  options?: { forcePreset?: boolean },
): ResolveModulePresetResult {
  const inferred = inferSubscriptionTier(org);
  if (!inferred.ok) return inferred;

  const current = asModuleArray(org.enabledModules);
  const disabled = new Set(asModuleArray(org.disabledModules) ?? []);
  const hasModules = Array.isArray(current) && current.length > 0;

  if (inferred.tier === 'custom') {
    if (!hasModules) {
      return { ok: false, error: 'custom tier requires non-empty enabledModules', tier: 'custom' };
    }
    const modules = filterKnownModules(current!).filter((m) => !disabled.has(m));
    return { ok: true, tier: 'custom', modules, reason: 'custom preserves enabledModules' };
  }

  if (hasModules && !options?.forcePreset) {
    const modules = filterKnownModules(current!).filter((m) => !disabled.has(m));
    return {
      ok: true,
      tier: inferred.tier,
      modules,
      reason: 'preserve existing enabledModules',
    };
  }

  const preset = MODULE_PRESETS[inferred.tier];
  const modules = filterKnownModules([...preset]).filter((m) => !disabled.has(m));
  return {
    ok: true,
    tier: inferred.tier,
    modules,
    reason: `apply ${inferred.tier} preset (${inferred.reason})`,
  };
}

export function organizationNeedsModuleMigration(org: OrgModuleSnapshot): boolean {
  const current = asModuleArray(org.enabledModules);
  if (current == null) return true;
  if (current.length === 0) return true;
  if (unknownModuleKeys(current).length > 0) return true;
  if (org.configurationSchemaVersion !== ORGANIZATION_CONFIG_SCHEMA_VERSION) return true;
  if (!org.subscriptionTier) return true;
  return false;
}

export function modulesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}
