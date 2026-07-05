import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CrmPromoStrip() {
  return (
    <section className="border-b border-border bg-muted/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">For lighting companies</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Run your install business on Yuletide CRM
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Proposals, crews, inventory, sign tracking, and rebooking — built for Christmas light installers nationwide.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/for-installers" className="btn-secondary">
            Learn more
          </Link>
          <Link href="/sign-up" className="btn-primary">
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
