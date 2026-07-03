'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { MESSAGE_NAV } from '@/lib/message-utils';

export function MessageNav() {
  const pathname = usePathname();

  return (
    <SectionNav
      tabs={MESSAGE_NAV}
      pathname={pathname}
      isActive={(tab, path) =>
        path === tab.href || (tab.href !== '/app/messages/dashboard' && path.startsWith(tab.href))
      }
    />
  );
}
