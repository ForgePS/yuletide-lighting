'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';
import { TRPCProvider } from '@/lib/trpc';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </FirebaseAuthProvider>
  );
}
