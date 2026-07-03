'use client';

import Link from 'next/link';
import { MessageNav } from '@/components/messages';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:text-primary">← App</Link>
        <h1 className="page-title mt-2">Messages</h1>
        <p className="page-subtitle">Unified communications hub</p>
      </div>
      <MessageNav />
      <div>{children}</div>
    </div>
  );
}
