'use client';

import Link from 'next/link';
import { COMPANY } from '@/lib/company';
import type { HomeContent } from '@/lib/marketing-content-types';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection({ home }: { home: HomeContent }) {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#0c1222] text-white">
      <div className="holiday-lights absolute inset-0 opacity-40" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1222]/30 via-transparent to-[#0c1222]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.15)_0%,_transparent_60%)]" />

      <div className="relative mx-auto flex min-h-[90vh] max-w-6xl flex-col justify-center px-6 pb-24 pt-12">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            {home.eyebrow}
          </p>
          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            {home.headlinePrefix}{' '}
            <span className="bg-gradient-to-r from-red-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
              {home.headlineAccent}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            {home.subheadline}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="btn-primary bg-red-600 px-8 py-4 text-base shadow-lg shadow-red-600/30 hover:bg-red-500">
              {home.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={COMPANY.phoneHref} className="btn-secondary border-white/20 bg-white/5 px-8 py-4 text-base text-white hover:bg-white/10">
              {home.secondaryCta}
            </a>
          </div>
          <p className="mt-6 text-sm text-amber-200/80">
            Book your {COMPANY.seasonYear} install before {COMPANY.bookingDeadline} · {COMPANY.phone}
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {(home.previewStats ?? []).map((stat) => {
            if (!stat?.label) return null;
            return (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-white/50">{stat.label}</p>
                <p className="font-display mt-1 text-3xl font-bold text-amber-200">{stat.value}</p>
                <p className="mt-1 text-sm text-white/60">{stat.change}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
