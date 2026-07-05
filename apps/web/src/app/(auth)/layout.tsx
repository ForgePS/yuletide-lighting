'use client';

import { FirebaseAuthProvider } from '@/lib/firebase-auth';

export default function AuthPagesLayout({ children }: { children: React.ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
