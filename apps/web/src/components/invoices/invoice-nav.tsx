'use client';

import { usePathname } from 'next/navigation';
import { SectionNav } from '@/components/ui/section-nav';
import { INVOICE_NAV } from '@/lib/invoice-utils';

export function InvoiceNav() {
  const pathname = usePathname();

  return (
    <SectionNav
      tabs={INVOICE_NAV}
      pathname={pathname}
      isActive={(tab, path) => {
        const isPipeline = tab.href === '/app/invoices' && path === '/app/invoices';
        const isDashboard = tab.href === '/app/invoices/dashboard' && path === '/app/invoices/dashboard';
        return (
          isPipeline ||
          isDashboard ||
          path === tab.href ||
          (tab.href === '/app/invoices' && path.startsWith('/app/invoices/') && !path.startsWith('/app/invoices/dashboard')) ||
          (tab.href !== '/app/invoices/dashboard' && tab.href !== '/app/invoices' && path.startsWith(tab.href))
        );
      }}
    />
  );
}
