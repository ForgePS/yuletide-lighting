import { Suspense } from 'react';
import { IntegrationCenterPage } from '@/components/settings';
import { SettingsLoading } from '@/components/settings/settings-widgets';

export default function Page() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <IntegrationCenterPage />
    </Suspense>
  );
}
