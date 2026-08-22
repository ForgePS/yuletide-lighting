import { getOrganization } from './firestore';
import { listFeatureFlags } from './settings360';

/**
 * Follow-up automation is disabled by default (P0.2 Option B).
 * Enable only when org.featureFlags.followUpAutomation or settings flag follow_up_automation is true.
 */
export async function isFollowUpAutomationEnabled(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  const orgFlag = (org as { featureFlags?: { followUpAutomation?: boolean } } | null)?.featureFlags
    ?.followUpAutomation;
  if (orgFlag === true) return true;

  try {
    const flags = await listFeatureFlags(orgId);
    const setting = flags.find((f) => f.key === 'follow_up_automation');
    return setting?.enabled === true;
  } catch {
    return false;
  }
}
