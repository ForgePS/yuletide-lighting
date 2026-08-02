import type { Metadata } from 'next';

/**
 * Legacy magic-token entry layout.
 * Referrer-Policy / Cache-Control / X-Robots-Tag are set in next.config.js for
 * `/portal/:token` and `/portal/:token/:path*` (App Router layouts cannot export headers()).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LegacyPortalTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
