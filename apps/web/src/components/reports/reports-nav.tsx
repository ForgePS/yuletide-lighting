'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { REPORTS_NAV } from '@/lib/report-utils';

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <SectionNav
      tabs={REPORTS_NAV}
      pathname={pathname}
      isActive={(tab, path) => {
        const isDashboard =
          tab.href === '/app/reports/dashboard' && (path === '/app/reports/dashboard' || path === '/app/reports');
        return isDashboard || path === tab.href || (tab.href !== '/app/reports/dashboard' && path.startsWith(tab.href));
      }}
    />
  );
}
