'use client';

import Link from 'next/link';
import { SettingsNav } from '@/components/settings';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Settings & Administration</h1>
        <p className="page-subtitle">Master configuration center for Yuletide</p>
      </div>
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
