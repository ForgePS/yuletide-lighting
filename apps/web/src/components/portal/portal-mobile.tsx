'use client';

import Link from 'next/link';

/** Full-width sticky primary actions for phone workflows (above bottom nav). */
export function PortalStickyBar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:static md:mt-6 md:rounded-2xl md:border md:bg-white md:px-5 md:py-4 ${className}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}

export function PortalSection({
  title,
  eyebrow,
  children,
  action,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      {(title || eyebrow || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{eyebrow}</p>
            )}
            {title && <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PortalStatusPill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info';
}) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-50 text-emerald-800',
    warn: 'bg-amber-50 text-amber-900',
    danger: 'bg-red-50 text-red-800',
    info: 'bg-sky-50 text-sky-900',
  };
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold capitalize ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PortalPrimaryButton({
  href,
  children,
  onClick,
  disabled,
  type = 'button',
  variant = 'primary',
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const cls =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : 'btn-ghost';
  const shared = `${cls} inline-flex min-h-11 w-full items-center justify-center px-4 text-base font-semibold sm:w-auto`;
  if (href) {
    return (
      <Link href={href} className={shared} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={shared} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export type PortalNextAction = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: 'danger' | 'warn' | 'info' | 'success';
};

export function PortalNextActionCard({ action, brandColor }: { action: PortalNextAction; brandColor?: string }) {
  const border =
    action.tone === 'danger'
      ? 'border-red-200 bg-red-50/60'
      : action.tone === 'warn'
        ? 'border-amber-200 bg-amber-50/50'
        : action.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-stone-200 bg-white';
  return (
    <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${border}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{action.eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">{action.title}</h2>
      <p className="mt-2 text-base text-stone-600">{action.body}</p>
      <Link
        href={action.href}
        className="btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center text-base font-semibold sm:w-auto"
        style={brandColor ? { backgroundColor: brandColor } : undefined}
      >
        {action.cta}
      </Link>
    </section>
  );
}

/** Two-column split for tablet/desktop (messages, documents, properties). */
export function PortalSplitView({
  list,
  detail,
  listWidthClass = 'md:w-[40%] lg:w-[36%]',
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  listWidthClass?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
      <div className={`min-w-0 ${listWidthClass}`}>{list}</div>
      <div className="min-w-0 flex-1 md:sticky md:top-6">{detail}</div>
    </div>
  );
}

/** Secondary dashboard cards: single column on phones, multi-column on tablet+. */
export function PortalDashboardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

export type PortalTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

/**
 * Cards on phones; real table from md up (touch-friendly row height, no tiny dense cells).
 */
export function PortalResponsiveTable<T extends { id: string }>({
  rows,
  columns,
  mobileCard,
  empty,
}: {
  rows: T[];
  columns: PortalTableColumn<T>[];
  mobileCard: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  if (!rows.length) {
    return (
      empty ?? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-600">Nothing here yet.</p>
      )
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">{rows.map((row) => <li key={row.id}>{mobileCard(row)}</li>)}</ul>
      <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-base">
          <thead className="border-b border-stone-200 bg-stone-50 text-sm font-semibold text-stone-600">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-stone-100">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 align-middle ${col.className ?? ''}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
