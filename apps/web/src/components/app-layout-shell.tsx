'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/app/field')) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
