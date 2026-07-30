'use client';

import { TRPCProvider } from '@/lib/trpc';
import { useEffect } from 'react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const existing = document.querySelector('link[data-portal-manifest]');
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/portal-manifest.webmanifest';
    link.setAttribute('data-portal-manifest', '1');
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  return <TRPCProvider>{children}</TRPCProvider>;
}
