'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@clcrm/ui';
import { SidebarLogo } from '@/components/sidebar-logo';
import { CRM_LOGO_SRC } from '@/lib/brand-assets';
import { CRM_NAV } from '@/lib/crm-marketing';
import { Menu, X } from 'lucide-react';

export function CrmMarketingHeader({ dark = true }: { dark?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-xl transition-colors',
        dark ? 'border-white/10 bg-[#0c1222]/90' : 'glass-nav border-border/60',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <SidebarLogo href="/for-installers" src={CRM_LOGO_SRC} imageClassName="h-11 w-auto max-w-[200px] sm:h-12 sm:max-w-[240px]" />

        <nav className="hidden items-center gap-1 lg:flex">
          {CRM_NAV.map((item) => {
            const { href, label } = item;
            const exact = 'exact' in item && item.exact;
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  dark
                    ? active ? 'text-amber-300' : 'text-white/70 hover:text-white'
                    : active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={cn(
              'hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors md:inline-flex',
              dark ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Lighting services
          </Link>
          <Link href="/sign-in" className={cn('btn-secondary hidden sm:inline-flex', dark && 'border-white/20 bg-white/5 text-white hover:bg-white/10')}>
            Log in
          </Link>
          <Link href="/sign-up" className="btn-primary hidden sm:inline-flex">
            Start free trial
          </Link>
          <button
            type="button"
            className={cn('btn-ghost p-2 lg:hidden', dark && 'text-white')}
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className={cn('border-t px-6 py-4 lg:hidden', dark ? 'border-white/10 bg-[#0c1222]' : 'border-border bg-surface')}>
          <nav className="flex flex-col gap-1">
            {CRM_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn('rounded-lg px-3 py-3 text-sm font-medium', dark ? 'text-white/80' : 'text-foreground')}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link href="/" className="mt-2 rounded-lg px-3 py-3 text-sm text-white/60" onClick={() => setOpen(false)}>
              ← Holiday lighting services
            </Link>
            <Link href="/sign-up" className="btn-primary mt-3 w-full" onClick={() => setOpen(false)}>
              Start free trial
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
