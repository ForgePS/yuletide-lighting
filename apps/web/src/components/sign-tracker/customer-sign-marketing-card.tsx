'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/sign-tracker-utils';
import { MapPin } from 'lucide-react';

export function CustomerSignMarketingCard({ customerId }: { customerId: string }) {
  const { idToken, loading: authLoading } = useAuth();
  const ready = !authLoading && !!idToken;
  const { data: signs } = trpc.signTracker360.byCustomer.useQuery({ customerId }, { enabled: ready });
  const hasSign = (signs?.length ?? 0) > 0;
  const latest = signs?.[0];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Marketing — Sign Placement</h2>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Sign placed</dt>
          <dd className="font-medium">{hasSign ? 'Yes' : 'No'}</dd>
        </div>
        {latest && (
          <>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Location</dt>
              <dd>{latest.location.address || latest.location.city}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd>{latest.signData.quantityPlaced}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASSES[latest.status]}`}>
                  {STATUS_LABELS[latest.status]}
                </span>
              </dd>
            </div>
            <Link href="/app/marketing/sign-tracker" className="mt-2 inline-block text-sm text-primary hover:underline">
              View in Sign Tracker →
            </Link>
          </>
        )}
      </dl>
    </div>
  );
}
