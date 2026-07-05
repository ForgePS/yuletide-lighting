import Link from 'next/link';
import { COMPANY } from '@/lib/company';
import { ArrowRight } from 'lucide-react';

export function CtaSection({ title, body, button }: { title?: string; body?: string; button?: string }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0c1222] px-8 py-14 text-center text-white sm:px-14 sm:py-20">
          <div className="holiday-lights absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {title ?? "Let's make this holiday unforgettable"}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">
              {body ?? `Schedule your free design consultation today. Spots fill fast — book before ${COMPANY.bookingDeadline}.`}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contact" className="btn-primary bg-red-600 px-8 py-4 text-base hover:bg-red-500">
                {button ?? 'Get your free quote'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={COMPANY.phoneHref} className="text-sm font-semibold text-amber-300 hover:text-amber-200">
                Or call {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
