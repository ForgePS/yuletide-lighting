'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
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
import { CRM_LOGO_SRC } from '@/lib/brand-assets';
import type { CreatorConsoleTab } from './creator-console';

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; tab: CreatorConsoleTab }> = [
  { href: '/creator', label: 'Overview', icon: LayoutDashboard, tab: 'overview' },
  { href: '/creator/settings', label: 'Platform', icon: Settings, tab: 'platform' },
  { href: '/creator/subscriptions', label: 'Subscriptions', icon: CreditCard, tab: 'subscriptions' },
  { href: '/creator/modules', label: 'Modules', icon: Layers, tab: 'modules' },
  { href: '/creator/organizations', label: 'Organizations', icon: Building2, tab: 'organizations' },
  { href: '/creator/users', label: 'Users', icon: Users, tab: 'users' },
  { href: '/creator/operations', label: 'Operations', icon: Rocket, tab: 'operations' },
  { href: '/creator/ecosystem', label: 'Ecosystem', icon: ShieldCheck, tab: 'ecosystem' },
];

export function tabFromPath(pathname: string): CreatorConsoleTab {
  const match = NAV.find((item) => item.href !== '/creator' && pathname.startsWith(item.href));
  if (match) return match.tab;
  if (pathname === '/creator' || pathname === '/creator/') return 'overview';
  if (pathname.startsWith('/creator/billing') || pathname.startsWith('/creator/audit')) return 'operations';
  return 'overview';
}

function CreatorNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/creator' ? pathname === '/creator' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-muted-foreground">Verifying creator access…</p>
      </div>
    );
  }

  if (!user || isError || !data?.allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6">
        <h1 className="text-xl font-bold text-slate-900">Creator access required</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          The Creator Console is for platform operators only. Ask an existing operator to add your email under
          Platform → Platform operators, or set PLATFORM_CREATOR_EMAILS in deploy environment variables.
        </p>
        <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
        <Link href="/app" className="btn-primary">Back to app</Link>
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

  const sidebar = (
    <>
      <div className="border-b border-white/10 p-4">
        <div className="flex flex-col gap-1">
          <SidebarLogo
            href="/creator"
            src={CRM_LOGO_SRC}
            onClick={() => setMobileOpen(false)}
            imageClassName="h-9 w-full max-w-[160px]"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Creator Console</p>
          <p className="text-[10px] text-slate-500">{settings?.productLabel ?? 'Platform Admin'}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <CreatorNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </nav>
      <div className="space-y-2 border-t border-white/10 p-4">
        <Link href="/app" className="block rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white">
          ← Back to tenant app
        </Link>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-white">{user?.email}</p>
          <button onClick={handleSignOut} className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 lg:flex">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <aside className="relative flex h-full w-72 flex-col bg-slate-950 shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-900">{settings?.productName ?? 'Creator Console'}</span>
          <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-2 lg:hidden" aria-label="Close">
            <X className="h-5 w-5 opacity-0" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
