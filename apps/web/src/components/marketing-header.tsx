'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@clcrm/ui';
import { SidebarLogo } from '@/components/sidebar-logo';
import { COMPANY } from '@/lib/company';
import { Menu, Phone, X } from 'lucide-react';

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/#service-area', label: 'Service Area' },
  { href: '/contact', label: 'Contact' },
] as const;

export function MarketingHeader({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors',
        dark
          ? 'border-b border-white/10 bg-[#0c1222]/90 backdrop-blur-xl'
          : 'glass-nav',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <SidebarLogo href="/" imageClassName="h-14 w-auto max-w-[220px] sm:h-16 sm:max-w-[260px]" />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = href === '/#service-area' ? pathname === '/' : pathname === href;
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
          <a
            href={COMPANY.phoneHref}
            className={cn(
              'hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:inline-flex',
              dark ? 'text-white/80 hover:text-amber-300' : 'text-muted-foreground hover:text-primary',
            )}
          >
            <Phone className="h-4 w-4" />
            {COMPANY.phone}
          </a>
          <Link href="/contact" className="btn-primary hidden sm:inline-flex">
            Get free quote
          </Link>
          <button
            type="button"
            className={cn('btn-ghost p-2 md:hidden', dark && 'text-white')}
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className={cn('border-t px-6 py-4 md:hidden', dark ? 'border-white/10 bg-[#0c1222]' : 'border-border bg-surface')}>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn('rounded-lg px-3 py-3 text-sm font-medium', dark ? 'text-white/80' : 'text-foreground')}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <a href={COMPANY.phoneHref} className="mt-2 flex items-center gap-2 px-3 py-3 text-sm font-semibold text-primary">
              <Phone className="h-4 w-4" />
              Call {COMPANY.phone}
            </a>
            <Link href="/contact" className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>
              Get free quote
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
