'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { INVENTORY_NAV } from '@/lib/inventory-utils';

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <SectionNav
      tabs={INVENTORY_NAV}
      pathname={pathname}
      isActive={(tab, path) => {
        if ('exact' in tab && tab.exact) return path === tab.href;
        return path === tab.href || path.startsWith(`${tab.href}/`);
      }}
    />
  );
}
