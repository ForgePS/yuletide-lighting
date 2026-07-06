'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/lib/toast';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <TRPCProvider>
        <ToastProvider>{children}</ToastProvider>
      </TRPCProvider>
    </FirebaseAuthProvider>
  );
}
