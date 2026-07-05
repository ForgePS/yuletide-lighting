'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';
import { AppLayoutShell } from '@/components/app-layout-shell';
import { AnalyticsYearProvider } from '@/lib/analytics-year-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <TRPCProvider>
        <ToastProvider>
          <AnalyticsYearProvider>
            <AppLayoutShell>{children}</AppLayoutShell>
          </AnalyticsYearProvider>
        </ToastProvider>
      </TRPCProvider>
    </FirebaseAuthProvider>
  );
}
