import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';
import { AppShell } from '@/components/app-shell';
import { AnalyticsYearProvider } from '@/lib/analytics-year-context';

/** Client providers + shell — parent server layout gates the session first. */
export function AppClientShell({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <ToastProvider>
        <AnalyticsYearProvider>
          <AppShell>{children}</AppShell>
        </AnalyticsYearProvider>
      </ToastProvider>
    </TRPCProvider>
  );
}
