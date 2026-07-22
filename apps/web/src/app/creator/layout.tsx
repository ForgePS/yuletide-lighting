import { redirect } from 'next/navigation';
import { requireAppSession } from '@/lib/auth';
import { CreatorClientShell } from './creator-client-shell';

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppSession({ allowLockedSubscription: true });
  if (!ctx.isPlatformCreator) {
    redirect('/access-denied?reason=forbidden');
  }
  return <CreatorClientShell>{children}</CreatorClientShell>;
}
