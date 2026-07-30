'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { PortalFeatureKey, PortalNotification } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { LoadingState, ErrorState } from '@/components/ui/states';

type NavItem = {
  feature?: PortalFeatureKey;
  key: string;
  label: string;
  href: (token: string) => string;
  primary?: boolean;
  badge?: 'notifications' | 'messages';
};

/** Spec primary: Home, Schedule, Service, Messages + More */
const NAV: NavItem[] = [
  { key: 'home', label: 'Home', primary: true, href: (t) => `/portal/${t}` },
  { feature: 'scheduling', key: 'schedule', label: 'Schedule', primary: true, href: (t) => `/portal/${t}/schedule` },
  { feature: 'service_requests', key: 'service', label: 'Service', primary: true, href: (t) => `/portal/${t}/service-request` },
  { feature: 'messaging', key: 'messages', label: 'Messages', primary: true, badge: 'messages', href: (t) => `/portal/${t}/messages` },
  { key: 'notifications', label: 'Alerts', badge: 'notifications', href: (t) => `/portal/${t}/notifications` },
  { key: 'contacts', label: 'Account', href: (t) => `/portal/${t}/contacts` },
  { feature: 'e_sign', key: 'sign', label: 'Sign', href: (t) => `/portal/${t}/sign` },
  { feature: 'billing', key: 'billing', label: 'Billing', href: (t) => `/portal/${t}/billing` },
  { feature: 'proposals', key: 'proposals', label: 'Proposals', href: (t) => `/portal/${t}/proposals` },
  { feature: 'agreements', key: 'agreements', label: 'Agreements', href: (t) => `/portal/${t}/agreements` },
  { feature: 'properties', key: 'properties', label: 'Properties', href: (t) => `/portal/${t}/properties` },
  { feature: 'mockups', key: 'mockups', label: 'Designs', href: (t) => `/portal/${t}/mockups` },
  { feature: 'documents', key: 'documents', label: 'Documents', href: (t) => `/portal/${t}/documents` },
  { feature: 'install_tracking', key: 'jobs', label: 'Installation', href: (t) => `/portal/${t}/jobs` },
  { feature: 'takedowns', key: 'takedowns', label: 'Takedown', href: (t) => `/portal/${t}/takedowns` },
  { feature: 'storage', key: 'storage', label: 'Storage', href: (t) => `/portal/${t}/storage` },
  { feature: 'consultations', key: 'consultations', label: 'Consultations', href: (t) => `/portal/${t}/consultations` },
  { feature: 'reviews', key: 'reviews', label: 'Reviews', href: (t) => `/portal/${t}/reviews` },
  { feature: 'rebooking', key: 'rebook', label: 'Rebook', href: (t) => `/portal/${t}/rebook` },
];

function isActive(pathname: string, href: string, key: string) {
  if (key === 'home') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalShell({
  token,
  companyName,
  brandColor,
  enabledFeatures,
  notifications = [],
  children,
}: {
  token: string;
  companyName: string;
  brandColor?: string | null;
  enabledFeatures: PortalFeatureKey[];
  notifications?: PortalNotification[];
  children: React.ReactNode;
}) {
  const color = brandColor || '#B91C1C';
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = notifications.filter((n) => !n.readAt).length;

  const items = NAV.filter((item) => {
    if (!item.feature) return true;
    if (item.key === 'schedule') {
      return enabledFeatures.includes('scheduling') || enabledFeatures.includes('consultations');
    }
    return enabledFeatures.includes(item.feature);
  });

  const primaryKeys = ['home', 'schedule', 'service', 'messages'];
  const primary = primaryKeys
    .map((k) => items.find((i) => i.key === k))
    .filter(Boolean) as NavItem[];
  // Fill slots if a feature is missing so we still have 4 primaries when possible
  for (const item of items) {
    if (primary.length >= 4) break;
    if (!primary.some((p) => p.key === item.key) && item.key !== 'notifications') {
      primary.push(item);
    }
  }
  const moreItems = items.filter((i) => !primary.some((p) => p.key === i.key));

  function badgeFor(item: NavItem) {
    if (item.badge === 'notifications' && unread > 0) return unread;
    return null;
  }

  const NavLink = ({ item, compact }: { item: NavItem; compact?: boolean }) => {
    const href = item.href(token);
    const active = isActive(pathname, href, item.key);
    const badge = badgeFor(item);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={
          compact
            ? `relative flex min-h-11 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold ${
                active ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
              }`
            : `relative flex min-h-11 items-center rounded-xl px-3 text-base font-medium ${
                active ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50'
              }`
        }
        onClick={() => setMoreOpen(false)}
      >
        {item.label}
        {badge != null && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-red-50/40 text-base text-stone-800 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="md:mx-auto md:flex md:max-w-6xl md:gap-5 md:px-4 md:py-5 xl:max-w-7xl xl:gap-6">
        {/* Tablet + desktop side nav (portrait & landscape) */}
        <aside className="sticky top-4 hidden w-52 shrink-0 self-start md:block lg:w-56">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-sm lg:p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Customer portal</p>
            <h1 className="mt-1 text-base font-bold lg:text-lg" style={{ color }}>{companyName}</h1>
            <nav className="mt-3 space-y-0.5" aria-label="Portal">
              {items.map((item) => (
                <NavLink key={item.key} item={item} />
              ))}
            </nav>
            <Link href="/portal/login" className="mt-3 block min-h-11 px-3 py-2 text-sm text-stone-500 hover:underline">
              Switch account
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/95 backdrop-blur md:static md:border-0 md:bg-transparent md:backdrop-blur-none">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:py-4 md:max-w-none md:px-0 md:pt-0">
              <div className="min-w-0 md:hidden">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Customer portal</p>
                <h1 className="truncate text-lg font-bold sm:text-xl" style={{ color }}>{companyName}</h1>
              </div>
              <div className="hidden min-w-0 md:block">
                <h1 className="text-xl font-bold text-stone-900 lg:text-2xl">Your account</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                {unread > 0 && (
                  <Link
                    href={`/portal/${token}/notifications`}
                    className="inline-flex min-h-11 items-center rounded-full bg-red-100 px-3 text-xs font-semibold text-red-800"
                  >
                    {unread} new
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:space-y-5 sm:py-6 md:max-w-none md:px-0 md:pt-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-4xl grid-cols-5 gap-1 px-1 py-1">
          {primary.map((item) => (
            <NavLink key={item.key} item={item} compact />
          ))}
          <button
            type="button"
            className="flex min-h-11 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold text-stone-600"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More portal pages">
          <button type="button" className="absolute inset-0 bg-stone-900/40" aria-label="Close" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200" />
            <p className="mb-3 text-base font-semibold text-stone-900">More</p>
            <ul className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href(token)}
                    className="relative flex min-h-12 items-center rounded-xl border border-stone-200 px-3 text-base font-medium text-stone-800"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                    {badgeFor(item) != null && (
                      <span className="ml-auto rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                        {badgeFor(item)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/portal/login"
                  className="flex min-h-12 items-center rounded-xl border border-stone-200 px-3 text-base font-medium text-stone-800"
                  onClick={() => setMoreOpen(false)}
                >
                  Switch account
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function PortalFeatureFallback({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-base text-stone-600">{message}</p>
    </div>
  );
}

export function PortalAuthedFrame({
  token,
  title,
  feature,
  children,
  stickyPad,
}: {
  token: string;
  title: string;
  feature?: PortalFeatureKey;
  stickyPad?: boolean;
  children: (ctx: { token: string; enabledFeatures: PortalFeatureKey[] }) => React.ReactNode;
}) {
  const { data, isLoading, isError } = trpc.portal360.public.dashboard.useQuery({ token });

  if (isLoading) return <LoadingState message="Loading..." />;
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <ErrorState message="Portal access not found or disabled." />
      </div>
    );
  }

  const accessToken = data.accessToken || token;
  const features = data.enabledFeatures ?? [];

  if (feature && !features.includes(feature)) {
    return (
      <PortalShell
        token={accessToken}
        companyName={data.organization?.companyName ?? 'Customer Portal'}
        brandColor={data.settings.portalPrimaryColor ?? data.organization?.brandColor}
        enabledFeatures={features}
        notifications={data.notifications ?? []}
      >
        <Link href={`/portal/${accessToken}`} className="inline-flex min-h-11 items-center text-base text-primary hover:underline">
          ← Back to home
        </Link>
        <PortalFeatureFallback
          title={`${title} unavailable`}
          message="This feature is not enabled for your portal. Contact your lighting company if you need access."
        />
      </PortalShell>
    );
  }

  return (
    <PortalShell
      token={accessToken}
      companyName={data.organization?.companyName ?? 'Customer Portal'}
      brandColor={data.settings.portalPrimaryColor ?? data.organization?.brandColor}
      enabledFeatures={features}
      notifications={data.notifications ?? []}
    >
      <div className={stickyPad ? 'pb-28 md:pb-0' : undefined}>
        <div>
          <Link href={`/portal/${accessToken}`} className="inline-flex min-h-11 items-center text-base text-primary hover:underline">
            ← Back to home
          </Link>
          <h2 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">{title}</h2>
        </div>
        <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
          {children({ token: accessToken, enabledFeatures: features })}
        </div>
      </div>
    </PortalShell>
  );
}
