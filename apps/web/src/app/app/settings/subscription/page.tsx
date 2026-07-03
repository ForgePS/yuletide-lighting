import { Suspense } from 'react';
import { SubscriptionSettingsPage } from '@/components/settings';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading subscription...</div>}>
      <SubscriptionSettingsPage />
    </Suspense>
  );
}
