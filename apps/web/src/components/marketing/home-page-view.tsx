'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase-auth';
import { MarketingHeader } from '@/components/marketing-header';
import { marketingIcon } from '@/lib/marketing-icons';
import type { HomeContent } from '@/lib/marketing-content-types';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HomePageView({ home }: { home: HomeContent }) {
  const { user } = useAuth();

  return (
    <div className="mesh-bg min-h-screen">
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {home.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl sm:leading-[1.1]">
              {home.headlinePrefix}{' '}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {home.headlineAccent}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {home.subheadline}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={user ? '/app' : '/sign-up'} className="btn-primary px-8 py-3 text-base">
                {home.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary px-8 py-3 text-base">
                {home.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-emerald-500/10 blur-2xl" />
            <div className="card relative overflow-hidden shadow-soft">
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {(home.previewStats ?? []).map((stat) => {
                  if (!stat?.label) return null;
                  return (
                    <div key={stat.label} className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-600">{stat.change}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border bg-muted/20 px-6 py-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {(() => {
                    const RouteIcon = marketingIcon('route');
                    return <RouteIcon className="h-4 w-4 text-primary" />;
                  })()}
                  {home.previewRouteText}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight">{home.featuresTitle}</h2>
              <p className="mt-3 text-muted-foreground">{home.featuresSubtitle}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(home.features ?? []).map((feature) => {
                if (!feature?.title) return null;
                const Icon = marketingIcon(feature.icon);
                return (
                  <div
                    key={feature.title}
                    className={`card-hover p-6 ${feature.wide ? 'lg:col-span-2' : ''}`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="card relative overflow-hidden p-10 sm:p-14">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight">{home.ctaTitle}</h2>
                <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{home.ctaBody}</p>
                <Link href={user ? '/app' : '/sign-up'} className="btn-primary mt-8 px-8 py-3 text-base">
                  {home.ctaButton}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Yuletide Lighting. {home.footerText}
      </footer>
    </div>
  );
}
