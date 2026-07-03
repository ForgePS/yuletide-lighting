'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type {
  ProposalApproval,
  ProposalLineItem,
  ProposalPackage,
  ProposalRecord,
  ProposalView,
  Property,
} from '@clcrm/types';
import {
  FINANCING_OPTION_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  labelFinancingOption,
  labelInstallType,
  proposalDepositCents,
} from '@/lib/proposal-utils';
import { EmptyState } from '@/components/ui/states';
import { Mail, MapPin, Phone, User } from 'lucide-react';

type CustomerBasic = {
  id: string;
  firstName?: string;
  lastName?: string;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ProposalFull = ProposalRecord & {
  packages?: ProposalPackage[];
  views?: ProposalView[];
  approvals?: ProposalApproval[];
};

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

export function ProposalFinancialSummary({ data }: { data: ProposalFull }) {
  const deposit = proposalDepositCents(data);
  const balance = Math.max(0, data.subtotalCents - deposit);

  return (
    <section className="card p-5">
      <SectionTitle>Financial summary</SectionTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Project total</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(data.subtotalCents)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Deposit ({data.depositPercent}%)</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(deposit)}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{data.depositStatus}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Balance due</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Payment terms</p>
          <p className="mt-1 text-sm font-semibold">{labelFinancingOption(data.financingOption)}</p>
          {data.validUntil && (
            <p className="mt-1 text-xs text-muted-foreground">Valid until {formatDate(data.validUntil)}</p>
          )}
        </div>
      </div>
      {data.aiSuggestedPriceCents != null && data.aiSuggestedPriceCents > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          AI suggested price: <span className="font-medium text-foreground">{formatCurrency(data.aiSuggestedPriceCents)}</span>
        </p>
      )}
    </section>
  );
}

export function ProposalScheduleTerms({ data }: { data: ProposalFull }) {
  if (!data.installDate && !data.removalDate && !data.termsAndConditions) return null;

  return (
    <section className="card p-5">
      <SectionTitle>Schedule & terms</SectionTitle>
      <dl className="mt-4 space-y-2">
        {data.installDate && <DetailRow label="Target install" value={formatDate(data.installDate)} />}
        {data.removalDate && <DetailRow label="Target removal" value={formatDate(data.removalDate)} />}
      </dl>
      {data.termsAndConditions && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms & conditions</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{data.termsAndConditions}</p>
        </div>
      )}
    </section>
  );
}

export function ProposalCustomerProperty({
  customer,
  property,
  customerId,
}: {
  customer?: CustomerBasic | null;
  property?: Property | null;
  customerId: string;
}) {
  const name = customer?.businessName
    || (customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : '');

  return (
    <section className="card p-5">
      <SectionTitle
        action={(
          <Link href={`/app/customers/${customerId}`} className="text-sm text-primary hover:underline">
            Open customer
          </Link>
        )}
      >
        Customer & property
      </SectionTitle>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            {name || 'Unknown customer'}
          </div>
          {customer?.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Mail className="h-4 w-4" />
              {customer.email}
            </a>
          )}
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Phone className="h-4 w-4" />
              {customer.phone}
            </a>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {property ? (
            <>
              <div className="flex items-start gap-2 font-medium">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p>{property.propertyName ?? property.label ?? 'Property'}</p>
                  <p className="mt-1 text-muted-foreground">
                    {property.addressLine1}
                    {property.addressLine2 ? `, ${property.addressLine2}` : ''}
                    <br />
                    {property.city}, {property.state} {property.postalCode}
                  </p>
                </div>
              </div>
              {property.gateCode && (
                <DetailRow label="Gate / access code" value={property.gateCode} />
              )}
              {property.accessInstructions && (
                <DetailRow label="Access instructions" value={<span className="whitespace-pre-wrap">{property.accessInstructions}</span>} />
              )}
              {property.installNotes && (
                <DetailRow label="Install notes" value={<span className="whitespace-pre-wrap">{property.installNotes}</span>} />
              )}
              {property.hoaInfo && (
                <DetailRow label="HOA" value={property.hoaInfo} />
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No property on file.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function ProposalScopeSection({
  scopeOfWork,
  aiScopeOfWork,
  editHref,
}: {
  scopeOfWork?: string | null;
  aiScopeOfWork?: string | null;
  editHref: string;
}) {
  return (
    <section className="card p-5">
      <SectionTitle
        action={<Link href={editHref} className="text-sm text-primary hover:underline">Edit scope</Link>}
      >
        Scope of work
      </SectionTitle>
      {scopeOfWork ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{scopeOfWork}</p>
      ) : (
        <EmptyState title="No scope defined" description="Add scope of work so the customer knows exactly what is included." />
      )}
      {aiScopeOfWork && aiScopeOfWork !== scopeOfWork && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">AI draft scope</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{aiScopeOfWork}</p>
        </div>
      )}
    </section>
  );
}

function LineItemsTable({ items, emptyLabel }: { items: ProposalLineItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const total = items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Description</th>
            <th className="px-4 py-2.5 font-medium">Category</th>
            <th className="px-4 py-2.5 font-medium text-right">Qty</th>
            <th className="px-4 py-2.5 font-medium text-right">Unit</th>
            <th className="px-4 py-2.5 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5">{item.description}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{item.category ?? '—'}</td>
              <td className="px-4 py-2.5 text-right">{item.quantity}</td>
              <td className="px-4 py-2.5 text-right">{formatCurrency(item.unitPriceCents)}</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.quantity * item.unitPriceCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/20">
            <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Subtotal</td>
            <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function ProposalPricingSection({ data, editHref }: { data: ProposalFull; editHref: string }) {
  const p = data.pricing;
  const hasInputs = p && (
    p.linearFootage > 0 || p.treeWrapCount > 0 || p.garlandLengthFt > 0
    || p.wreathCount > 0 || p.laborHours > 0 || p.materialCostCents > 0
  );

  return (
    <section className="card p-5 space-y-6">
      <SectionTitle
        action={<Link href={editHref} className="text-sm text-primary hover:underline">Edit pricing</Link>}
      >
        Pricing & line items
      </SectionTitle>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposal line items</h3>
        <div className="mt-3">
          <LineItemsTable items={data.lineItems ?? []} emptyLabel="No line items — total is based on package pricing or manual entry." />
        </div>
      </div>

      {hasInputs && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing inputs</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {p.linearFootage > 0 && <DetailRow label="Linear footage" value={`${p.linearFootage} ft`} />}
            {p.treeWrapCount > 0 && <DetailRow label="Tree wraps" value={String(p.treeWrapCount)} />}
            {p.garlandLengthFt > 0 && <DetailRow label="Garland" value={`${p.garlandLengthFt} ft`} />}
            {p.wreathCount > 0 && <DetailRow label="Wreaths" value={String(p.wreathCount)} />}
            {p.specialtyDecorCount > 0 && <DetailRow label="Specialty décor" value={String(p.specialtyDecorCount)} />}
            {p.laborHours > 0 && <DetailRow label="Labor hours" value={`${p.laborHours} hrs`} />}
            {p.materialCostCents > 0 && <DetailRow label="Material cost" value={formatCurrency(p.materialCostCents)} />}
            {p.laborCostCents > 0 && <DetailRow label="Labor cost" value={formatCurrency(p.laborCostCents)} />}
            {p.equipmentChargeCents > 0 && <DetailRow label="Equipment" value={formatCurrency(p.equipmentChargeCents)} />}
            {p.travelChargeCents > 0 && <DetailRow label="Travel" value={formatCurrency(p.travelChargeCents)} />}
          </dl>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <dl className="space-y-2">
          <DetailRow label="Install type" value={labelInstallType(data.installType)} />
          <DetailRow label="Agreement mode" value={data.agreementMode === 'multi' ? 'Multiple options' : 'Single agreement'} />
          {data.selectedAgreementCode && (
            <DetailRow label="Selected agreement" value={data.selectedAgreementCode} />
          )}
        </dl>
      </div>
    </section>
  );
}

export function ProposalPackagesDetail({ packages, selectedPackageId }: { packages: ProposalPackage[]; selectedPackageId?: string | null }) {
  if (packages.length === 0) {
    return (
      <section className="card p-5">
        <SectionTitle>Good / better / best packages</SectionTitle>
        <EmptyState title="No packages" description="Packages are created from pricing inputs in the full editor." />
      </section>
    );
  }

  return (
    <section className="card p-5">
      <SectionTitle>Good / better / best packages</SectionTitle>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {packages.map((pkg) => {
          const selected = pkg.id === selectedPackageId;
          return (
            <div
              key={pkg.id}
              className={`rounded-xl border p-4 ${pkg.isRecommended || selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{pkg.tier}</p>
                  <p className="font-semibold">{pkg.label}</p>
                  {pkg.name !== pkg.label && <p className="text-xs text-muted-foreground">{pkg.name}</p>}
                </div>
                <p className="text-lg font-bold">{formatCurrency(pkg.subtotalCents)}</p>
              </div>
              {(selected || pkg.isRecommended) && (
                <p className="mt-2 text-xs font-medium text-primary">
                  {selected ? 'Customer selected' : 'Recommended'}
                </p>
              )}
              {pkg.description && (
                <p className="mt-3 text-sm text-muted-foreground">{pkg.description}</p>
              )}
              {pkg.laborDescription && (
                <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Labor:</span> {pkg.laborDescription}</p>
              )}
              {pkg.lineItems.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                  {pkg.lineItems.map((li) => (
                    <li key={li.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{li.description}</span>
                      <span>{formatCurrency(li.quantity * li.unitPriceCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {pkg.decorations.length > 0 && (
                <p className="mt-2 text-xs"><span className="font-medium">Décor:</span> {pkg.decorations.join(', ')}</p>
              )}
              {pkg.addOns.length > 0 && (
                <p className="mt-1 text-xs"><span className="font-medium">Add-ons:</span> {pkg.addOns.join(', ')}</p>
              )}
              {pkg.warranty && (
                <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Warranty:</span> {pkg.warranty}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Margin {pkg.grossMarginPercent}% · Profit {formatCurrency(pkg.grossProfitCents)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type TimelineEvent = { at: Date; label: string; detail?: string };

export function ProposalActivityTimeline({ data }: { data: ProposalFull }) {
  const events: TimelineEvent[] = [];

  if (data.createdAt) events.push({ at: new Date(data.createdAt), label: 'Proposal created' });
  if (data.sentAt) events.push({ at: new Date(data.sentAt), label: 'Sent to customer' });
  if (data.openDate) events.push({ at: new Date(data.openDate), label: 'First opened by customer' });
  for (const v of data.views ?? []) {
    events.push({
      at: new Date(v.viewedAt),
      label: 'Customer viewed proposal',
      detail: [v.device, v.durationSeconds ? `${v.durationSeconds}s on page` : null].filter(Boolean).join(' · ') || undefined,
    });
  }
  for (const a of data.approvals ?? []) {
    events.push({
      at: new Date(a.approvedAt),
      label: a.action === 'approved' ? `Approved by ${a.customerName}` : a.action === 'rejected' ? `Declined by ${a.customerName}` : `Changes requested by ${a.customerName}`,
      detail: a.notes ?? undefined,
    });
  }
  if (data.acceptedAt) {
    events.push({
      at: new Date(data.acceptedAt),
      label: 'Accepted',
      detail: data.acceptedByName ? `Signed by ${data.acceptedByName}` : undefined,
    });
  }
  if (data.lastViewedAt) {
    events.push({ at: new Date(data.lastViewedAt), label: 'Last portal view', detail: `${data.viewCount} total views` });
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  const unique = events.filter((e, i, arr) => arr.findIndex((x) => x.label === e.label && Math.abs(x.at.getTime() - e.at.getTime()) < 60000) === i);

  return (
    <section className="card p-5">
      <SectionTitle>Activity</SectionTitle>
      {unique.length === 0 ? (
        <EmptyState title="No activity yet" description="Views, sends, and approvals will appear here." />
      ) : (
        <ol className="mt-4 space-y-0">
          {unique.map((e, i) => (
            <li key={`${e.label}-${e.at.toISOString()}`} className="relative flex gap-4 pb-6 last:pb-0">
              {i < unique.length - 1 && (
                <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden />
              )}
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-surface" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.label}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                {e.detail && <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Follow-up automation: {data.followUpAutomationEnabled ? 'Enabled — Day 1 send, Day 3 reminder, Day 7 follow-up, Day 14 last chance (stops when approved)' : 'Disabled'}
      </div>
    </section>
  );
}

export function ProposalAgreementsSection({ data }: { data: ProposalFull }) {
  if (data.agreementMode !== 'multi' || !data.agreementOptions?.length) return null;
  return (
    <section className="card p-5">
      <SectionTitle>Agreement options</SectionTitle>
      <ul className="mt-4 space-y-2">
        {data.agreementOptions.map((opt) => (
          <li
            key={opt.code}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${opt.code === data.selectedAgreementCode ? 'border-primary bg-primary/5' : 'border-border'} ${!opt.active ? 'opacity-50' : ''}`}
          >
            <span className="font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.code}{!opt.active ? ' · inactive' : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { FINANCING_OPTION_LABELS };
