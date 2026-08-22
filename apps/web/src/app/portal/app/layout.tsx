import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Session-first authenticated portal — not indexable. */
export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
