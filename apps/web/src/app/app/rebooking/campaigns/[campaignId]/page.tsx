'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@clcrm/ui';
import { RebookingCustomerTable } from '@/components/rebooking';
import { LoadingState } from '@/components/ui/states';

export default function RebookingCampaignPage() {
  const campaignId = useParams().campaignId as string;
  const utils = trpc.useUtils();
  const { data: campaign, isLoading } = trpc.rebooking360.campaigns.getById.useQuery({ campaignId });
  const populate = trpc.rebooking360.campaigns.populate.useMutation({
    onSuccess: () => {
      utils.rebooking360.campaigns.records.invalidate({ campaignId });
      utils.rebooking360.campaigns.getById.invalidate({ campaignId });
    },
  });
  const update = trpc.rebooking360.campaigns.update.useMutation({
    onSuccess: () => utils.rebooking360.campaigns.getById.invalidate({ campaignId }),
  });

  if (isLoading || !campaign) return <LoadingState message="Loading campaign..." />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/rebooking" className="text-sm text-primary hover:underline">← Rebooking</Link>
        <h1 className="mt-2 text-2xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground capitalize">{campaign.status} · {campaign.seasonYear} season</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Projected</p>
          <p className="text-xl font-bold">{formatCurrency(campaign.totalProjectedRevenueCents)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Booked</p>
          <p className="text-xl font-bold">{formatCurrency(campaign.totalBookedRevenueCents)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Targets</p>
          <p className="text-xl font-bold">{campaign.targetCustomerIds.length}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Email template</h2>
        <p className="mt-2 text-sm font-medium">{campaign.emailSubject}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{campaign.emailBody}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary text-sm" disabled={populate.isPending} onClick={() => populate.mutate({ campaignId })}>
          Import prior season customers
        </button>
        {campaign.status === 'draft' && (
          <button type="button" className="btn-primary text-sm" onClick={() => update.mutate({ campaignId, status: 'active' })}>
            Activate campaign
          </button>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold">Customers</h2>
        <RebookingCustomerTable campaignId={campaignId} />
      </div>
    </div>
  );
}
