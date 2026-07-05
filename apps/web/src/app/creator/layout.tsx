'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';
import { CreatorGate, CreatorShell } from '@/components/creator';

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <TRPCProvider>
        <ToastProvider>
          <CreatorGate>
            <CreatorShell>{children}</CreatorShell>
          </CreatorGate>
        </ToastProvider>
      </TRPCProvider>
    </FirebaseAuthProvider>
  );
}
