'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { SCHEDULE_NAV } from '@/lib/schedule-utils';

export function ScheduleNav() {
  const pathname = usePathname();

  return (
    <SectionNav
      tabs={SCHEDULE_NAV}
      pathname={pathname}
      isActive={(tab, path) =>
        path === tab.href || (tab.href !== '/app/schedule/dashboard' && path.startsWith(tab.href))
      }
    />
  );
}
