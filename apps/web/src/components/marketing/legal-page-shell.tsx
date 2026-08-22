import type { ReactNode } from 'react';
import Link from 'next/link';
import { MarketingLegalFooter } from '@/components/marketing/legal-footer';

export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mesh-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 22, 2026</p>
        <div className="prose prose-slate mt-8 max-w-none space-y-4 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </div>
      <MarketingLegalFooter />
    </div>
  );
}
