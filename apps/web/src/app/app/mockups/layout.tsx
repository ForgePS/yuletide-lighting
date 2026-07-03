'use client';

import Link from 'next/link';
import { Camera } from 'lucide-react';
import { MockupNav } from '@/components/mockups';

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Design Studio</h1>
        <p className="page-subtitle">Capture on site, design anywhere — optimized for phone and tablet</p>
      </div>
      <MockupNav />
      <div>{children}</div>

      <Link
        href="/app/mockups/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 lg:hidden safe-bottom"
        aria-label="New design with camera"
      >
        <Camera className="h-6 w-6" />
      </Link>
    </div>
  );
}
