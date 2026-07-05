'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';
import { AppShell } from '@/components/app-shell';
import { AnalyticsYearProvider } from '@/lib/analytics-year-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <TRPCProvider>
        <ToastProvider>
          <AnalyticsYearProvider>
            <AppShell>{children}</AppShell>
          </AnalyticsYearProvider>
        </ToastProvider>
      </TRPCProvider>
    </FirebaseAuthProvider>
  );
}
