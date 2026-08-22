import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';
import { MobileCallBar } from '@/components/marketing/mobile-call-bar';
import { COMPANY } from '@/lib/company';
import { CtaSection } from '@/components/marketing/sections/cta-section';
import { Heart, Award, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us — Yuletide Lighting Co.',
  description: 'Yuletide Lighting Co. brings professional Christmas light installation to Eastern and Southeast Arkansas. Founded on festive tradition and a commitment to excellence.',
};

const VALUES = [
  { icon: Heart, title: 'Memory makers', desc: 'We\'re more than decorators — we help families and businesses create moments that last.' },
  { icon: Award, title: 'Excellence in every detail', desc: 'Creative design meets safe, reliable installation with commercial-grade equipment.' },
  { icon: Users, title: 'Your neighbors', desc: 'A local team that knows Arkansas — serving communities we live in and love.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden bg-[#0c1222] py-20 text-white sm:py-28">
          <div className="holiday-lights absolute inset-0 opacity-30" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">About us</p>
            <h1 className="font-display mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Turning ordinary spaces into extraordinary holiday experiences
            </h1>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
            <div>
              <p className="leading-relaxed text-muted-foreground">
                At {COMPANY.name}, we specialize in bringing joy, beauty, and brilliance to homes and businesses across {COMPANY.region}. Founded on a love for festive tradition and a commitment to excellence, our team combines creative design with safe, reliable installation.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Whether you&apos;re dreaming of a cozy cottage glow or a grand commercial showcase, we tailor each project to reflect your unique style and seasonal spirit. From consultation to takedown, we handle every detail so you can focus on what matters most — celebrating the season with those you love.
              </p>
            </div>
            <div className="card relative aspect-square overflow-hidden bg-gradient-to-br from-red-950/20 via-background to-amber-100/30 p-10">
              <div className="holiday-lights absolute inset-0 opacity-40" />
              <div className="relative flex h-full flex-col justify-end">
                <p className="font-display text-3xl font-bold">Let&apos;s make this holiday unforgettable.</p>
                <p className="mt-2 text-sm text-muted-foreground">— The Yuletide team</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-surface/60 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-center text-3xl font-bold">What we stand for</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {VALUES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-display text-3xl font-bold">Operating season</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="card p-6 text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Installations</p>
                <p className="mt-2 text-2xl font-bold">October – Mid-December</p>
                <p className="mt-2 text-sm text-muted-foreground">Book early — spots fill fast each season.</p>
              </div>
              <div className="card p-6 text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Takedown</p>
                <p className="mt-2 text-2xl font-bold">January onward</p>
                <p className="mt-2 text-sm text-muted-foreground">Scheduled at your convenience. Storage available.</p>
              </div>
            </div>
          </div>
        </section>

        <CtaSection />
      </main>
      <MarketingFooter />
      <MobileCallBar />
    </div>
  );
}
