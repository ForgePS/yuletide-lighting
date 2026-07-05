import Link from 'next/link';
import { CRM_MODULES } from '@/lib/crm-marketing';
import { ArrowRight } from 'lucide-react';

export function CrmModulesPreview() {
  const featured = CRM_MODULES.filter((m) =>
    ['pipeline', 'proposals', 'jobs', 'crew', 'sign_tracker', 'invoices'].includes(m.key),
  );

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Everything in one place</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            18+ modules built for install companies
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the first lead to the takedown truck — sales, operations, billing, and growth tools included.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((mod) => {
            const Icon = mod.icon;
            return (
              <div key={mod.key} className="card-hover card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{mod.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mod.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/for-installers/features" className="btn-secondary inline-flex">
            See all features
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
