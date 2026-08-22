import { SERVICES } from '@/lib/company';
import { Building2, Home, PartyPopper } from 'lucide-react';
import Link from 'next/link';

const ICONS = { residential: Home, commercial: Building2, events: PartyPopper } as const;

export function ServicesPreviewSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">What we do</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Lighting that turns heads
          </h2>
          <p className="mt-4 text-muted-foreground">
            From cozy cottage glow to grand commercial showcases — every project is custom-designed for your space.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.id as keyof typeof ICONS] ?? Home;
            return (
              <div key={service.id} className="card-hover group relative overflow-hidden p-8">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="relative mt-6 text-xl font-bold">{service.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{service.desc}</p>
                <ul className="relative mt-4 space-y-1.5">
                  {service.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/services" className="btn-secondary px-8 py-3">
            Explore all services
          </Link>
        </div>
      </div>
    </section>
  );
}
