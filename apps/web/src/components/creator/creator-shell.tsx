'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@clcrm/ui';
import { useAuth } from '@/lib/firebase-auth';
import { trpc } from '@/lib/trpc';
import { SidebarLogo } from '@/components/sidebar-logo';
import type { CreatorConsoleTab } from './creator-console';

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; tab: CreatorConsoleTab }> = [
  { href: '/creator', label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
  { href: '/creator/website', label: 'Website', icon: Globe, tab: 'website' },
  { href: '/creator/settings', label: 'Platform', icon: Settings, tab: 'platform' },
  { href: '/creator/subscriptions', label: 'Subscriptions', icon: CreditCard, tab: 'subscriptions' },
  { href: '/creator/modules', label: 'Modules', icon: Layers, tab: 'modules' },
  { href: '/creator/organizations', label: 'Organizations', icon: Building2, tab: 'organizations' },
  { href: '/creator/users', label: 'Users', icon: Users, tab: 'users' },
  { href: '/creator/operations', label: 'Operations', icon: Rocket, tab: 'operations' },
  { href: '/creator/ecosystem', label: 'Ecosystem', icon: ShieldCheck, tab: 'ecosystem' },
];

export function tabFromPath(pathname: string): CreatorConsoleTab {
  if (pathname.startsWith('/creator/website')) return 'website';
  const match = NAV.find((item) => item.href !== '/creator' && pathname.startsWith(item.href));
  if (match) return match.tab as CreatorConsoleTab;
  if (pathname === '/creator' || pathname === '/creator/') return 'overview';
  if (pathname.startsWith('/creator/billing') || pathname.startsWith('/creator/audit')) return 'operations';
  return 'overview';
}

function CreatorNav({
  pathname,
  onNavigate,
  items = NAV,
}: {
  pathname: string;
  onNavigate?: () => void;
  items?: typeof NAV;
}) {
  return (
    <div className="space-y-0.5">
      {items.map(({ href, label, icon: Icon, tab }) => {
        const active = href === '/creator' ? pathname === '/creator' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'sidebar-nav-item',
              active ? 'sidebar-nav-item-active' : 'sidebar-nav-item-idle',
            )}
          >
            <Icon className="h-[1.375rem] w-[1.375rem] shrink-0" />
            <span className="truncate">{label}</span>
            {tab === 'website' ? (
              <span className="badge-success ml-auto text-[10px] uppercase">CMS</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function CreatorGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading, idToken } = useAuth();
  const { data, isLoading, isError } = trpc.creator360.checkAccess.useQuery(undefined, {
    enabled: !authLoading && !!idToken,
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in');
  }, [authLoading, user, router]);

  if (authLoading || isLoading) {
    return (
      <div className="layout-wrapper flex min-h-screen items-center justify-center app-canvas">
        <p className="text-sm text-muted-foreground">Verifying creator access…</p>
      </div>
    );
  }

  if (!user || isError || !data?.allowed) {
    return (
      <div className="layout-wrapper flex min-h-screen flex-col items-center justify-center gap-4 app-canvas p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Creator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The Creator Console is restricted to platform operator accounts listed in PLATFORM_CREATOR_EMAILS.
          </p>
          <Link href="/app" className="btn-primary mt-6 inline-flex">
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function CreatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: settings } = trpc.creator360.settings.get.useQuery();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const productName = settings?.productName ?? 'Creator Console';

  const sidebar = (
    <>
      <div className="app-brand flex min-h-[4.25rem] flex-col justify-center gap-0.5 border-b border-sidebar-border px-5 py-3">
        <SidebarLogo
          href="/creator"
          onClick={() => setMobileOpen(false)}
          imageClassName="h-10 w-auto max-w-[180px] object-contain object-left"
        />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">Creator Console</p>
        <p className="text-[10px] text-muted-foreground">{settings?.productLabel ?? 'Platform Admin'}</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        <p className="menu-inner-shadow mb-1 px-6 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
          Content
        </p>
        <CreatorNav
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          items={NAV.filter((i) => i.tab === 'overview' || i.tab === 'website')}
        />
        <p className="menu-inner-shadow mb-1 mt-4 px-6 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
          Platform
        </p>
        <CreatorNav
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          items={NAV.filter((i) => i.tab !== 'overview' && i.tab !== 'website')}
        />
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-4">
        <Link
          href="/app"
          className="btn-secondary block w-full px-3 py-2 text-center text-xs"
          onClick={() => setMobileOpen(false)}
        >
          ← Back to tenant app
        </Link>
        <div className="rounded-[var(--radius)] bg-muted/70 p-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex items-center gap-2 text-xs font-medium text-sidebar-muted transition-colors hover:text-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="layout-wrapper flex min-h-screen app-canvas">
      <aside className="layout-menu menu-vertical sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar shadow-sneat lg:flex">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#22303e]/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="layout-menu relative flex h-full max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-sneat-lg">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="layout-page flex min-w-0 flex-1 flex-col">
        <header className="app-topbar flex items-center gap-3 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn-ghost rounded-[var(--radius)] p-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">{productName}</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="btn-ghost ml-auto rounded-[var(--radius)] p-2 lg:hidden"
            aria-label="Close"
          >
            <X className="h-5 w-5 opacity-0" />
          </button>
        </header>

        <nav className="app-topbar layout-navbar sticky top-0 z-20 hidden items-center justify-between gap-3 px-6 lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
            <p className="text-sm font-medium text-foreground">{productName}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="avatar">{(user?.email?.[0] ?? 'C').toUpperCase()}</span>
            <span className="max-w-[200px] truncate">{user?.email}</span>
          </div>
        </nav>

        <main className="flex-1 overflow-auto app-canvas">
          <div className="content-wrapper container-p-y mx-auto w-full max-w-[1400px] p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
