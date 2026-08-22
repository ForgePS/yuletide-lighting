import Link from 'next/link';
import { CRM_PRODUCT, CRM_STATS } from '@/lib/crm-marketing';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CrmHeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0c1222] text-white">
      <div className="holiday-lights absolute inset-0 opacity-30" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-20">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-sm font-medium text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            For Christmas light companies
          </p>
          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Run your entire install season from{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-amber-200 to-red-300 bg-clip-text text-transparent">
              one CRM
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            {CRM_PRODUCT.tagline} Proposals, crews, inventory, sign tracking, and rebooking — purpose-built for peak season.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className="btn-primary bg-emerald-600 px-8 py-4 text-base shadow-lg shadow-emerald-600/25 hover:bg-emerald-500">
              Start {CRM_PRODUCT.trialDays}-day free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/for-installers/features" className="btn-secondary border-white/20 bg-white/5 px-8 py-4 text-base text-white hover:bg-white/10">
              Explore features
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/50">No credit card required · 10 users included · Cancel anytime</p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {CRM_STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-white/50">{stat.label}</p>
              <p className="font-display mt-1 text-3xl font-bold text-emerald-200">{stat.value}</p>
              <p className="mt-1 text-sm text-white/60">{stat.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
