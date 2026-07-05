import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';
import { MobileCallBar } from '@/components/marketing/mobile-call-bar';
import { SERVICES, PROCESS_STEPS, COMPANY } from '@/lib/company';
import { Building2, Home, PartyPopper, Check } from 'lucide-react';
import Link from 'next/link';
import { CtaSection } from '@/components/marketing/sections/cta-section';

export const metadata: Metadata = {
  title: 'Services — Yuletide Lighting Co.',
  description: 'Residential, commercial, and event Christmas light installation in Eastern Arkansas. Custom design, professional install, takedown, and storage.',
};

const ICONS = { residential: Home, commercial: Building2, events: PartyPopper } as const;

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <MarketingHeader />
      <main>
        <section className="border-b border-border/60 bg-surface/60 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our services</p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Lighting for every occasion
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Whether it&apos;s your family home, a storefront, or a once-in-a-lifetime celebration — we craft displays that dazzle.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl space-y-20 px-6">
            {SERVICES.map((service, idx) => {
              const Icon = ICONS[service.id as keyof typeof ICONS] ?? Home;
              return (
                <div
                  key={service.id}
                  className={`grid items-center gap-10 lg:grid-cols-2 ${idx % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
                >
                  <div className={`card relative overflow-hidden p-10 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5" />
                    <Icon className="relative h-10 w-10 text-primary" />
                    <h2 className="relative mt-6 font-display text-2xl font-bold sm:text-3xl">{service.title}</h2>
                    <p className="relative mt-4 leading-relaxed text-muted-foreground">{service.desc}</p>
                    <ul className="relative mt-6 space-y-3">
                      {service.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-3 text-sm">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1222] via-red-950/80 to-amber-900/40 p-8 ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <div className="holiday-lights absolute inset-0 opacity-50" aria-hidden />
                    <p className="relative text-center font-display text-2xl font-bold text-amber-200/90">{service.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border/60 bg-surface/60 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-center text-3xl font-bold">What&apos;s included</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Free consultation', desc: 'On-site walkthrough and design discussion at no charge.' },
                { title: 'Commercial-grade LEDs', desc: 'Energy-efficient lights in classic and contemporary styles.' },
                { title: 'Safe installation', desc: 'Trained professionals with strict safety protocols.' },
                { title: 'Season maintenance', desc: 'Quick fixes if anything needs attention during the season.' },
                { title: 'Professional takedown', desc: 'Careful removal scheduled at your convenience in January.' },
                { title: 'Off-season storage', desc: 'Organized storage for returning clients — ready next year.' },
              ].map((item) => (
                <div key={item.title} className="card p-6">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-display text-3xl font-bold">Our process</h2>
            <div className="mt-10 space-y-6 text-left">
              {PROCESS_STEPS.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {step.step}
                  </span>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/contact" className="btn-primary mt-10 px-8 py-3">
              Start with a free consultation
            </Link>
          </div>
        </section>

        <CtaSection />
      </main>
      <MarketingFooter />
      <MobileCallBar />
    </div>
  );
}
