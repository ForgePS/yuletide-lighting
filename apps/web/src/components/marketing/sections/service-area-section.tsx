import { SERVICE_CITIES, COMPANY } from '@/lib/company';
import { MapPin } from 'lucide-react';

export function ServiceAreaSection() {
  return (
    <section id="service-area" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Where we work</p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Brightening {COMPANY.region}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Proudly serving homes, businesses, and community spaces across Eastern and Southeast Arkansas.
              Not sure if we cover your area? Reach out — we&apos;re always expanding.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Installations begin in October</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Takedown services start in January, scheduled at your convenience. Off-season storage available for returning clients.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cities we serve</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SERVICE_CITIES.map((city) => (
                <div
                  key={city}
                  className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {city}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              + surrounding communities
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
