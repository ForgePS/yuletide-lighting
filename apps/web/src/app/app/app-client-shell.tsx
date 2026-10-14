'use client';

import { useEffect } from 'react';
import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';
import { AppShell } from '@/components/app-shell';
import { AnalyticsYearProvider } from '@/lib/analytics-year-context';
import { TourProvider } from '@/features/tours';

function clearAuthLoopGuard() {
  try {
    sessionStorage.removeItem('clcrm-auth-redirect-count');
    sessionStorage.removeItem('clcrm-auth-redirect-ts');
  } catch {
    /* ignore */
  }
}

/** Client providers + shell — parent server layout gates the session first. */
export function AppClientShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    clearAuthLoopGuard();
  }, []);

  return (
    <TRPCProvider>
      <ToastProvider>
        <AnalyticsYearProvider>
          <TourProvider>
            <AppShell>{children}</AppShell>
          </TourProvider>
        </AnalyticsYearProvider>
      </ToastProvider>
    </TRPCProvider>
  );
}
