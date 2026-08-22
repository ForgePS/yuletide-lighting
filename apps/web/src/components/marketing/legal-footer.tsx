'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/subscription-terms', label: 'Subscription Terms' },
  { href: '/accessibility', label: 'Accessibility' },
] as const;

export function MarketingLegalFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} Yuletide Lighting{note ? `. ${note}` : ''}</p>
      <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Legal">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
