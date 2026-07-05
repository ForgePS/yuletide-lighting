import { CRM_MODULES, type CrmModule } from '@/lib/crm-marketing';

const CATEGORIES: CrmModule['category'][] = ['Sales', 'Operations', 'Business', 'Growth'];

export function CrmFeaturesGrid() {
  return (
    <div className="space-y-16">
      {CATEGORIES.map((category) => {
        const modules = CRM_MODULES.filter((m) => m.category === category);
        return (
          <section key={category}>
            <h2 className="font-display text-2xl font-bold tracking-tight">{category}</h2>
            <p className="mt-2 text-muted-foreground">
              {category === 'Sales' && 'Win more jobs with proposals, mockups, and pipeline visibility.'}
              {category === 'Operations' && 'Schedule crews, track time, and run installs without chaos.'}
              {category === 'Business' && 'Invoice, stock inventory, and manage commercial accounts.'}
              {category === 'Growth' && 'Marketing signs, reviews, automation, and year-over-year rebooking.'}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div key={mod.key} className="card p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{mod.label}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                      {mod.highlights.map((h) => (
                        <li key={h} className="text-sm text-muted-foreground">· {h}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
