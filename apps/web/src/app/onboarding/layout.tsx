import { requireAppSession } from '@/lib/auth';
import { TRPCProvider } from '@/lib/trpc';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireAppSession({ allowLockedSubscription: true });
  return <TRPCProvider>{children}</TRPCProvider>;
}
