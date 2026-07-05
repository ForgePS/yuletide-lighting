'use client';

import Link from 'next/link';
import { MarketingNav } from '@/components/sign-tracker';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Marketing</h1>
        <p className="page-subtitle">Sign tracking, campaigns, and territory intelligence</p>
      </div>
      <MarketingNav />
      <div>{children}</div>
    </div>
  );
}
