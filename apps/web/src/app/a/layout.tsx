import { TRPCProvider } from '@/lib/trpc';

export default function PublicAgreementLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
