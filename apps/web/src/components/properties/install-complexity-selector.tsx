import type { InstallComplexity } from '@clcrm/types';
import { cn } from '@clcrm/ui';
import { INSTALL_COMPLEXITY_OPTIONS } from '@/lib/property-profile-utils';

export function InstallComplexitySelector({
  value,
  onChange,
}: {
  value: InstallComplexity;
  onChange: (value: InstallComplexity) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {INSTALL_COMPLEXITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-xl border p-3 text-left transition-colors',
            value === opt.value
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:bg-muted/40',
          )}
        >
          <p className="text-sm font-semibold">{opt.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
        </button>
      ))}
    </div>
  );
}
