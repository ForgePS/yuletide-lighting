'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { SETTINGS_NAV } from '@/lib/settings-utils';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';

export function SettingsNav() {
  const pathname = usePathname();
  const { idToken, loading } = useAuth();
  const { data: billing, isLoading: billingLoading } = trpc.billing.status.useQuery(undefined, {
    enabled: !loading && !!idToken,
    staleTime: 30_000,
  });

  const billingKnown = !billingLoading || billing !== undefined;
  const tabs = billingKnown && billing?.isLocked
    ? SETTINGS_NAV.filter((tab) => tab.href === '/app/settings/subscription')
    : SETTINGS_NAV;

  return (
    <SectionNav
      tabs={tabs}
      pathname={pathname}
      isActive={(tab, path) => {
        const isOverview = tab.href === '/app/settings' && path === '/app/settings';
        return isOverview || (tab.href !== '/app/settings' && path.startsWith(tab.href));
      }}
    />
  );
}
