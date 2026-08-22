'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '@/lib/company';
import { ChevronDown } from 'lucide-react';
import { cn } from '@clcrm/ui';

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-border/60 bg-surface/60 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight">Common questions</h2>
        </div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-surface">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold">{item.q}</span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
