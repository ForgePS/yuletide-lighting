'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@clcrm/ui';
import { useAuth } from '@/lib/firebase-auth';
import { trpc } from '@/lib/trpc';
import {
  groupNavItemsBySection,
  type CrmNavSection,
  DEFAULT_CRM_NAV_ITEMS,
} from '@clcrm/types';
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
  Globe,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { SidebarLogo } from '@/components/sidebar-logo';
import { AnalyticsYearBadge, AnalyticsYearFilter } from '@/lib/analytics-year-context';
import { ErrorState } from '@/components/ui/states';

const ICON_BY_HREF: Record<string, LucideIcon> = {
  '/app': LayoutDashboard,
  '/app/pipeline': GitBranch,
  '/app/customers': Users,
  '/app/properties': MapPin,
  '/app/contacts': Contact,
  '/app/agreements': FileText,
  '/app/proposals': FileText,
  '/app/invoices': Receipt,
  '/app/inventory': Package,
  '/app/project-prep': ClipboardList,
  '/app/jobs': Kanban,
  '/app/crew': HardHat,
  '/app/service-issues': Wrench,
  '/app/messages': MessageSquare,
  '/app/automation': Zap,
  '/app/reviews': Star,
  '/app/schedule': Calendar,
  '/app/time-clock': Timer,
  '/app/routes': MapPin,
  '/app/mockups': Image,
  '/app/rebooking': GitBranch,
  '/app/storage': Warehouse,
  '/app/commercial': Building2,
  '/app/reports': BarChart3,
  '/app/settings': Settings,
};

const YEAR_FILTER_PATHS = ['/app', '/app/reports', '/app/invoices', '/app/proposals', '/app/customers'];

function showYearFilter(pathname: string) {
  return YEAR_FILTER_PATHS.some((p) => pathname === p || (p !== '/app' && pathname.startsWith(`${p}/`)));
}

type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  section: CrmNavSection;
};

function navCollapseStorageKey(uid: string) {
  return `clcrm-nav-collapse:${uid}`;
}

function NavItemLink({
  item,
  pathname,
  onNavigate,
}: {
  item: ShellNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
        active
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-accent')} />
      {item.label}
    </Link>
  );
}

function SectionedNav({
  pathname,
  items,
  userId,
  onNavigate,
}: {
  pathname: string;
  items: ShellNavItem[];
  userId?: string | null;
  onNavigate?: () => void;
}) {
  const groups = useMemo(() => {
    const asConfig = items.map((item, index) => ({
      key: (DEFAULT_CRM_NAV_ITEMS.find((d) => d.href === item.href)?.key ?? `item_${index}`) as never,
      label: item.label,
      href: item.href,
      enabled: true,
      order: index,
      section: item.section,
    }));
    return groupNavItemsBySection(asConfig);
  }, [items]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(navCollapseStorageKey(userId));
      if (raw) setCollapsed(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [userId]);

  function toggleSection(section: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      if (userId && typeof window !== 'undefined') {
        window.localStorage.setItem(navCollapseStorageKey(userId), JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.section] === true;
        const sectionActive = group.items.some((i) =>
          i.href === '/app' ? pathname === '/app' : pathname === i.href || pathname.startsWith(`${i.href}/`),
        );
        return (
          <div key={group.section}>
            {group.section === 'home' ? (
              <div className="space-y-0.5">
                {group.items.map((cfg) => {
                  const item = items.find((i) => i.href === cfg.href)!;
                  return (
                    <NavItemLink key={cfg.href} item={item} pathname={pathname} onNavigate={onNavigate} />
                  );
                })}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide',
                    sectionActive ? 'text-white' : 'text-sidebar-muted hover:text-sidebar-foreground',
                  )}
                  aria-expanded={!isCollapsed}
                >
                  {group.label}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90')}
                  />
                </button>
                {!isCollapsed && (
                  <div className="mt-0.5 space-y-0.5">
                    {group.items.map((cfg) => {
                      const item = items.find((i) => i.href === cfg.href)!;
                      return (
                        <NavItemLink
                          key={cfg.href}
                          item={item}
                          pathname={pathname}
                          onNavigate={onNavigate}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    data: billing,
    isLoading: billingLoading,
    isError: billingError,
    error: billingErr,
    refetch: refetchBilling,
  } = trpc.billing.status.useQuery(undefined, {
    enabled: !authLoading && !!user,
    staleTime: 30_000,
    retry: false,
  });
  const [deferSecondaryQueries, setDeferSecondaryQueries] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDeferSecondaryQueries(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const { data: creatorAccess } = trpc.creator360.checkAccess.useQuery(undefined, {
    enabled: deferSecondaryQueries && !authLoading && !!user,
    staleTime: 60_000,
    retry: false,
  });
  const { data: resolvedNav } = trpc.crmUiConfig.resolvedNav.useQuery(undefined, {
    enabled: deferSecondaryQueries && !authLoading && !!user,
    staleTime: 60_000,
  });
  const { data: branding } = trpc.settings360.branding.useQuery(undefined, {
    enabled: deferSecondaryQueries && !authLoading && !!user,
    staleTime: 60_000,
  });
  const { data: onboarding } = trpc.onboarding360.state.useQuery(undefined, {
    enabled: deferSecondaryQueries && !authLoading && !!user,
    staleTime: 60_000,
    retry: false,
  });
  const showOnboardingBanner =
    Boolean(onboarding) && !onboarding?.completed && !pathname.startsWith('/onboarding');

  const locked = billing?.isLocked ?? false;
  const onSubscriptionPage = pathname.startsWith('/app/settings/subscription');
  const subscriptionRedirectPending = !billingLoading && !billingError && locked && !onSubscriptionPage;

  useEffect(() => {
    if (!subscriptionRedirectPending) return;
    router.replace('/app/settings/subscription');
  }, [subscriptionRedirectPending, router]);

  const configNav = useMemo<ShellNavItem[]>(() => {
    const source = resolvedNav?.navItems?.length
      ? resolvedNav.navItems
      : DEFAULT_CRM_NAV_ITEMS.filter((i) => i.enabled);
    return source.map((item) => ({
      href: item.href,
      label: item.label,
      icon: ICON_BY_HREF[item.href] ?? LayoutDashboard,
      exact: item.href === '/app',
      section: item.section ?? 'administration',
    }));
  }, [resolvedNav]);

  const visibleNav = subscriptionRedirectPending
    ? [
        {
          href: '/app/settings/subscription',
          label: 'Subscription',
          icon: CreditCard,
          exact: true,
          section: 'administration' as CrmNavSection,
        },
      ]
    : configNav;

  const theme = resolvedNav?.config.theme;
  const sidebarStyle =
    theme?.useOrgBrandingInApp && (theme.sidebarBackground || branding?.primaryColor)
      ? {
          background: theme.sidebarBackground || branding?.primaryColor || undefined,
          color: theme.sidebarText || undefined,
          ['--accent' as string]: theme.accentColor || branding?.accentColor || undefined,
        }
      : theme?.sidebarBackground
        ? {
            background: theme.sidebarBackground,
            color: theme.sidebarText || undefined,
            ['--accent' as string]: theme.accentColor || undefined,
          }
        : undefined;

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const yearFilterVisible = showYearFilter(pathname);

  const sidebar = (
    <>
      <div className="border-b border-white/10 p-4">
        <SidebarLogo
          href="/app"
          onClick={() => setMobileOpen(false)}
          imageClassName="h-11 w-full max-w-[200px] object-contain object-left"
        />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <SectionedNav
          pathname={pathname}
          items={visibleNav}
          userId={user?.uid}
          onNavigate={() => setMobileOpen(false)}
        />
      </nav>
      <div className="border-t border-white/10 p-4">
        {creatorAccess?.allowed && (
          <>
            <Link
              href="/creator/website"
              onClick={() => setMobileOpen(false)}
              className="mb-2 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/30"
            >
              <Globe className="h-3.5 w-3.5" />
              Website CMS
            </Link>
            <Link
              href="/creator"
              onClick={() => setMobileOpen(false)}
              className="mb-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15"
            >
              Creator Console
            </Link>
          </>
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
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex" style={sidebarStyle}>
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside
            className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar shadow-2xl"
            style={sidebarStyle}
          >
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
          {showOnboardingBanner ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:px-6 lg:px-8">
              Finish setting up your workspace —{' '}
              <Link href="/onboarding" className="font-semibold underline underline-offset-2">
                continue onboarding
              </Link>
            </div>
          ) : null}
          {yearFilterVisible && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Viewing</span>
                <AnalyticsYearBadge />
              </div>
              <AnalyticsYearFilter />
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8">
            {billingError ? (
              <ErrorState
                title="Could not verify subscription"
                message={billingErr?.message ?? 'Billing status failed to load.'}
                onRetry={() => void refetchBilling()}
              />
            ) : subscriptionRedirectPending ? (
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
