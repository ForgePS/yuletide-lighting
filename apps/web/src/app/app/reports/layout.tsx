'use client';

import Link from 'next/link';
import { ReportsNav } from '@/components/reports';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Reports & Analytics</h1>
        <p className="page-subtitle">Executive command center for Yuletide</p>
      </div>
      <ReportsNav />
      <div>{children}</div>
    </div>
  );
}
