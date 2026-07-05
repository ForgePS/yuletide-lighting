import Link from 'next/link';
import { CRM_NAV, CRM_PRODUCT } from '@/lib/crm-marketing';

export function CrmMarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c1222] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl font-bold tracking-tight">{CRM_PRODUCT.name}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">{CRM_PRODUCT.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/sign-up" className="btn-primary">Start free trial</Link>
              <Link href="/for-installers/contact" className="btn-secondary border-white/20 bg-white/5 text-white hover:bg-white/10">
                Talk to us
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Product</p>
            <ul className="mt-4 space-y-2">
              {CRM_NAV.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Yuletide Lighting Co.</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/" className="transition-colors hover:text-white">Holiday lighting services</Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">Get an install quote</Link>
              </li>
              <li>
                <Link href="/sign-in" className="transition-colors hover:text-white">CRM login</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Yuletide Lighting Co. CRM</p>
          <p>Built for professional Christmas light installers</p>
        </div>
      </div>
    </footer>
  );
}
