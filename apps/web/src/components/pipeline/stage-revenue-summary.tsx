import { formatCurrency } from '@clcrm/ui';
import { AlertCircle, DollarSign, Users } from 'lucide-react';

export function StageRevenueSummary({
  count,
  revenueCents,
  overdueCount,
}: {
  count: number;
  revenueCents: number;
  overdueCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="card flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">In pipeline</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
      <div className="card flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <DollarSign className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Pipeline value</p>
          <p className="text-2xl font-bold">{formatCurrency(revenueCents)}</p>
        </div>
      </div>
      <div className="card flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
          <AlertCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Overdue follow-ups</p>
          <p className="text-2xl font-bold">{overdueCount}</p>
        </div>
      </div>
    </div>
  );
}
