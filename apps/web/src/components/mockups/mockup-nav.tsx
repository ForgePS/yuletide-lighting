'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { MOCKUP_NAV } from '@/lib/mockup-utils';

export function MockupNav() {
  const pathname = usePathname();
  const isStudio = pathname.match(/\/app\/mockups\/[^/]+$/) && !MOCKUP_NAV.some((n) => n.href === pathname);
  const tabs = isStudio ? [...MOCKUP_NAV, { href: pathname, label: 'Studio' }] : MOCKUP_NAV;

  return (
    <SectionNav
      tabs={tabs}
      pathname={pathname}
      isActive={(tab, path) => path === tab.href || path.startsWith(`${tab.href}/`)}
    />
  );
}
