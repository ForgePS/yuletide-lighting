import {
  ORGANIZATION_CONFIG_SCHEMA_VERSION,
  resolveModulesForOrganization,
  type CrmPlatformModuleKey,
  type SubscriptionTier,
} from '@clcrm/types';

export type ProvisionSubscriptionInput = {
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'locked';
  subscriptionTier?: SubscriptionTier;
  subscriptionPlan?: 'monthly' | 'yearly' | null;
  disabledModules?: string[];
  /** When set, intersect resolved modules with this allow-list (platform catalog). */
  availableModules?: CrmPlatformModuleKey[];
};

/**
 * Fields every organization create path must write atomically with the org root doc.
 */
export function buildOrganizationProvisioningFields(input: ProvisionSubscriptionInput) {
  const tier =
    input.subscriptionTier ??
    (input.subscriptionStatus === 'trialing'
      ? 'trial'
      : input.subscriptionStatus === 'active' || input.subscriptionStatus === 'past_due'
        ? 'standard'
        : 'trial');

  const resolved = resolveModulesForOrganization(
    {
      subscriptionStatus: input.subscriptionStatus,
      subscriptionTier: tier,
      subscriptionPlan: input.subscriptionPlan,
      disabledModules: input.disabledModules,
    },
    { forcePreset: true },
  );

  if (!resolved.ok) {
    throw new Error(`Organization provisioning rejected: ${resolved.error}`);
  }

  let modules = resolved.modules;
  if (input.availableModules) {
    const allow = new Set(input.availableModules);
    modules = modules.filter((m) => allow.has(m));
  }

  if (modules.length === 0) {
    throw new Error('Organization provisioning rejected: enabledModules would be empty');
  }

  return {
    subscriptionStatus: input.subscriptionStatus,
    subscriptionPlan: input.subscriptionPlan ?? null,
    subscriptionTier: resolved.tier,
    enabledModules: modules,
    disabledModules: input.disabledModules ?? [],
    configurationSchemaVersion: ORGANIZATION_CONFIG_SCHEMA_VERSION,
    featureFlags: {
      followUpAutomation: false,
    },
  };
}
