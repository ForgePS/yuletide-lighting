import type { CrmUiConfig } from '@clcrm/types';
import { DEFAULT_CRM_UI_CONFIG, DEFAULT_CRM_NAV_ITEMS } from '@clcrm/types';
import { getAdminFirestore, Timestamp, orgPath } from './admin';
import { mapTimestampsFromData } from './firestore-utils';
import { getOrganization } from './firestore';

function docPath(orgId: string) {
  return `${orgPath(orgId, 'settings')}/uiConfig`;
}

function ts() {
  return Timestamp.now();
}

function mergeWithDefaults(raw: Partial<CrmUiConfig> | null | undefined): CrmUiConfig {
  const navByKey = new Map(DEFAULT_CRM_NAV_ITEMS.map((item) => [item.key, { ...item }]));
  for (const item of raw?.navItems ?? []) {
    const base = navByKey.get(item.key as (typeof DEFAULT_CRM_NAV_ITEMS)[number]['key']);
    if (base) {
      navByKey.set(base.key, {
        ...base,
        ...item,
        key: base.key,
        href: item.href || base.href,
        section: item.section || base.section,
        moduleKey: item.moduleKey ?? base.moduleKey,
        permissionResource: item.permissionResource ?? base.permissionResource,
      });
    }
  }
  return {
    navItems: [...navByKey.values()].sort((a, b) => a.order - b.order),
    labelOverrides: { ...(raw?.labelOverrides ?? {}) },
    theme: {
      ...DEFAULT_CRM_UI_CONFIG.theme,
      ...(raw?.theme ?? {}),
    },
    customFields: raw?.customFields ?? [],
    updatedAt: raw?.updatedAt instanceof Date ? raw.updatedAt : new Date(),
  };
}

export async function getCrmUiConfig(orgId: string): Promise<CrmUiConfig> {
  const snap = await getAdminFirestore().doc(docPath(orgId)).get();
  if (!snap.exists) return mergeWithDefaults(null);
  return mergeWithDefaults(mapTimestampsFromData(snap.data()!) as Partial<CrmUiConfig>);
}

export async function updateCrmUiConfig(
  orgId: string,
  input: Omit<CrmUiConfig, 'updatedAt'>,
): Promise<CrmUiConfig> {
  const next = mergeWithDefaults({ ...input, updatedAt: new Date() });
  await getAdminFirestore().doc(docPath(orgId)).set(
    {
      ...next,
      updatedAt: ts(),
    },
    { merge: true },
  );
  return next;
}

export async function getResolvedCrmNav(
  orgId: string,
  permissions?: import('@clcrm/types').PermissionMatrix | null,
) {
  const [config, org] = await Promise.all([getCrmUiConfig(orgId), getOrganization(orgId)]);
  const { resolveCrmNavItems } = await import('@clcrm/types');
  const enabledModules = (org as { enabledModules?: string[] } | null)?.enabledModules as
    | import('@clcrm/types').CrmPlatformModuleKey[]
    | undefined;
  return {
    config,
    navItems: resolveCrmNavItems(config, enabledModules, permissions),
    enabledModules: enabledModules ?? null,
  };
}
