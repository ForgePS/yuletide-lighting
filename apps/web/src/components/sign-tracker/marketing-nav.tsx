'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { MARKETING_NAV } from '@/lib/sign-tracker-utils';

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <SectionNav
      tabs={MARKETING_NAV}
      pathname={pathname}
      isActive={(tab, path) => path === tab.href || path.startsWith(`${tab.href}/`)}
    />
  );
}
