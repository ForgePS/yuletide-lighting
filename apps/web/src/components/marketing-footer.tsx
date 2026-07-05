'use client';

import Link from 'next/link';
import { COMPANY, SERVICE_CITIES } from '@/lib/company';
import { Phone, Mail, MapPin } from 'lucide-react';

const FOOTER_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/sign-in', label: 'CRM login' },
] as const;

export function MarketingFooter({ tagline }: { tagline?: string }) {
  return (
    <footer className="border-t border-white/10 bg-[#0c1222] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl font-bold tracking-tight">{COMPANY.name}</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
              {tagline ?? 'Custom holiday lighting for homes and businesses across Eastern Arkansas. Design, install, takedown, and storage — all handled for you.'}
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <a href={COMPANY.phoneHref} className="flex items-center gap-2 text-white/80 transition-colors hover:text-amber-300">
                <Phone className="h-4 w-4 shrink-0 text-amber-400" />
                {COMPANY.phone}
              </a>
              <a href={COMPANY.emailHref} className="flex items-center gap-2 text-white/80 transition-colors hover:text-amber-300">
                <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                {COMPANY.email}
              </a>
              <p className="flex items-center gap-2 text-white/60">
                <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                Serving {COMPANY.region}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Quick links</p>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Service area</p>
            <ul className="mt-4 columns-2 gap-x-4 text-sm text-white/60">
              {SERVICE_CITIES.map((city) => (
                <li key={city} className="mb-1.5">{city}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {COMPANY.name} All rights reserved.</p>
          <p>Licensed & insured · Professional holiday lighting</p>
        </div>
      </div>
    </footer>
  );
}
