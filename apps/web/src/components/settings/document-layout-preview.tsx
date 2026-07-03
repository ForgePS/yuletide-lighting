'use client';

import type { DocumentLayoutStyle, InvoiceLayoutSettings, ProposalLayoutSettings } from '@clcrm/types';
import { AuthenticatedImage } from '@/components/authenticated-image';

type BrandingPreview = {
  primaryLogoUrl?: string | null;
  proposalLogoUrl?: string | null;
  invoiceLogoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const shell: Record<DocumentLayoutStyle, string> = {
  classic: 'border-2 border-slate-300 bg-white font-serif',
  modern: 'rounded-2xl border border-slate-200 bg-white shadow-md',
  compact: 'border border-slate-200 bg-white text-xs leading-relaxed',
};

const pad: Record<DocumentLayoutStyle, string> = {
  classic: 'p-8',
  modern: 'p-6',
  compact: 'p-4',
};

function resolveLogo(branding: BrandingPreview | undefined, kind: 'proposal' | 'invoice') {
  if (!branding) return null;
  return kind === 'proposal'
    ? branding.proposalLogoUrl || branding.primaryLogoUrl
    : branding.invoiceLogoUrl || branding.primaryLogoUrl;
}

export function ProposalLayoutPreview({
  companyName,
  branding,
  layout,
}: {
  companyName: string;
  branding?: BrandingPreview;
  layout: ProposalLayoutSettings;
}) {
  const primary = branding?.primaryColor ?? '#DC2626';
  const secondary = branding?.secondaryColor ?? '#1E40AF';
  const logo = layout.showLogo ? resolveLogo(branding, 'proposal') : null;

  return (
    <div className={`${shell[layout.style]} ${pad[layout.style]} mx-auto max-w-lg`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        {logo ? (
          <AuthenticatedImage
            value={logo}
            alt="Logo"
            className="h-10 max-w-[140px] object-contain"
            fallback={<div className="h-10 w-24 rounded bg-slate-100" />}
          />
        ) : (
          <div className="h-10 w-24 rounded bg-slate-100" />
        )}
        {layout.showCompanyInfo && (
          <div className="text-right text-xs text-slate-600">
            <p className="font-semibold" style={{ color: primary }}>{companyName}</p>
            <p>123 Main Street</p>
            <p>(555) 123-4567</p>
          </div>
        )}
      </div>

      <h2 className="mb-4 text-lg font-bold" style={{ color: primary }}>{layout.headerTitle}</h2>

      <div className="mb-4 rounded border border-slate-200 p-3 text-sm">
        <p className="font-medium">Sample Customer</p>
        <p className="text-slate-600">456 Oak Ave · Springfield</p>
      </div>

      {layout.showLineItemPhotos && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex h-16 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500">Property photo</div>
          <div className="flex h-16 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500">Design mockup</div>
        </div>
      )}

      {layout.showPackageComparison && (
        <div className={`mb-4 grid gap-2 ${layout.style === 'compact' ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {['Good', 'Better', 'Best'].map((tier, i) => (
            <div
              key={tier}
              className="rounded border p-2"
              style={i === 1 ? { borderColor: secondary, backgroundColor: `${secondary}10` } : undefined}
            >
              <p className="font-semibold">{tier}</p>
              <p className="mt-1 text-sm font-bold" style={{ color: primary }}>${(1200 + i * 400).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
        {layout.footerText || 'Footer text appears here.'}
      </div>
    </div>
  );
}

export function InvoiceLayoutPreview({
  companyName,
  branding,
  layout,
}: {
  companyName: string;
  branding?: BrandingPreview;
  layout: InvoiceLayoutSettings;
}) {
  const primary = branding?.primaryColor ?? '#DC2626';
  const accent = branding?.accentColor ?? '#059669';
  const logo = layout.showLogo ? resolveLogo(branding, 'invoice') : null;
  const subtotal = 2400;
  const tax = layout.showTaxBreakdown ? Math.round(subtotal * 0.08) : 0;

  return (
    <div className={`${shell[layout.style]} ${pad[layout.style]} mx-auto max-w-lg`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        {logo ? (
          <AuthenticatedImage
            value={logo}
            alt="Logo"
            className="h-10 max-w-[140px] object-contain"
            fallback={<div className="h-10 w-24 rounded bg-slate-100" />}
          />
        ) : (
          <div className="h-10 w-24 rounded bg-slate-100" />
        )}
        {layout.showCompanyInfo && (
          <div className="text-right text-xs text-slate-600">
            <p className="font-semibold" style={{ color: primary }}>{companyName}</p>
            <p>Invoice #INV-2026-0042</p>
            <p>Due: Net 30</p>
          </div>
        )}
      </div>

      <h2 className="mb-4 text-lg font-bold" style={{ color: primary }}>{layout.headerTitle}</h2>

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-1">Description</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-2">Holiday lighting installation</td>
            <td className="py-2 text-right">${subtotal.toLocaleString()}</td>
          </tr>
          {layout.showTaxBreakdown && (
            <tr>
              <td className="py-2 text-slate-600">Tax (8%)</td>
              <td className="py-2 text-right text-slate-600">${tax.toLocaleString()}</td>
            </tr>
          )}
          <tr>
            <td className="py-2 font-bold">Total due</td>
            <td className="py-2 text-right font-bold" style={{ color: accent }}>${(subtotal + tax).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {layout.paymentInstructions && (
        <p className="mb-3 rounded bg-slate-50 p-2 text-xs text-slate-700">{layout.paymentInstructions}</p>
      )}

      <div className="border-t border-slate-200 pt-3 text-xs text-slate-600">
        {layout.footerText || 'Footer text appears here.'}
      </div>
    </div>
  );
}
