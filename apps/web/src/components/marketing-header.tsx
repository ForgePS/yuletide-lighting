'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { SidebarLogo } from '@/components/sidebar-logo';

export function MarketingHeader() {
  const { user } = useAuth();

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <SidebarLogo href="/" imageClassName="h-12 sm:h-14" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/pricing" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
            Pricing
          </Link>
          {user ? (
            <Link href="/app" className="btn-primary">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn-primary">
                Start free trial
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
