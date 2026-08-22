'use client';

import Link from 'next/link';
import { COMPANY } from '@/lib/company';
import { Phone } from 'lucide-react';

export function MobileCallBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur-lg safe-bottom sm:hidden">
      <div className="flex gap-2">
        <a href={COMPANY.phoneHref} className="btn-primary flex-1 py-3">
          <Phone className="h-4 w-4" />
          Call now
        </a>
        <Link href="/contact" className="btn-secondary flex-1 py-3">
          Free quote
        </Link>
      </div>
    </div>
  );
}
