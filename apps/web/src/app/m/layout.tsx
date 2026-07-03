'use client';

import { TRPCProvider } from '@/lib/trpc';

export default function MockupPublicLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
