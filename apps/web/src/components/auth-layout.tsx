'use client';

import { Logo } from '@/components/logo';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="auth-panel-bg relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16 xl:py-12">
        <Logo
          href="/"
          className="relative z-10"
          imageClassName="h-[88px] w-auto max-w-[280px] object-contain object-left brightness-110"
          priority
        />

        <div className="relative z-10 max-w-lg py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Installer CRM
          </p>
          <h2 className="mt-5 text-[2rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2.35rem]">
            Run installs, crews, and customers from one calm dashboard.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/65">
            Proposals, payments, inventory, and scheduling — built for peak season.
          </p>
        </div>

        <p className="relative z-10 text-sm text-white/50">
          Trusted by{' '}
          <span className="font-semibold text-white/85">holiday</span>
          {' '}light installers nationwide
        </p>
      </div>

      <div className="auth-form-bg flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="auth-panel-bg -mx-6 -mt-6 mb-8 px-6 py-8 sm:-mx-10 sm:-mt-10 sm:px-10">
              <Logo href="/" imageClassName="h-16 w-auto max-w-[220px] object-contain object-left brightness-110" />
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Installer CRM
              </p>
              <p className="mt-3 text-lg font-semibold leading-snug text-white">
                Run installs, crews, and customers from one calm dashboard.
              </p>
            </div>
          </div>

          <div className="card border-border/80 p-8 shadow-soft">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
