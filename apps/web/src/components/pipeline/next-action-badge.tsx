import { AlertCircle, Clock } from 'lucide-react';
import { cn } from '@clcrm/ui';

export function NextActionBadge({
  nextAction,
  nextActionDue,
  isOverdue,
  className,
}: {
  nextAction?: string | null;
  nextActionDue?: Date | string | null;
  isOverdue?: boolean;
  className?: string;
}) {
  if (!nextAction && !nextActionDue) return null;

  const dueLabel =
    nextActionDue instanceof Date
      ? nextActionDue.toLocaleDateString()
      : nextActionDue
        ? new Date(nextActionDue).toLocaleDateString()
        : null;

  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md px-2 py-1 text-xs',
        isOverdue ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-800',
        className,
      )}
    >
      {isOverdue ? (
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      ) : (
        <Clock className="mt-0.5 h-3 w-3 shrink-0" />
      )}
      <div className="min-w-0">
        {nextAction && <p className="font-medium leading-snug">{nextAction}</p>}
        {dueLabel && (
          <p className={cn('text-[11px] opacity-80', isOverdue && 'font-semibold')}>
            {isOverdue ? 'Overdue · ' : 'Due '}
            {dueLabel}
          </p>
        )}
      </div>
    </div>
  );
}
