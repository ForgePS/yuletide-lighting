'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';

/**
 * Tenant follow-up rule configuration.
 * Delivery actions are limited to template + enable toggles until automation delivery is operational.
 */
export function FollowUpRulesTable() {
  const { toast } = useToast();
  const { data, isLoading } = trpc.customer360.followUpRules.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.customer360.followUpRules.update.useMutation({
    onSuccess: () => {
      utils.customer360.followUpRules.list.invalidate();
      toast('Rule updated', 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState message="Loading rules..." />;
  if (!data?.length) {
    return (
      <EmptyState
        title="No follow-up rules"
        description="Default rules will be created the first time this organization opens follow-ups."
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Automated follow-up rules</h2>
        <p className="text-xs text-muted-foreground">
          Enable rules and edit message templates. Email/SMS delivery runs only when Resend/Twilio are configured;
          task creation is not simulated.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Trigger</th>
              <th>Delivery</th>
              <th>Status</th>
              <th>Template</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {data.map((rule) => (
              <tr key={rule.id}>
                <td className="font-medium">{rule.name}</td>
                <td className="text-muted-foreground">{rule.trigger.replace(/_/g, ' ')}</td>
                <td className="uppercase text-muted-foreground">{rule.deliveryMethod}</td>
                <td className="capitalize">{rule.status}</td>
                <td className="min-w-[16rem]">
                  <textarea
                    className="input min-h-[4rem] w-full text-sm"
                    defaultValue={rule.messageTemplate}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next !== rule.messageTemplate) {
                        update.mutate({ ruleId: rule.id, data: { messageTemplate: next } });
                      }
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    aria-label={`Enable ${rule.name}`}
                    onChange={(e) => update.mutate({ ruleId: rule.id, data: { enabled: e.target.checked } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
