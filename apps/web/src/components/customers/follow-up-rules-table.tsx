'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState } from '@/components/ui/states';

export function FollowUpRulesTable() {
  const { toast } = useToast();
  const { data, isLoading } = trpc.customer360.followUpRules.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.customer360.followUpRules.update.useMutation({
    onSuccess: () => {
      utils.customer360.followUpRules.list.invalidate();
      toast('Rule updated', 'success');
    },
  });

  if (isLoading) return <LoadingState message="Loading rules..." />;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Automated follow-up rules</h2>
        <p className="text-xs text-muted-foreground">Enable rules and edit templates — automation engine coming soon</p>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Rule</th><th>Trigger</th><th>Delivery</th><th>Status</th><th>Template</th><th>Enabled</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((rule) => (
            <tr key={rule.id}>
              <td className="font-medium">{rule.name}</td>
              <td className="text-muted-foreground">{rule.trigger.replace(/_/g, ' ')}</td>
              <td className="uppercase text-muted-foreground">{rule.deliveryMethod}</td>
              <td className="capitalize">{rule.status}</td>
              <td className="max-w-xs truncate text-muted-foreground">{rule.messageTemplate}</td>
              <td>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => update.mutate({ ruleId: rule.id, data: { enabled: e.target.checked } })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
