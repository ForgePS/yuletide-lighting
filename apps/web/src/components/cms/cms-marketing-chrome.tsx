'use client';

import Link from 'next/link';
import type { CmsSiteGlobals } from '@clcrm/types';
import { useAuth } from '@/lib/firebase-auth';
import { SidebarLogo } from '@/components/sidebar-logo';

export function CmsMarketingChrome({ globals }: { globals: CmsSiteGlobals }) {
  const { user } = useAuth();
  const { header } = globals;
  const bar = header.announcementBar;

  return (
    <>
      {bar?.enabled && bar.text ? (
        <div
          className="px-4 py-2 text-center text-sm font-medium"
          style={{
            background: bar.background ?? 'var(--primary)',
            color: bar.textColor ?? '#fff',
          }}
        >
          {bar.href ? (
            <Link href={bar.href} className="underline-offset-2 hover:underline">
              {bar.text}
            </Link>
          ) : (
            bar.text
          )}
        </div>
      ) : null}
      <header className={`${header.sticky ? 'sticky top-0 z-50' : ''} glass-nav`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {header.logoUrl ? (
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={header.logoUrl}
                alt={header.logoAlt || globals.branding.companyName}
                className="h-12 sm:h-14"
              />
            </Link>
          ) : (
            <SidebarLogo href="/" imageClassName="h-12 sm:h-14" />
          )}
          <nav className="flex items-center gap-2 sm:gap-3">
            {header.navItems
              .filter((item) => {
                if (item.showWhen === 'logged-in' && !user) return false;
                if (item.showWhen === 'logged-out' && user) return false;
                return true;
              })
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.openInNewTab ? '_blank' : undefined}
                  className={`btn-ghost px-3 py-2 ${item.visibility?.mobile === false ? 'hidden sm:inline-flex' : 'inline-flex'}`}
                >
                  {item.label}
                </Link>
              ))}
            {user ? (
              <Link href="/app" className="btn-primary">
                Open dashboard
              </Link>
            ) : (
              header.ctaButtons.map((btn) => (
                <Link
                  key={btn.href + btn.label}
                  href={btn.href}
                  className={
                    btn.style === 'primary'
                      ? 'btn-primary'
                      : btn.style === 'secondary'
                        ? 'btn-secondary'
                        : `btn-ghost hidden px-3 py-2 sm:inline-flex`
                  }
                >
                  {btn.label}
                </Link>
              ))
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
