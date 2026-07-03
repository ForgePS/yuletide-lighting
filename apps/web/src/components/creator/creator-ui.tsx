'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@clcrm/ui';

export function CreatorPanel({
  title,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CreatorStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function CreatorTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon: LucideIcon }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
            active === tab.id
              ? 'bg-primary text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900',
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function statusBadgeClass(status: string, locked?: boolean) {
  if (locked) return 'bg-red-100 text-red-800';
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-amber-100 text-amber-800',
    canceled: 'bg-slate-100 text-slate-700',
    locked: 'bg-red-100 text-red-800',
    none: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function healthStatusClass(status: 'pass' | 'warn' | 'fail') {
  if (status === 'pass') return 'border-emerald-500/30 bg-emerald-50 text-emerald-900';
  if (status === 'warn') return 'border-amber-500/30 bg-amber-50 text-amber-900';
  return 'border-red-500/30 bg-red-50 text-red-800';
}
