import { PROCESS_STEPS } from '@/lib/company';

export function ProcessSection() {
  return (
    <section className="border-y border-border/60 bg-surface/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Stress-free from start to finish
          </h2>
          <p className="mt-4 text-muted-foreground">
            We handle every detail — you focus on celebrating with the people you love.
          </p>
        </div>

        <div className="mt-14 space-y-0">
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.step} className="relative flex gap-6 pb-12 last:pb-0 sm:gap-10">
              {i < PROCESS_STEPS.length - 1 && (
                <div className="absolute left-5 top-14 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-primary/40 to-transparent sm:block" />
              )}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/25">
                {step.step}
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
