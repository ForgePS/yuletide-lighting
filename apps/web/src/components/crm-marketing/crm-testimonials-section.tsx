import { CRM_TESTIMONIALS } from '@/lib/crm-marketing';

export function CrmTestimonialsSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Installer stories</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built with real season experience
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CRM_TESTIMONIALS.map((t) => (
            <blockquote key={t.name} className="card flex flex-col p-6">
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-6 border-t border-border pt-4">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.company}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
