'use client';

import Link from 'next/link';
import { ScheduleNav } from '@/components/schedule';

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Schedule</h1>
        <p className="page-subtitle">Dispatch, crews & calendar management</p>
      </div>
      <ScheduleNav />
      <div>{children}</div>
    </div>
  );
}
