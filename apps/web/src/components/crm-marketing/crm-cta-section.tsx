import Link from 'next/link';
import { CRM_PRODUCT } from '@/lib/crm-marketing';
import { ArrowRight } from 'lucide-react';

export function CrmCtaSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0c1222] px-8 py-14 text-center text-white sm:px-14 sm:py-20">
          <div className="holiday-lights absolute inset-0 opacity-25" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Ready before peak season hits?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">
              Start your {CRM_PRODUCT.trialDays}-day trial today. Set up proposals, crews, and your first jobs in an afternoon.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up" className="btn-primary bg-emerald-600 px-8 py-4 text-base hover:bg-emerald-500">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/for-installers/contact" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                Book a walkthrough
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
