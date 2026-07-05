'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@clcrm/ui';
import { useAuth } from '@/lib/firebase-auth';
import { trpc } from '@/lib/trpc';
import { FIELD_NAV } from '@/lib/field-utils';
import { CRM_LOGO_SRC } from '@/lib/brand-assets';
import { SidebarLogo } from '@/components/sidebar-logo';
import { Calendar, Clock, LogOut, MapPin, Megaphone, Monitor } from 'lucide-react';

const ICONS = {
  calendar: Calendar,
  megaphone: Megaphone,
  'map-pin': MapPin,
  clock: Clock,
} as const;

export function FieldShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: me } = trpc.settings360.me.useQuery(undefined, { staleTime: 60_000 });

  async function handleSignOut() {
    await signOut();
    router.push('/sign-in');
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur safe-top">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <SidebarLogo href="/app/field" src={CRM_LOGO_SRC} imageClassName="h-9" />
          <div className="flex items-center gap-2">
            {me?.canAccessOfficeCrm && (
              <Link href="/app" className="btn-secondary hidden text-xs sm:inline-flex">
                <Monitor className="h-3.5 w-3.5" />
                Office
              </Link>
            )}
            <button type="button" onClick={handleSignOut} className="btn-ghost p-2" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {user?.email && (
          <p className="mx-auto mt-1 max-w-lg truncate text-center text-xs text-muted-foreground">{user.email}</p>
        )}
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur safe-bottom">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          {FIELD_NAV.map((item) => {
            const { href, label, icon } = item;
            const exact = 'exact' in item && item.exact;
            const Icon = ICONS[icon];
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium sm:text-xs',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
