'use client';

import { useState } from 'react';
import { cn } from '@clcrm/ui';
import { CRM_FAQ } from '@/lib/crm-marketing';
import { ChevronDown } from 'lucide-react';

export function CrmFaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-border bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight">Common questions</h2>
        </div>

        <div className="mt-10 space-y-3">
          {CRM_FAQ.map((item, i) => {
            const expanded = open === i;
            return (
              <div key={item.q} className="card overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpen(expanded ? null : i)}
                  aria-expanded={expanded}
                >
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                </button>
                {expanded && (
                  <div className="border-t border-border px-5 pb-5 pt-0">
                    <p className="pt-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
