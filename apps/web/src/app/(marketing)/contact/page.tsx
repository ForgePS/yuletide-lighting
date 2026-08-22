import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';
import { MobileCallBar } from '@/components/marketing/mobile-call-bar';
import { ContactForm } from '@/components/marketing/contact-form';
import { COMPANY, SERVICE_CITIES } from '@/lib/company';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — Get a Free Quote',
  description: `Contact Yuletide Lighting Co. for a free Christmas light installation consultation. Call ${COMPANY.phone} or email ${COMPANY.email}.`,
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <MarketingHeader />
      <main>
        <section className="border-b border-border/60 bg-surface/60 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Contact</p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Let&apos;s plan your display
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Ready to transform your property? Reach out for a free design consultation. We respond within one business day.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-2">
              <div className="card p-6">
                <Phone className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Phone</p>
                <a href={COMPANY.phoneHref} className="mt-1 block text-lg font-bold text-primary hover:underline">
                  {COMPANY.phone}
                </a>
                <p className="mt-2 text-sm text-muted-foreground">Fastest way to secure your install date</p>
              </div>
              <div className="card p-6">
                <Mail className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Email</p>
                <a href={COMPANY.emailHref} className="mt-1 block text-primary hover:underline">
                  {COMPANY.email}
                </a>
              </div>
              <div className="card p-6">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Service area</p>
                <p className="mt-1 text-sm text-muted-foreground">{COMPANY.region}</p>
                <p className="mt-3 text-xs text-muted-foreground">{SERVICE_CITIES.join(' · ')}</p>
              </div>
              <div className="card p-6">
                <Clock className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Book by</p>
                <p className="mt-1 font-bold text-primary">{COMPANY.bookingDeadline}, {COMPANY.seasonYear}</p>
                <p className="mt-2 text-sm text-muted-foreground">For {COMPANY.seasonYear} season installations</p>
              </div>
            </div>

            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
      <MobileCallBar />
    </div>
  );
}
