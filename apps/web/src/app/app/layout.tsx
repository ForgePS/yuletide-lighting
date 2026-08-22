import { requireAppSession } from '@/lib/auth';
import { AppClientShell } from './app-client-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAppSession({ allowLockedSubscription: true });
  return <AppClientShell>{children}</AppClientShell>;
}
