'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@clcrm/ui';
import { useAuth } from '@/lib/firebase-auth';
import { trpc } from '@/lib/trpc';
import {
  LayoutDashboard,
  Users,
  Contact,
  FileText,
  Receipt,
  Package,
  MessageSquare,
  Calendar,
  MapPin,
  BarChart3,
  Settings,
  Kanban,
  Image,
  GitBranch,
  Warehouse,
  Building2,
  HardHat,
  LogOut,
  Menu,
  X,
  CreditCard,
  Timer,
  ClipboardList,
  Wrench,
  Star,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { SidebarLogo } from '@/components/sidebar-logo';
import { AnalyticsYearBadge, AnalyticsYearFilter } from '@/lib/analytics-year-context';

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/app/customers', label: 'Customers', icon: Users },
  { href: '/app/properties', label: 'Properties', icon: MapPin },
  { href: '/app/contacts', label: 'Contacts', icon: Contact },
  { href: '/app/agreements', label: 'Agreements', icon: FileText },
  { href: '/app/proposals', label: 'Proposals', icon: FileText },
  { href: '/app/invoices', label: 'Invoices', icon: Receipt },
  { href: '/app/inventory', label: 'Inventory', icon: Package },
  { href: '/app/project-prep', label: 'Project Prep', icon: ClipboardList },
  { href: '/app/jobs', label: 'Jobs', icon: Kanban },
  { href: '/app/crew', label: 'Crew', icon: HardHat },
  { href: '/app/service-issues', label: 'Service Issues', icon: Wrench },
  { href: '/app/messages', label: 'Messages', icon: MessageSquare },
  { href: '/app/automation', label: 'Automation', icon: Zap },
  { href: '/app/reviews', label: 'Reviews', icon: Star },
  { href: '/app/schedule', label: 'Schedule', icon: Calendar },
  { href: '/app/time-clock', label: 'Time Clock', icon: Timer },
  { href: '/app/routes', label: 'Routes', icon: MapPin },
  { href: '/app/mockups', label: 'Mockups', icon: Image },
  { href: '/app/rebooking', label: 'Rebooking', icon: GitBranch },
  { href: '/app/storage', label: 'Storage', icon: Warehouse },
  { href: '/app/commercial', label: 'Commercial', icon: Building2 },
  { href: '/app/reports', label: 'Reports', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function NavLinks({
  pathname,
  items,
  onNavigate,
}: {
  pathname: string;
  items: typeof navItems;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active && 'text-accent')} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, idToken, loading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: billing, isLoading: billingLoading } = trpc.billing.status.useQuery(undefined, {
    enabled: !authLoading && !!idToken,
    staleTime: 30_000,
  });
  const { data: creatorAccess } = trpc.creator360.checkAccess.useQuery(undefined, {
    enabled: !authLoading && !!idToken,
    staleTime: 60_000,
    retry: false,
  });

  const locked = billing?.isLocked ?? false;
  const onSubscriptionPage = pathname.startsWith('/app/settings/subscription');
  const billingKnown = !billingLoading || billing !== undefined;

  useEffect(() => {
    if (!billingKnown || !locked || onSubscriptionPage) return;
    router.replace('/app/settings/subscription');
  }, [billingKnown, locked, onSubscriptionPage, router]);

  const visibleNav = billingKnown && locked
    ? [{ href: '/app/settings/subscription', label: 'Subscription', icon: CreditCard, exact: true }]
    : navItems;

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const sidebar = (
    <>
      <div className="border-b border-white/10 p-4">
        <SidebarLogo
          href="/app"
          onClick={() => setMobileOpen(false)}
          imageClassName="h-11 w-full max-w-[200px] object-contain object-left"
        />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <NavLinks pathname={pathname} items={visibleNav} onNavigate={() => setMobileOpen(false)} />
      </nav>
      <div className="border-t border-white/10 p-4">
        {creatorAccess?.allowed && (
          <Link
            href="/creator"
            onClick={() => setMobileOpen(false)}
            className="mb-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15"
          >
            Creator Console
          </Link>
        )}
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 flex items-center gap-2 text-xs font-medium text-sidebar-muted transition-colors hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-2 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost rounded-lg p-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <SidebarLogo href="/app" imageClassName="h-9" />
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto btn-ghost rounded-lg p-2">
              <X className="h-5 w-5" />
            </button>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Viewing</span>
              <AnalyticsYearBadge />
            </div>
            <AnalyticsYearFilter />
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
          {billingKnown && locked && !onSubscriptionPage ? (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
              Redirecting to subscription...
            </div>
          ) : (
            children
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
