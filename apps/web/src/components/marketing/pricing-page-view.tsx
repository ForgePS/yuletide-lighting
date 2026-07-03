'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import type { PricingContent } from '@/lib/marketing-content-types';

export function PricingPageView({ pricing }: { pricing: PricingContent }) {
  return (
    <div className="mesh-bg min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{pricing.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{pricing.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {(pricing.plans ?? []).map((plan) => {
            if (!plan?.name) return null;
            return (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? 'card relative overflow-hidden border-primary/30 p-8 shadow-glow'
                    : 'card p-8'
                }
              >
                {plan.badge ? (
                  <span className="absolute right-6 top-6 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {plan.badge}
                  </span>
                ) : null}
                <h2
                  className={
                    plan.highlight ? 'text-lg font-semibold text-primary' : 'text-lg text-muted-foreground'
                  }
                >
                  {plan.name}
                </h2>
                <p className="mt-3 text-5xl font-bold tracking-tight">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.period}</p>
                <ul className="mt-8 space-y-3">
                  {(plan.features ?? []).map((feature) =>
                    feature ? (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ) : null,
                  )}
                </ul>
                <Link
                  href="/sign-up"
                  className={plan.highlight ? 'btn-primary mt-8 w-full py-3' : 'btn-secondary mt-8 w-full py-3'}
                >
                  Start free trial
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
