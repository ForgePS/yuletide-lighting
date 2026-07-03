'use client';

import { TRPCProvider } from '@/lib/trpc';

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
